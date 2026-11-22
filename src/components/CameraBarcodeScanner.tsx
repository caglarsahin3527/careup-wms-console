'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertCircle,
  RefreshCw,
  Flashlight,
  ZoomIn,
  XCircle,
} from 'lucide-react';

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

type ExtendedCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  zoom?: { min: number; max: number; step?: number };
  torch?: boolean;
};

const SCAN_BOX = { x: 0.06, y: 0.25, w: 0.88, h: 0.5 };
const MAX_DECODE_WIDTH = 1280;
const BACK_CAMERA_RE = /back|rear|environment|arka|facing back/i;

function scoreBackCamera(label: string): number {
  const l = label.toLowerCase();
  if (!BACK_CAMERA_RE.test(l)) return -1;
  if (/ultra|tele|depth|macro|infrared|\bir\b|0[.,]5/.test(l)) return 0;
  if (/^back camera$|^arka kamera$/.test(l.trim())) return 100;
  if (/camera2 0\b|camera 0\b/.test(l)) return 90;
  if (/dual|triple/.test(l)) return 30;
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

export const CameraBarcodeScanner: React.FC<CameraBarcodeScannerProps> = ({
  isOpen,
  onDetected,
  onClose,
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number } | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isHandlingScanRef = useRef(false);
  const onDetectedRef = useRef(onDetected);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const getTrack = () => streamRef.current?.getVideoTracks()[0] ?? null;

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

  useEffect(() => {
    if (!isOpen) return;

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
        const decoder = new Html5QrcodeShim(formats, true, false, {
          log: noop,
          warn: noop,
          logError: noop,
          logErrors: noop,
        });

        let stream = await openStream({ facingMode });
        if (isCancelled) return stopStream(stream);

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

        const track = stream.getVideoTracks()[0];
        const caps = (track.getCapabilities?.() || {}) as ExtendedCapabilities;
        const advanced: Record<string, unknown> = {};
        if (caps.focusMode?.includes('continuous')) advanced.focusMode = 'continuous';
        if (caps.zoom && caps.zoom.max > caps.zoom.min) {
          const initialZoom = Math.min(Math.max(1.5, caps.zoom.min), caps.zoom.max);
          advanced.zoom = initialZoom;
          setZoomRange({ min: caps.zoom.min, max: caps.zoom.max });
          setZoom(initialZoom);
        }
        if (caps.torch) setTorchSupported(true);
        if (Object.keys(advanced).length) await applyAdvanced(advanced);

        if (!isCancelled) setIsStartingCamera(false);

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
            const s = Math.max(cw / vw, ch / vh);
            const visW = cw / s;
            const visH = ch / s;
            const x0 = (vw - visW) / 2;
            const y0 = (vh - visH) / 2;

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
              const cleaned = result?.text?.trim();
              if (!isCancelled && cleaned && !isHandlingScanRef.current) {
                isHandlingScanRef.current = true;
                if (navigator.vibrate) navigator.vibrate(80);
                onDetectedRef.current(cleaned);
                return;
              }
            } catch {
              // Bu karede barkod bulunamadı
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
          setCameraError(
            'Kamera başka bir uygulama tarafından kullanılıyor. Diğer uygulamaları kapatıp tekrar deneyin.'
          );
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
  }, [isOpen, facingMode, retryTick, applyAdvanced]);

  const handleTapToFocus = async () => {
    const track = getTrack();
    if (!track) return;
    const caps = (track.getCapabilities?.() || {}) as ExtendedCapabilities;
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

  if (!isOpen) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-600">
          Kutu üzerindeki barkodu kameraya tutun; okunan numara forma otomatik yazılır.
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
            title="Kamera Değiştir (Ön / Arka)"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Çevir</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Kapat</span>
          </button>
        </div>
      </div>

      <div className="relative w-full aspect-[4/3] min-h-[220px] rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          onClick={handleTapToFocus}
          className="absolute inset-0 w-full h-full object-cover"
          style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : undefined}
        />

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

        <div className="absolute top-2.5 left-3 right-3 z-10 flex items-center justify-between text-[11px] text-teal-300 font-mono bg-slate-900/75 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-700/80 pointer-events-none">
          <span>OPTİK OKUYUCU AKTİF</span>
          <span className="animate-pulse text-emerald-400">● CANLI KAMERA</span>
        </div>

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

        {isStartingCamera && !cameraError && (
          <div className="absolute inset-0 z-20 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center text-white">
            <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mb-2.5" />
            <p className="text-xs font-semibold text-slate-200">Kamera başlatılıyor...</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Tarayıcınız izin isterse lütfen &ldquo;İzin Ver&rdquo; seçeneğine dokunun.
            </p>
          </div>
        )}

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
                setRetryTick((t) => t + 1);
              }}
              className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-xs font-semibold text-white cursor-pointer"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {!isStartingCamera && !cameraError && (
          <div className="absolute bottom-2.5 left-3 right-3 z-10 text-center pointer-events-none">
            <span className="inline-block bg-slate-900/75 backdrop-blur-xs text-slate-200 text-[11px] px-3 py-1 rounded-lg border border-slate-700/80">
              Barkodu çerçeveye yatay hizalayın, ~15-25 cm uzakta tutun. Netleştirmek için dokunun.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
