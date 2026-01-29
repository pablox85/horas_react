/**
 * Componente Header
 * Encabezado con título, icono y toggle de tema
 */

import React from 'react';
import { Clock, Sun, Moon } from 'lucide-react';

export function Header({ darkMode, onToggleTheme, hourlyRate }) {
  return (
    <div
      className={`rounded-2xl p-8 mb-8 shadow-xl border transition-all duration-500 ${
        darkMode
          ? 'bg-slate-800/50 border-slate-700/50 backdrop-blur-xl'
          : 'bg-white/80 border-slate-200 backdrop-blur-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Clock
            className={`w-10 h-10 ${
              darkMode ? 'text-blue-400' : 'text-slate-700'
            }`}
          />
          <h1
            className={`text-4xl font-bold ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            Control de Horas
          </h1>
        </div>
        <button
          onClick={onToggleTheme}
          className={`p-3 rounded-xl transition-all duration-300 ${
            darkMode
              ? 'bg-slate-700 hover:bg-slate-600 text-yellow-400'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          {darkMode ? (
            <Sun className="w-6 h-6" />
          ) : (
            <Moon className="w-6 h-6" />
          )}
        </button>
      </div>
      <p className={`text-lg ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
        Tarifa: <span className="font-semibold">${hourlyRate}/hora</span>
      </p>
    </div>
  );
}
