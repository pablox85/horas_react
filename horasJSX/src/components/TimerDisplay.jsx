/**
 * Componente TimerDisplay
 * Muestra el tiempo del cronómetro
 */

import React from 'react';
import { formatTime } from '../utils/formatters';

export function TimerDisplay({ timerSeconds, isRunning, darkMode }) {
  return (
    <div
      className={`rounded-2xl p-6 text-center shadow-xl border transition-all duration-500 ${
        darkMode
          ? 'bg-slate-900/80 border-slate-700'
          : 'bg-slate-100 border-slate-200'
      }`}
    >
      <p
        className={`text-xs uppercase tracking-widest mb-3 font-semibold ${
          darkMode ? 'text-slate-400' : 'text-slate-600'
        }`}
      >
        Tiempo Transcurrido
      </p>
      <div
        className={`text-4xl sm:text-5xl font-bold mb-3 font-mono tracking-tight ${
          darkMode ? 'text-white' : 'text-slate-900'
        }`}
      >
        {formatTime(timerSeconds)}
      </div>
      <p
        className={`text-sm font-medium ${
          darkMode ? 'text-slate-400' : 'text-slate-600'
        }`}
      >
        {isRunning ? 'En curso...' : 'Listo para iniciar'}
      </p>
    </div>
  );
}
