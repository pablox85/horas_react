/**
 * Componente ManualInput
 * Formulario para entrada manual de horas y minutos
 */

import React from 'react';
import { Save } from 'lucide-react';

export function ManualInput({
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  onAddEntry,
  darkMode,
}) {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${
              darkMode ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            Horas
          </label>
          <input
            type="number"
            value={hours}
            onChange={(e) => onHoursChange(parseFloat(e.target.value) || 0)}
            min="0"
            step="0.25"
            className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 font-bold text-2xl text-center ${
              darkMode
                ? 'bg-slate-700 border-slate-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                : 'bg-white border-slate-300 text-slate-900 focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
            }`}
          />
        </div>
        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${
              darkMode ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            Minutos
          </label>
          <input
            type="number"
            value={minutes}
            onChange={(e) => onMinutesChange(parseFloat(e.target.value) || 0)}
            min="0"
            max="59"
            className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 font-bold text-2xl text-center ${
              darkMode
                ? 'bg-slate-700 border-slate-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                : 'bg-white border-slate-300 text-slate-900 focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
            }`}
          />
        </div>
      </div>
      <button
        onClick={onAddEntry}
        className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
          darkMode
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
            : 'bg-emerald-500 hover:bg-emerald-600 text-white'
        }`}
      >
        <Save className="w-5 h-5" />
        Agregar Entrada
      </button>
    </div>
  );
}
