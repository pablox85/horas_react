/**
 * Componente TotalSection
 * Muestra totales y botones de exportación/reseteo
 */

import React from 'react';
import { TrendingUp, FileText, RefreshCw } from 'lucide-react';
import { formatDisplayTime, formatCurrency } from '../utils/formatters';

export function TotalSection({
  totalCost,
  totalHours,
  hasEntries,
  onExportPDF,
  onResetMonth,
  darkMode,
}) {
  return (
    <div
      className={`rounded-2xl p-8 text-center shadow-xl border transition-all duration-500 ${
        darkMode
          ? 'bg-slate-800/50 border-slate-700/50'
          : 'bg-white/80 border-slate-200'
      }`}
    >
      <div className="flex items-center justify-center gap-3 mb-3">
        <TrendingUp
          className={`w-6 h-6 ${
            darkMode ? 'text-blue-400' : 'text-slate-700'
          }`}
        />
        <p
          className={`text-sm uppercase tracking-wider font-semibold ${
            darkMode ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          Total Mensual
        </p>
      </div>
      <div
        className={`text-5xl sm:text-6xl font-bold mb-2 ${
          darkMode ? 'text-white' : 'text-slate-900'
        }`}
      >
        {formatCurrency(totalCost)}
      </div>
      <p
        className={`text-lg mb-8 ${
          darkMode ? 'text-slate-400' : 'text-slate-600'
        }`}
      >
        {formatDisplayTime(totalHours)} trabajadas
      </p>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onExportPDF}
          disabled={!hasEntries}
          className={`py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            darkMode
              ? 'bg-slate-700 hover:bg-slate-600 text-white'
              : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
          }`}
        >
          <FileText className="w-5 h-5" />
          Exportar PDF
        </button>
        <button
          onClick={onResetMonth}
          className={`py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
            darkMode
              ? 'bg-slate-700 hover:bg-slate-600 text-white'
              : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
          }`}
        >
          <RefreshCw className="w-5 h-5" />
          Resetear
        </button>
      </div>
    </div>
  );
}
