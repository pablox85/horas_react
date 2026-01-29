/**
 * Componente TimerInput
 * Controles para el cronómetro (Play, Pause, Save)
 */

import React from 'react';
import { Play, Pause, Save } from 'lucide-react';
import { TimerDisplay } from './TimerDisplay';

export function TimerInput({
  timerSeconds,
  isTimerRunning,
  onStartTimer,
  onStopTimer,
  onAddEntry,
  darkMode,
}) {
  return (
    <div className="space-y-5 animate-fadeIn">
      <TimerDisplay
        timerSeconds={timerSeconds}
        isRunning={isTimerRunning}
        darkMode={darkMode}
      />

      {!isTimerRunning ? (
        timerSeconds > 0 ? (
          <button
            onClick={onAddEntry}
            className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
              darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            <Save className="w-5 h-5" />
            Guardar Entrada
          </button>
        ) : (
          <button
            onClick={onStartTimer}
            className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
              darkMode
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
          >
            <Play className="w-5 h-5" />
            Iniciar Timer
          </button>
        )
      ) : (
        <button
          onClick={onStopTimer}
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
            darkMode
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
        >
          <Pause className="w-5 h-5" />
          Detener Timer
        </button>
      )}
    </div>
  );
}
