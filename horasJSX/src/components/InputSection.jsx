/**
 * Componente InputSection
 * Sección principal de entrada de datos
 * Incluye tipo de viaje, fecha, modo, e inputs específicos
 */

import React from 'react';
import { Calendar, Clock, Timer } from 'lucide-react';
import { ManualInput } from './ManualInput';
import { TimerInput } from './TimerInput';

export function InputSection({
  tripType,
  customTrip,
  date,
  mode,
  hours,
  minutes,
  timerSeconds,
  isTimerRunning,
  onTripTypeChange,
  onCustomTripChange,
  onDateChange,
  onModeChange,
  onHoursChange,
  onMinutesChange,
  onStartTimer,
  onStopTimer,
  onAddEntry,
  darkMode,
}) {
  return (
    <div
      className={`rounded-2xl p-8 mb-8 shadow-xl border transition-all duration-500 ${
        darkMode
          ? 'bg-slate-800/50 border-slate-700/50 backdrop-blur-xl'
          : 'bg-white/80 border-slate-200 backdrop-blur-sm'
      }`}
    >
      <div className="space-y-6">
        {/* Trip Type */}
        <div>
          <label
            className={`block text-sm font-semibold mb-2 ${
              darkMode ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            Tipo de viaje
          </label>
          <select
            value={tripType}
            onChange={(e) => onTripTypeChange(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 font-medium ${
              darkMode
                ? 'bg-slate-700 border-slate-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                : 'bg-white border-slate-300 text-slate-900 focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
            }`}
          >
            <option value="Rendición">Rendición</option>
            <option value="Visita">Visita</option>
            <option value="custom">Otro (personalizado)</option>
          </select>
        </div>

        {/* Custom Trip */}
        {tripType === 'custom' && (
          <div className="animate-fadeIn">
            <label
              className={`block text-sm font-semibold mb-2 ${
                darkMode ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              Viaje personalizado
            </label>
            <input
              type="text"
              value={customTrip}
              onChange={(e) => onCustomTripChange(e.target.value)}
              placeholder="Ingresa el tipo de viaje"
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
                darkMode
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
              }`}
            />
          </div>
        )}

        {/* Date */}
        <div>
          <label
            className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${
              darkMode ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Fecha
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 font-medium ${
              darkMode
                ? 'bg-slate-700 border-slate-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                : 'bg-white border-slate-300 text-slate-900 focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
            }`}
          />
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onModeChange('manual')}
            className={`py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              mode === 'manual'
                ? darkMode
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-800 text-white shadow-lg'
                : darkMode
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-5 h-5" />
            Manual
          </button>
          <button
            onClick={() => onModeChange('timer')}
            className={`py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              mode === 'timer'
                ? darkMode
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-800 text-white shadow-lg'
                : darkMode
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Timer className="w-5 h-5" />
            Timer
          </button>
        </div>

        {/* Input Mode Specific */}
        {mode === 'manual' ? (
          <ManualInput
            hours={hours}
            minutes={minutes}
            onHoursChange={onHoursChange}
            onMinutesChange={onMinutesChange}
            onAddEntry={onAddEntry}
            darkMode={darkMode}
          />
        ) : (
          <TimerInput
            timerSeconds={timerSeconds}
            isTimerRunning={isTimerRunning}
            onStartTimer={onStartTimer}
            onStopTimer={onStopTimer}
            onAddEntry={onAddEntry}
            darkMode={darkMode}
          />
        )}
      </div>
    </div>
  );
}
