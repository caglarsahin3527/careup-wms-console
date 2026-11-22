'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Search,
  ArrowRight,
  Barcode,
  XCircle,
  QrCode,
  AlertCircle,
  RefreshCw,
  Flashlight,
  ZoomIn,
} from 'lucide-react';
import { Product } from '../data/mockData';

interface BarcodeScannerCardProps {
  products: Product[];
  selectedProduct: Product | null;
  onSelectProduct: (product: Product) => void;
  onUnmatchedBarcode?: (barcode: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Camera helpers                                                     */
/* ------------------------------------------------------------------ */

type ExtendedCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  zoom?: { min: number; max: number; step?: number };
  torch?: boolean;
  pointsOfInterest?: unknown;
};

// Fraction of the visible preview used as the scan window (must match the overlay below)
const SCAN_BOX = { x: 0.06, y: 0.25, w: 0.88, h: 0.5 };
// Upper bound for the decode canvas width; keeps ZXing fast on phones while
// preserving enough pixels per bar for 1D barcodes.
const MAX_DECODE_WIDTH = 1280;

const BACK_CAMERA_RE = /back|rear|environment|arka|facing back/i;

/**
 * Phones with several rear lenses expose each one separately. `facingMode:
 * environment` frequently lands on the ultra-wide / telephoto lens, which
 * cannot focus at barcode distance -> blurry image. Score lenses so the main
 * wide-angle camera (best close focus) wins.
 */
function scoreBackCamera(label: string): number {
  const l = label.toLowerCase();
  if (!BACK_CAMERA_RE.test(l)) return -1;
  if (/ultra|tele|depth|macro|infrared|\bir\b|0[.,]5/.test(l)) return 0;
  if (/^back camera$|^arka kamera$/.test(l.trim())) return 100; // iOS main lens
  if (/camera2 0\b|camera 0\b/.test(l)) return 90; // Android main lens
  if (/dual|triple/.test(l)) return 30; // iOS virtual multi-lens devices
  return 50;
}

function buildVideoConstraints(
  source: { facingMode: 'environment' | 'user' } | { deviceId: string }
): MediaTrackConstraints {
  const base: MediaTrackConstraints =
    'deviceId' in source
      ? { deviceId: { exact: source.deviceId } }
      : { facingMode: { ideal: source.facingMode } };
  return {
    ...base,
    // Ask for Full HD; no `min` so low-end cameras still start instead of failing.
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
    advanced: [{ focusMode: 'continuous' } as any],
  };
}

async function openStream(
  source: { facingMode: 'environment' | 'user' } | { deviceId: string }
): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: buildVideoConstraints(source),
    });
  } catch (err: any) {
    if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') throw err;
    // Fallback with minimal constraints
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video:
        'deviceId' in source
          ? { deviceId: { exact: source.deviceId } }
          : { facingMode: source.facingMode },
    });
  }
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

/* ------------------------------------------------------------------ */

export const BarcodeScannerCard: React.FC<BarcodeScannerCardProps> = ({
  products,
  selectedProduct,
  onSelectProduct,
  onUnmatchedBarcode,
}) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number } | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isHandlingScanRef = useRef(false);

  // Refs to keep latest callbacks & products accessible inside scanner callback without restarting camera
  const productsRef = useRef<Product[]>(products);
  const onSelectProductRef = useRef(onSelectProduct);
  const onUnmatchedBarcodeRef = useRef(onUnmatchedBarcode);

  useEffect(() => {
    productsRef.current = products;
    onSelectProductRef.current = onSelectProduct;
    onUnmatchedBarcodeRef.current = onUnmatchedBarcode;
  }, [products, onSelectProduct, onUnmatchedBarcode]);

  const getTrack = () => streamRef.current?.getVideoTracks()[0] ?? null;

  /**
   * applyConstraints() REPLACES the whole constraint set. Calling it with only
   * `{ advanced: [...] }` (as the previous implementation did) silently drops the
   * resolution request and the camera falls back to 640x480 -> blurry preview.
   * Always merge with the current constraints.
   */
  const applyAdvanced = useCallback(async (advanced: Record<string, unknown>) => {
    const track = getTrack();
    if (!track) return;
    const current = track.getConstraints();
    const prevAdvanced = (current.advanced?.[0] as Record<string, unknown>) || {};
    try {
      await track.applyConstraints({
        ...current,
        advanced: [{ ...prevAdvanced, ...advanced } as any],
      });
    } catch {}
  }, []);

  const handleDecodedBarcode = useCallback((rawCode: string) => {
    if (isHandlingScanRef.current) return;
    const cleaned = rawCode.trim();
    if (!cleaned) return;

    isHandlingScanRef.current = true;
    if (navigator.vibrate) navigator.vibrate(80);
    setSearchInput(cleaned);
    setIsCameraOpen(false);

    const query = cleaned.toLowerCase();
    const found = productsRef.current.find(
      (p) =>
        p.barcode.toLowerCase() === query ||
        p.sku.toLowerCase() === query ||
        p.name.toLowerCase().includes(query)
    );

    if (found) {
      onSelectProductRef.current(found);
    } else if (onUnmatchedBarcodeRef.current) {
      onUnmatchedBarcodeRef.current(cleaned);
    }
  }, []);

  useEffect(() => {
    if (!isCameraOpen) return;

    let isCancelled = false;
    let loopTimer: ReturnType<typeof setTimeout> | null = null;

    async function initCamera() {
      setIsStartingCamera(true);
      setCameraError(null);
      setTorchSupported(false);
      setTorchOn(false);
      setZoomRange(null);
      setZoom(null);
      isHandlingScanRef.current = false;

      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('NO_MEDIA_DEVICES');

        const [{ Html5QrcodeSupportedFormats }, { Html5QrcodeShim }] = await Promise.all([
          import('html5-qrcode'),
          import('html5-qrcode/esm/code-decoder'),
        ]);
        if (isCancelled) return;

        const formats = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ];
        const noop = () => {};
        // Native BarcodeDetector when available, ZXing otherwise
        const decoder = new Html5QrcodeShim(formats, true, false, {
          log: noop,
          warn: noop,
          logError: noop,
          logErrors: noop,
        });

        // 1) Open camera by facing mode (also unlocks device labels)
        let stream = await openStream({ facingMode });
        if (isCancelled) return stopStream(stream);

        // 2) On multi-lens phones, switch to the main lens if we landed on another one
        if (facingMode === 'environment') {
          try {
            const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
              (d) => d.kind === 'videoinput'
            );
            const ranked = devices
              .map((d) => ({ d, score: scoreBackCamera(d.label) }))
              .filter((x) => x.score >= 0)
              .sort((a, b) => b.score - a.score);
            const best = ranked[0]?.d;
            const currentId = stream.getVideoTracks()[0]?.getSettings().deviceId;
            const currentScore = scoreBackCamera(stream.getVideoTracks()[0]?.label || '');
            if (
              best &&
              best.deviceId &&
              best.deviceId !== currentId &&
              ranked[0].score > currentScore
            ) {
              stopStream(stream);
              try {
                stream = await openStream({ deviceId: best.deviceId });
              } catch {
                stream = await openStream({ facingMode });
              }
              if (isCancelled) return stopStream(stream);
            }
          } catch {}
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) throw new Error('NO_VIDEO_ELEMENT');
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.muted = true;
        await video.play().catch(() => {});
        if (isCancelled) return;

        // 3) Tune focus / zoom / torch based on hardware capabilities
        const track = stream.getVideoTracks()[0];
        const caps = ((track.getCapabilities?.() || {}) as ExtendedCapabilities);
        const advanced: Record<string, unknown> = {};
        if (caps.focusMode?.includes('continuous')) advanced.focusMode = 'continuous';
        if (caps.zoom && caps.zoom.max > caps.zoom.min) {
          // A mild zoom makes users hold the phone further away, i.e. beyond the
          // lens' minimum focus distance -> sharp image instead of a blurry close-up.
          const initialZoom = Math.min(Math.max(1.5, caps.zoom.min), caps.zoom.max);
          advanced.zoom = initialZoom;
          setZoomRange({ min: caps.zoom.min, max: caps.zoom.max });
          setZoom(initialZoom);
        }
        if (caps.torch) setTorchSupported(true);
        if (Object.keys(advanced).length) await applyAdvanced(advanced);

        if (!isCancelled) setIsStartingCamera(false);

        // 4) Decode loop on FULL-resolution pixels of the scan window.
        // (html5-qrcode's built-in loop down-samples the frame to the on-screen
        // CSS size of the qrbox, which smears thin barcode lines on phones.)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        let frame = 0;

        const scanFrame = async () => {
          if (isCancelled || isHandlingScanRef.current) return;
          const v = videoRef.current;
          if (ctx && v && v.readyState >= 2 && v.videoWidth && v.clientWidth) {
            const vw = v.videoWidth;
            const vh = v.videoHeight;
            const cw = v.clientWidth;
            const ch = v.clientHeight;
            // Visible region of the native frame under object-fit: cover
            const s = Math.max(cw / vw, ch / vh);
            const visW = cw / s;
            const visH = ch / s;
            const x0 = (vw - visW) / 2;
            const y0 = (vh - visH) / 2;

            // Alternate between the scan window and the whole visible frame
            const useWindow = frame++ % 3 !== 2;
            const sx = useWindow ? x0 + visW * SCAN_BOX.x : x0;
            const sy = useWindow ? y0 + visH * SCAN_BOX.y : y0;
            const sw = useWindow ? visW * SCAN_BOX.w : visW;
            const sh = useWindow ? visH * SCAN_BOX.h : visH;
            const k = Math.min(1, MAX_DECODE_WIDTH / sw);

            canvas.width = Math.round(sw * k);
            canvas.height = Math.round(sh * k);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(v, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

            try {
              const result = await decoder.decodeAsync(canvas);
              if (!isCancelled && result?.text) {
                handleDecodedBarcode(result.text);
                return;
              }
            } catch {
              // nothing found in this frame
            }
          }
          if (!isCancelled) loopTimer = setTimeout(scanFrame, 60);
        };
        scanFrame();
      } catch (err: any) {
        if (isCancelled) return;
        stopStream(streamRef.current);
        streamRef.current = null;
        setIsStartingCamera(false);
        const name = String(err?.name || '');
        const msg = String(err?.message || err || '');
        if (name === 'NotAllowedError' || name === 'SecurityError' || /permission/i.test(msg)) {
          setCameraError(
            'Kamera erişim izni reddedildi. Lütfen tarayıcı adres çubuğundan kamera iznini aktif hale getirin.'
          );
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          setCameraError('Cihazınızda kullanılabilir bir kamera bulunamadı.');
        } else if (name === 'NotReadableError') {
          setCameraError('Kamera başka bir uygulama tarafından kullanılıyor. Diğer uygulamaları kapatıp tekrar deneyin.');
        } else {
          setCameraError(
            'Kamera başlatılamadı. Tarayıcınızın kamera iznine sahip olduğundan ve güvenli bağlantı (HTTPS/localhost) kullandığınızdan emin olun.'
          );
        }
      }
    }

    initCamera();

    return () => {
      isCancelled = true;
      if (loopTimer) clearTimeout(loopTimer);
      stopStream(streamRef.current);
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [isCameraOpen, facingMode, handleDecodedBarcode, applyAdvanced]);

  // Tap on preview -> trigger a refocus cycle where supported
  const handleTapToFocus = async () => {
    const track = getTrack();
    if (!track) return;
    const caps = ((track.getCapabilities?.() || {}) as ExtendedCapabilities);
    if (caps.focusMode?.includes('single-shot')) {
      await applyAdvanced({ focusMode: 'single-shot' });
      if (caps.focusMode.includes('continuous')) {
        setTimeout(() => applyAdvanced({ focusMode: 'continuous' }), 600);
      }
    } else if (caps.focusMode?.includes('continuous')) {
      await applyAdvanced({ focusMode: 'continuous' });
    }
  };

  const toggleTorch = async () => {
    const next = !torchOn;
    await applyAdvanced({ torch: next });
    setTorchOn(next);
  };

  const cycleZoom = async () => {
    if (!zoomRange || zoom === null) return;
    const steps = [1, 1.5, 2, 3]
      .map((z) => Math.min(Math.max(z, zoomRange.min), zoomRange.max))
      .filter((z, i, arr) => arr.indexOf(z) === i);
    const idx = steps.findIndex((z) => Math.abs(z - zoom) < 0.01);
    const next = steps[(idx + 1) % steps.length];
    await applyAdvanced({ zoom: next });
    setZoom(next);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim().toLowerCase();
    if (!query) return;

    const found = products.find(
      (p) =>
        p.barcode.toLowerCase() === query ||
        p.sku.toLowerCase() === query ||
        p.name.toLowerCase().includes(query)
    );

    if (found) {
      onSelectProduct(found);
    } else if (onUnmatchedBarcode) {
      onUnmatchedBarcode(searchInput.trim());
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Optical Scanner & Camera Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5 sm:space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Barkod &amp; Katalog Okuyucu</h3>
              <p className="text-[11px] text-slate-500">
                Kamera ile okutun veya EAN-13 / SKU girin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isCameraOpen && (
              <button
                type="button"
                onClick={() =>
                  setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                }
                title="Kamera Değiştir (Ön / Arka)"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Çevir</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCameraOpen(!isCameraOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                isCameraOpen
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                  : 'bg-teal-700 hover:bg-teal-800 text-white border-teal-700'
              }`}
            >
              {isCameraOpen ? (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Kapat</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>Kamera Aç</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Camera Viewfinder Area */}
        <div
          className={`relative w-full rounded-xl overflow-hidden ${
            !isCameraOpen
              ? 'aspect-[16/10] sm:aspect-[4/3] bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center'
              : 'aspect-[4/3] min-h-[240px] bg-slate-950 border border-slate-800'
          }`}
        >
          {!isCameraOpen ? (
            <div className="flex flex-col items-center justify-center p-4 sm:p-6 text-center">
              <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-2 sm:mb-3 text-teal-700 shadow-2xs">
                <Camera className="w-6 sm:w-7 h-6 sm:h-7" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-800 mb-1">
                Optik Barkod Tarayıcı Hazır
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-500 max-w-[240px] mb-3 sm:mb-4 leading-relaxed">
                Kutu üzerindeki barkodu kamera ile taramak için başlatın veya aşağıdaki listeden ürün seçin.
              </p>
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>Tarayıcıyı Başlat</span>
              </button>
            </div>
          ) : (
            <div className="absolute inset-0 bg-slate-950 overflow-hidden">
              {/* Native-resolution live preview (object-cover, no CSS upscaling of a low-res stream) */}
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                onClick={handleTapToFocus}
                className="absolute inset-0 w-full h-full object-cover"
                style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : undefined}
              />

              {/* Scan window overlay (matches SCAN_BOX used for decoding) */}
              {!isStartingCamera && !cameraError && (
                <div
                  className="absolute pointer-events-none rounded-lg border-2 border-teal-400/90"
                  style={{
                    left: `${SCAN_BOX.x * 100}%`,
                    top: `${SCAN_BOX.y * 100}%`,
                    width: `${SCAN_BOX.w * 100}%`,
                    height: `${SCAN_BOX.h * 100}%`,
                    boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.45)',
                  }}
                >
                  <div className="absolute left-2 right-2 top-1/2 h-px bg-rose-500/90 shadow-[0_0_6px_rgba(244,63,94,0.9)]" />
                </div>
              )}

              {/* Top status overlay */}
              <div className="absolute top-2.5 left-3 right-3 z-10 flex items-center justify-between text-[11px] sm:text-xs text-teal-300 font-mono bg-slate-900/75 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-700/80 pointer-events-none">
                <span>OPTİK OKUYUCU AKTİF</span>
                <span className="animate-pulse text-emerald-400">● CANLI KAMERA</span>
              </div>

              {/* Camera controls */}
              {!isStartingCamera && !cameraError && (torchSupported || zoomRange) && (
                <div className="absolute right-3 top-11 z-10 flex flex-col gap-1.5">
                  {torchSupported && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      title="Fener"
                      className={`p-2 rounded-lg border text-xs cursor-pointer ${
                        torchOn
                          ? 'bg-amber-400 text-slate-900 border-amber-300'
                          : 'bg-slate-900/75 text-slate-200 border-slate-700/80'
                      }`}
                    >
                      <Flashlight className="w-4 h-4" />
                    </button>
                  )}
                  {zoomRange && zoom !== null && (
                    <button
                      type="button"
                      onClick={cycleZoom}
                      title="Yakınlaştır"
                      className="flex items-center gap-1 px-2 py-2 rounded-lg border bg-slate-900/75 text-slate-200 border-slate-700/80 text-[11px] font-mono cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      {zoom.toFixed(1)}x
                    </button>
                  )}
                </div>
              )}

              {/* Loading indicator while camera permission/stream initializes */}
              {isStartingCamera && !cameraError && (
                <div className="absolute inset-0 z-20 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center text-white">
                  <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mb-2.5" />
                  <p className="text-xs font-semibold text-slate-200">
                    Kamera başlatılıyor...
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Tarayıcınız izin isterse lütfen &ldquo;İzin Ver&rdquo; seçeneğine dokunun.
                  </p>
                </div>
              )}

              {/* Camera permission or hardware error state */}
              {cameraError && (
                <div className="absolute inset-0 z-20 bg-slate-900/95 flex flex-col items-center justify-center p-4 text-center text-white">
                  <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
                  <p className="text-xs font-bold text-rose-200 mb-1">Kamera Erişimi Sağlanamadı</p>
                  <p className="text-[11px] text-slate-300 max-w-xs mb-3 leading-relaxed">
                    {cameraError}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCameraError(null);
                      setIsCameraOpen(false);
                      setTimeout(() => setIsCameraOpen(true), 100);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-xs font-semibold text-white cursor-pointer"
                  >
                    Tekrar Dene
                  </button>
                </div>
              )}

              {/* Bottom guidance caption */}
              {!isStartingCamera && !cameraError && (
                <div className="absolute bottom-2.5 left-3 right-3 z-10 text-center pointer-events-none">
                  <span className="inline-block bg-slate-900/75 backdrop-blur-xs text-slate-200 text-[11px] px-3 py-1 rounded-lg border border-slate-700/80">
                    Barkodu çerçeveye yatay hizalayın, ~15-25 cm uzakta tutun. Netleştirmek için dokunun.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manual Barcode / SKU Input */}
        <form onSubmit={handleManualSearch} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Barkod (868...), SKU veya ad..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition-colors font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <span>Ara</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Product Selection Pills - Horizontally swipeable on mobile */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <Barcode className="w-3.5 h-3.5 text-teal-700" />
              Hızlı Seçim:
            </span>
            <span className="text-[10px] text-slate-400 sm:hidden">Kaydır →</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap">
            {products.length === 0 ? (
              <span className="text-[11px] text-slate-400 italic py-1">
                Kayıtlı ürün bulunmuyor. Admin panelinden ürün ekleyebilirsiniz.
              </span>
            ) : (
              products.map((p) => {
                const isSelected = selectedProduct?.id === p.id;
                const shortName = p.name.replace('Care Up ', '').split(' ')[0] || p.sku;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSearchInput(p.barcode);
                      onSelectProduct(p);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-teal-700 border-teal-700 text-white font-semibold shadow-2xs'
                        : 'bg-slate-50 hover:bg-teal-50/60 border-slate-200 hover:border-teal-300 text-slate-700'
                    }`}
                  >
                    {shortName} ({p.sku})
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
