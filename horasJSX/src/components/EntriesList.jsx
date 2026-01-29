/**
 * Componente EntriesList
 * Muestra el listado de todas las entradas registradas
 */

import React from 'react';
import { FileText, Clock, Trash2 } from 'lucide-react';
import { formatDisplayTime, formatCurrency } from '../utils/formatters';

export function EntriesList({ entries, onDeleteEntry, darkMode }) {
  return (
    <div className="mb-8">
      <h2
        className={`text-2xl font-bold mb-5 flex items-center gap-3 ${
          darkMode ? 'text-white' : 'text-slate-900'
        }`}
      >
        <FileText className="w-6 h-6" />
        Historial de Entradas
      </h2>
      <div className="space-y-3">
        {entries.length === 0 ? (
          <div
            className={`rounded-2xl p-12 text-center shadow-xl border transition-all duration-500 ${
              darkMode
                ? 'bg-slate-800/50 border-slate-700/50'
                : 'bg-white/80 border-slate-200'
            }`}
          >
            <Clock
              className={`w-16 h-16 mx-auto mb-4 ${
                darkMode ? 'text-slate-600' : 'text-slate-300'
              }`}
            />
            <p
              className={`text-lg ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              No hay entradas registradas aún
            </p>
          </div>
        ) : (
          entries.map((entry, index) => (
            <div
              key={entry.id}
              className={`rounded-xl p-6 shadow-lg border transition-all duration-300 hover:shadow-xl animate-slideIn ${
                darkMode
                  ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                  : 'bg-white/80 border-slate-200 hover:border-slate-300'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3
                    className={`font-bold text-lg mb-2 ${
                      darkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    🚗 {entry.tripType}
                  </h3>
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <span
                      className={`px-3 py-1 rounded-full font-medium ${
                        darkMode
                          ? 'bg-slate-700 text-slate-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      📅 {entry.date}
                    </span>
                    <span
                      className={darkMode ? 'text-slate-400' : 'text-slate-600'}
                    >
                      ⏱️ {formatDisplayTime(entry.hours)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onDeleteEntry(entry.id)}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <div
                className={`text-3xl font-bold ${
                  darkMode ? 'text-blue-400' : 'text-slate-900'
                }`}
              >
                {formatCurrency(entry.cost)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
