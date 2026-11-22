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
} from 'lucide-react';
import { Product } from '../data/mockData';

interface BarcodeScannerCardProps {
  products: Product[];
  selectedProduct: Product | null;
  onSelectProduct: (product: Product) => void;
  onUnmatchedBarcode?: (barcode: string) => void;
}

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

  const scannerRef = useRef<any>(null);
  const readerElementId = 'careup-barcode-reader';

  // Refs to keep latest callbacks & products accessible inside scanner callback without restarting camera
  const productsRef = useRef<Product[]>(products);
  const onSelectProductRef = useRef(onSelectProduct);
  const onUnmatchedBarcodeRef = useRef(onUnmatchedBarcode);

  useEffect(() => {
    productsRef.current = products;
    onSelectProductRef.current = onSelectProduct;
    onUnmatchedBarcodeRef.current = onUnmatchedBarcode;
  }, [products, onSelectProduct, onUnmatchedBarcode]);

  const stopScanner = useCallback(async () => {
    const instance = scannerRef.current;
    scannerRef.current = null;
    if (instance) {
      try {
        if (instance.isScanning) {
          await instance.stop();
        }
      } catch {}
      try {
        instance.clear();
      } catch {}
    }
  }, []);

  const handleDecodedBarcode = useCallback(
    async (rawCode: string) => {
      const cleaned = rawCode.trim();
      if (!cleaned) return;

      setSearchInput(cleaned);
      setIsCameraOpen(false);
      await stopScanner();

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
    },
    [stopScanner]
  );

  useEffect(() => {
    let isCancelled = false;

    if (!isCameraOpen) {
      stopScanner();
      return;
    }

    async function initCamera() {
      setIsStartingCamera(true);
      setCameraError(null);

      await stopScanner();
      if (isCancelled) return;

      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
        if (isCancelled) return;

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ];

        const html5QrCode = new Html5Qrcode(readerElementId, {
          formatsToSupport,
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        const config = {
          fps: 12,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const width = Math.max(180, Math.min(Math.floor(viewfinderWidth * 0.82), 340));
            const height = Math.max(100, Math.min(Math.floor(viewfinderHeight * 0.5), 180));
            return { width, height };
          },
          aspectRatio: 1.333334,
        };

        try {
          await html5QrCode.start(
            { facingMode },
            config,
            (decodedText: string) => {
              if (!isCancelled) {
                handleDecodedBarcode(decodedText);
              }
            },
            () => {}
          );
        } catch {
          // Fallback to any available camera if preferred facingMode fails (e.g., on desktop webcam)
          const devices = await Html5Qrcode.getCameras();
          if (!devices || devices.length === 0) {
            throw new Error('NO_CAMERA');
          }
          await html5QrCode.start(
            devices[0].id,
            config,
            (decodedText: string) => {
              if (!isCancelled) {
                handleDecodedBarcode(decodedText);
              }
            },
            () => {}
          );
        }

        if (!isCancelled) {
          setIsStartingCamera(false);
        }
      } catch (err: any) {
        if (isCancelled) return;
        setIsStartingCamera(false);
        const msg = String(err?.message || err || '');
        if (
          msg.includes('NotAllowedError') ||
          msg.includes('Permission') ||
          msg.includes('permission')
        ) {
          setCameraError(
            'Kamera erişim izni reddedildi. Lütfen tarayıcı adres çubuğundan kamera iznini aktif hale getirin.'
          );
        } else if (msg.includes('NO_CAMERA') || msg.includes('NotFoundError')) {
          setCameraError('Cihazınızda kullanılabilir bir kamera bulunamadı.');
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
      stopScanner();
    };
  }, [isCameraOpen, facingMode, handleDecodedBarcode, stopScanner]);

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
        <div className="relative w-full aspect-[16/10] sm:aspect-[4/3] rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
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
            <div className="relative w-full h-full bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
              {/* Live HTML5-QRCode video mount point */}
              <div
                id={readerElementId}
                className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
              />

              {/* Top status overlay */}
              <div className="absolute top-2.5 left-3 right-3 z-10 flex items-center justify-between text-[11px] sm:text-xs text-teal-300 font-mono bg-slate-900/75 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-700/80 pointer-events-none">
                <span>OPTİK OKUYUCU AKTİF</span>
                <span className="animate-pulse text-emerald-400">● CANLI KAMERA</span>
              </div>

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
                    Barkodu çerçeve içerisine hizalayın, otomatik okunacaktır
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
