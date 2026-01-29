/**
 * ============================================================================
 * CONTROL DE HORAS - APLICACIÓN DE FACTURACIÓN (Componente Principal)
 * ============================================================================
 * 
 * Aplicación React para llevar control de horas trabajadas y calcular costos
 * de facturación. Incluye modo manual, timer, y modo oscuro/claro.
 * 
 * @version 2.0 (Modularizado)
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { EntriesList } from './components/EntriesList';
import { TotalSection } from './components/TotalSection';
import { NotificationSuccess } from './components/NotificationSuccess';
import { useTimeManager } from './hooks/useTimeManager';
import {
  loadEntries,
  saveEntries,
  loadTheme,
  saveTheme,
  clearEntries,
} from './services/storageService';
import { calculateTotals, getHourlyRate } from './services/calculationService';
import { exportToPDF } from './services/pdfService';

export default function ControlHoras() {
  // ========================================================================
  // ESTADOS
  // ========================================================================

  const [entries, setEntries] = useState([]);
  const [tripType, setTripType] = useState('Rendición');
  const [customTrip, setCustomTrip] = useState('');
  const [date, setDate] = useState('');
  const [mode, setMode] = useState('manual');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // ========================================================================
  // HOOKS PERSONALIZADOS
  // ========================================================================

  const timeManager = useTimeManager();

  // ========================================================================
  // EFECTOS
  // ========================================================================

  /**
   * Inicialización al montar el componente
   */
  useEffect(() => {
    setDate(new Date().toISOString().split('T')[0]);
    setEntries(loadEntries());
    setDarkMode(loadTheme());
  }, []);

  /**
   * Manejo del timer
   */
  useEffect(() => {
    let timerInterval;
    if (isTimerRunning) {
      timerInterval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [isTimerRunning]);

  /**
   * Persistencia del tema
   */
  useEffect(() => {
    saveTheme(darkMode);
  }, [darkMode]);

  // ========================================================================
  // FUNCIONES
  // ========================================================================

  /**
   * Agrega una nueva entrada de horas
   */
  const handleAddEntry = () => {
    const newEntry = timeManager.createEntry({
      tripType,
      customTrip,
      date,
      mode,
      hours,
      minutes,
      timerSeconds,
    });

    if (!newEntry) return;

    const newEntries = [...entries, newEntry];
    setEntries(newEntries);
    saveEntries(newEntries);

    // Mostrar notificación
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);

    // Resetear formulario
    resetForm();
  };

  /**
   * Elimina una entrada por ID
   */
  const handleDeleteEntry = (id) => {
    const newEntries = entries.filter((e) => e.id !== id);
    setEntries(newEntries);
    saveEntries(newEntries);
  };

  /**
   * Resetea el formulario
   */
  const resetForm = () => {
    const reset = timeManager.getFormReset();
    setTripType(reset.tripType);
    setCustomTrip(reset.customTrip);
    setHours(reset.hours);
    setMinutes(reset.minutes);
    setTimerSeconds(reset.timerSeconds);
    setIsTimerRunning(reset.isTimerRunning);
    setDate(reset.date);
  };

  /**
   * Resetea todas las entradas del mes
   */
  const handleResetMonth = () => {
    if (confirm('¿Estás seguro de que quieres resetear el mes?')) {
      setEntries([]);
      clearEntries();
    }
  };

  /**
   * Exporta a PDF
   */
  const handleExportPDF = () => {
    exportToPDF(entries);
  };

  // ========================================================================
  // CÁLCULOS
  // ========================================================================

  const { totalCost, totalHours } = calculateTotals(entries);
  const hourlyRate = getHourlyRate();

  // ========================================================================
  // RENDERIZADO
  // ========================================================================

  return (
    <div
      className={`min-h-screen py-8 px-4 transition-colors duration-500 ${
        darkMode
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
          : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'
      }`}
    >
      <div className="max-w-4xl mx-auto">
        {/* Notificación */}
        <NotificationSuccess show={showSuccess} darkMode={darkMode} />

        {/* Header */}
        <Header
          darkMode={darkMode}
          onToggleTheme={() => setDarkMode(!darkMode)}
          hourlyRate={hourlyRate}
        />

        {/* Input Section */}
        <InputSection
          tripType={tripType}
          customTrip={customTrip}
          date={date}
          mode={mode}
          hours={hours}
          minutes={minutes}
          timerSeconds={timerSeconds}
          isTimerRunning={isTimerRunning}
          onTripTypeChange={setTripType}
          onCustomTripChange={setCustomTrip}
          onDateChange={setDate}
          onModeChange={setMode}
          onHoursChange={setHours}
          onMinutesChange={setMinutes}
          onStartTimer={() => setIsTimerRunning(true)}
          onStopTimer={() => setIsTimerRunning(false)}
          onAddEntry={handleAddEntry}
          darkMode={darkMode}
        />

        {/* Entries List */}
        <EntriesList
          entries={entries}
          onDeleteEntry={handleDeleteEntry}
          darkMode={darkMode}
        />

        {/* Total Section */}
        <TotalSection
          totalCost={totalCost}
          totalHours={totalHours}
          hasEntries={entries.length > 0}
          onExportPDF={handleExportPDF}
          onResetMonth={handleResetMonth}
          darkMode={darkMode}
        />
      </div>

      {/* Estilos CSS */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-slideIn {
          animation: slideIn 0.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
