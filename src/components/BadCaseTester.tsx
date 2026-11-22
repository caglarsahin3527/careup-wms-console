'use client';

import React from 'react';
import { Sliders, ShieldCheck, Play, X, Terminal } from 'lucide-react';

interface BadCaseTesterProps {
  onTriggerScenario: (scenarioId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const BadCaseTester: React.FC<BadCaseTesterProps> = ({
  onTriggerScenario,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const scenarios = [
    {
      id: 'SCENARIO_NEGATIVE_STOCK',
      code: 'ERR-01',
      label: 'Negatif Stok Girişimi',
      category: 'Bakiye Bütünlüğü',
    },
    {
      id: 'SCENARIO_EXPIRED_EXIT',
      code: 'ERR-02',
      label: 'Miadı Yakın (&lt;30g) Çıkış Kısıtı',
      category: 'FEFO / GMP Protokolü',
    },
    {
      id: 'SCENARIO_DOUBLE_SUBMIT',
      code: 'ERR-03',
      label: 'Çift Tıklama (Idempotency)',
      category: 'Eşzamanlılık Koruması',
    },
    {
      id: 'SCENARIO_UNAUTHORIZED_COUNT',
      code: 'ERR-04',
      label: 'Yetkisiz Mutabakat Girişimi',
      category: 'RBAC Yetkilendirme',
    },
    {
      id: 'SCENARIO_ALERT_FATIGUE',
      code: 'ERR-05',
      label: 'Onay Körlüğü Koruması',
      category: 'Operasyonel Ergonomi',
    },
    {
      id: 'SCENARIO_ROLLBACK',
      code: 'ERR-06',
      label: 'Ters Kayıt (What-If Undo)',
      category: 'Hata Telafisi / Reversal',
    },
    {
      id: 'SCENARIO_OFFLINE',
      code: 'ERR-07',
      label: 'Çevrimdışı Kuyruk & Senkron',
      category: 'Ağ Toleransı',
    },
  ];

  return (
    <div className="bg-slate-925 text-white p-3.5 rounded-lg border border-slate-800 shadow-elevated mb-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            Kural Motoru &amp; İstisna Denetim Konsolu (Diagnostics Engine)
          </h4>
          <span className="text-2xs font-mono bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded">
            Aktif İzleme
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        {scenarios.map((sc) => (
          <button
            key={sc.id}
            onClick={() => onTriggerScenario(sc.id)}
            className="text-left p-2 rounded bg-slate-850 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/60 transition-all flex flex-col justify-between group shadow-subtle"
          >
            <div>
              <div className="flex items-center justify-between text-2xs font-mono text-slate-400">
                <span>{sc.code}</span>
                <Play className="w-2.5 h-2.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </div>
              <p
                className="text-xs font-semibold text-slate-200 group-hover:text-white mt-1 leading-tight"
                dangerouslySetInnerHTML={{ __html: sc.label }}
              />
            </div>
            <span className="text-2xs text-slate-400 font-mono mt-2 block truncate">
              {sc.category}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
