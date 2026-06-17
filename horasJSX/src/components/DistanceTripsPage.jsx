import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { formatCurrency, formatDateDisplay } from '../utils/formatters';
import { calculateKmCost } from '../services/calculationService';
import {
  addDistanceEntry,
  clearDistanceEntries,
  deleteDistanceEntry,
  fetchDistanceEntries,
} from '../services/storageService';

const sortByCreatedAtDesc = (entries) =>
  [...entries].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

export function DistanceTripsPage({ darkMode, onBack }) {
  const [entries, setEntries] = useState([]);
  const [tripName, setTripName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [kilometers, setKilometers] = useState(0);
  const [ratePerKm, setRatePerKm] = useState(0);

  useEffect(() => {
    const loadEntries = async () => {
      const data = await fetchDistanceEntries();
      setEntries(sortByCreatedAtDesc(data));
    };

    loadEntries();
  }, []);

  const totals = useMemo(
    () =>
      entries.reduce(
        (acc, entry) => ({
          kilometers: acc.kilometers + (Number(entry.kilometers) || 0),
          cost: acc.cost + (Number(entry.cost) || 0),
        }),
        { kilometers: 0, cost: 0 }
      ),
    [entries]
  );

  const handleAddEntry = async () => {
    const nameValue = tripName.trim();
    const kmValue = Number(kilometers) || 0;
    const rateValue = Number(ratePerKm) || 0;

    if (!nameValue) {
      alert('Ingresa el nombre o descripcion del viaje');
      return;
    }

    if (!date) {
      alert('Selecciona una fecha');
      return;
    }

    if (kmValue <= 0 || rateValue <= 0) {
      alert('Ingresa kilómetros y precio por km válidos');
      return;
    }

    const createdAt = Date.now();
    const entry = {
      id: createdAt,
      createdAt,
      tripName: nameValue,
      date: formatDateDisplay(date),
      kilometers: kmValue,
      ratePerKm: rateValue,
      cost: calculateKmCost(kmValue, rateValue),
    };

    const nextEntries = sortByCreatedAtDesc([entry, ...entries]);
    setEntries(nextEntries);

    try {
      await addDistanceEntry(entry);
    } catch (error) {
      console.error('Error guardando viaje por distancia:', error);
      alert('El viaje se agregó en pantalla, pero hubo error al guardarlo.');
    }

    setTripName('');
    setKilometers(0);
    setRatePerKm(0);
    setDate(new Date().toISOString().split('T')[0]);
  };

  const handleDeleteEntry = async (id) => {
    const nextEntries = entries.filter((entry) => entry.id !== id);
    setEntries(nextEntries);

    try {
      await deleteDistanceEntry(id);
    } catch (error) {
      console.error('Error eliminando viaje por distancia:', error);
      alert('El viaje se eliminó en pantalla, pero hubo error al guardar el cambio.');
    }
  };

  const handleReset = async () => {
    if (!confirm('¿Seguro que quieres limpiar el historial de viajes?')) return;
    setEntries([]);

    try {
      await clearDistanceEntries();
    } catch (error) {
      console.error('Error limpiando viajes por distancia:', error);
      alert('Se limpió en pantalla, pero hubo error al guardar el cambio.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div
        className={`rounded-2xl p-8 mb-8 shadow-xl border transition-all duration-500 ${
          darkMode
            ? 'bg-slate-800/50 border-slate-700/50 backdrop-blur-xl'
            : 'bg-white/80 border-slate-200 backdrop-blur-sm'
        }`}
      >
        <div className="flex items-center justify-between mb-6 gap-3">
          <h1
            className={`text-3xl font-bold flex items-center gap-3 ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            <MapPin className="w-8 h-8" />
            Viajes por distancia
          </h1>
          <button
            onClick={onBack}
            className={`py-2 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 ${
              darkMode
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Control de Horas
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label
              className={`block text-sm font-semibold mb-2 ${
                darkMode ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              Viaje
            </label>
            <input
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="Ej: Montevideo - Las Piedras"
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
                darkMode
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
              }`}
            />
          </div>

          <div>
            <label
              className={`text-sm font-semibold mb-2 flex items-center gap-2 ${
                darkMode ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Fecha
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 font-medium ${
                darkMode
                  ? 'bg-slate-700 border-slate-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className={`block text-sm font-semibold mb-2 ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Kilómetros
              </label>
              <input
                type="number"
                value={kilometers === 0 ? '' : kilometers}
                onChange={(e) => setKilometers(parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                step="0.1"
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
                Precio por km
              </label>
              <input
                type="number"
                value={ratePerKm === 0 ? '' : ratePerKm}
                onChange={(e) => setRatePerKm(parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                step="0.01"
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 font-bold text-2xl text-center ${
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                }`}
              />
            </div>
          </div>

          <button
            onClick={handleAddEntry}
            className="w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <Save className="w-5 h-5" />
            Agregar viaje
          </button>
        </div>
      </div>

      <div
        className={`rounded-2xl p-6 mb-8 shadow-xl border transition-all duration-500 ${
          darkMode
            ? 'bg-slate-800/50 border-slate-700/50'
            : 'bg-white/80 border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <p
              className={`text-sm uppercase font-semibold ${
                darkMode ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              Historial de viajes
            </p>
            <h2
              className={`text-3xl font-bold ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              {formatCurrency(totals.cost)}
            </h2>
            <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
              {totals.kilometers.toFixed(1)} km registrados
            </p>
          </div>
          <button
            onClick={handleReset}
            disabled={entries.length === 0}
            className={`py-2 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              darkMode
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Resetear
          </button>
        </div>

        {entries.length === 0 ? (
          <div
            className={`rounded-xl p-8 text-center ${
              darkMode ? 'bg-slate-900/30 text-slate-400' : 'bg-slate-50 text-slate-500'
            }`}
          >
            No hay viajes por distancia registrados
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className={`rounded-xl p-4 border ${
                  darkMode
                    ? 'bg-slate-900/30 border-slate-700'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3
                      className={`font-bold text-lg ${
                        darkMode ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {entry.tripName}
                    </h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full ${
                          darkMode
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-white text-slate-700'
                        }`}
                      >
                        {entry.date}
                      </span>
                      <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                        {entry.kilometers} km x {formatCurrency(entry.ratePerKm)}/km
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <div
                  className={`text-2xl font-bold mt-3 ${
                    darkMode ? 'text-blue-400' : 'text-slate-900'
                  }`}
                >
                  {formatCurrency(entry.cost)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
