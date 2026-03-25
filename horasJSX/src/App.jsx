/**
 * ============================================================================
 * CONTROL DE HORAS - APLICACIÓN DE FACTURACIÓN (Componente Principal)
 * ============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { EntriesList } from './components/EntriesList';
import { TotalSection } from './components/TotalSection';
import { NotificationSuccess } from './components/NotificationSuccess';
import { useTimeManager } from './hooks/useTimeManager';
import {
  fetchEntries,
  addEntry,
  deleteEntry,
  clearEntries,
  saveTotals,
} from './services/storageService';
import { calculateTotals, getHourlyRate } from './services/calculationService';
import { exportToPDF } from './services/pdfService';

const TIMER_STORAGE_KEY = 'horas_react_timer';

export default function ControlHoras() {
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

  const lastAutoDateRef = useRef('');
  const timerStartTimeRef = useRef(null);

  const timeManager = useTimeManager();

  const saveTimerState = (running, startTime) => {
    localStorage.setItem(
      TIMER_STORAGE_KEY,
      JSON.stringify({
        isRunning: running,
        startTime: startTime,
      })
    );
  };

  const clearTimerState = () => {
    localStorage.removeItem(TIMER_STORAGE_KEY);
  };

  const restoreTimerState = () => {
    try {
      const savedTimer = localStorage.getItem(TIMER_STORAGE_KEY);
      if (!savedTimer) return;

      const parsed = JSON.parse(savedTimer);

      if (parsed?.isRunning && parsed?.startTime) {
        timerStartTimeRef.current = Number(parsed.startTime);

        const elapsedSeconds = Math.floor(
          (Date.now() - Number(parsed.startTime)) / 1000
        );

        setTimerSeconds(elapsedSeconds > 0 ? elapsedSeconds : 0);
        setIsTimerRunning(true);
      }
    } catch (error) {
      console.error('Error restaurando timer:', error);
      clearTimerState();
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchEntries();
      setEntries(data);
    };

    loadData();
  }, []);

  useEffect(() => {
    const getToday = () => new Date().toISOString().split('T')[0];

    const updateDate = () => {
      const today = getToday();
      lastAutoDateRef.current = today;
      setDate(today);
    };

    updateDate();

    const intervalId = setInterval(updateDate, 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    restoreTimerState();
  }, []);

  useEffect(() => {
    let timerInterval;

    if (isTimerRunning) {
      if (!timerStartTimeRef.current) {
        timerStartTimeRef.current = Date.now() - timerSeconds * 1000;
      }

      saveTimerState(true, timerStartTimeRef.current);

      timerInterval = setInterval(() => {
        if (!timerStartTimeRef.current) return;

        const elapsedMs = Date.now() - timerStartTimeRef.current;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        setTimerSeconds(elapsedSeconds);
      }, 1000);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [isTimerRunning]);

  useEffect(() => {
    const syncTimer = () => {
      restoreTimerState();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (isTimerRunning && timerStartTimeRef.current) {
          saveTimerState(true, timerStartTimeRef.current);
        }
      }

      if (document.visibilityState === 'visible') {
        syncTimer();
      }
    };

    const handlePageHide = () => {
      if (isTimerRunning && timerStartTimeRef.current) {
        saveTimerState(true, timerStartTimeRef.current);
      }
    };

    const handlePageShow = () => {
      syncTimer();
    };

    window.addEventListener('focus', syncTimer);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', syncTimer);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isTimerRunning]);

  const { totalCost, totalHours } = calculateTotals(entries);
  const hourlyRate = getHourlyRate();

  useEffect(() => {
    saveTotals({ totalCost, totalHours });
  }, [totalCost, totalHours]);

  const handleStartTimer = () => {
    const startTime =
      timerStartTimeRef.current || Date.now() - timerSeconds * 1000;

    timerStartTimeRef.current = startTime;
    saveTimerState(true, startTime);
    setIsTimerRunning(true);
  };

  const handleStopTimer = () => {
    setIsTimerRunning(false);
    timerStartTimeRef.current = null;
    clearTimerState();
  };

  const handleAddEntry = async () => {
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

    const newEntries = [newEntry, ...entries];
    setEntries(newEntries);

    await addEntry(newEntry);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);

    resetForm();
  };

  const handleDeleteEntry = async (id) => {
    const newEntries = entries.filter((e) => e.id !== id);
    setEntries(newEntries);
    await deleteEntry(id);
  };

  const resetForm = () => {
    const reset = timeManager.getFormReset();

    setTripType(reset.tripType);
    setCustomTrip(reset.customTrip);
    setHours(reset.hours);
    setMinutes(reset.minutes);
    setTimerSeconds(reset.timerSeconds);
    setIsTimerRunning(reset.isTimerRunning);
    setDate(reset.date);

    timerStartTimeRef.current = null;
    clearTimerState();
  };

  const handleResetMonth = async () => {
    if (confirm('¿Estás seguro de que quieres resetear el mes?')) {
      setEntries([]);
      await clearEntries();
    }
  };

  const handleExportPDF = () => {
    exportToPDF(entries);
  };

  return (
    <div
      className={`min-h-screen py-8 px-4 transition-colors duration-500 ${
        darkMode
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
          : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'
      }`}
    >
      <div className="max-w-4xl mx-auto">
        <NotificationSuccess show={showSuccess} darkMode={darkMode} />

        <Header
          darkMode={darkMode}
          onToggleTheme={() => setDarkMode(!darkMode)}
          hourlyRate={hourlyRate}
        />

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
          onDateChange={() => setDate(lastAutoDateRef.current)}
          onModeChange={setMode}
          onHoursChange={setHours}
          onMinutesChange={setMinutes}
          onStartTimer={handleStartTimer}
          onStopTimer={handleStopTimer}
          onAddEntry={handleAddEntry}
          darkMode={darkMode}
        />

        <EntriesList
          entries={entries}
          onDeleteEntry={handleDeleteEntry}
          darkMode={darkMode}
        />

        <TotalSection
          totalCost={totalCost}
          totalHours={totalHours}
          hasEntries={entries.length > 0}
          onExportPDF={handleExportPDF}
          onResetMonth={handleResetMonth}
          darkMode={darkMode}
        />
      </div>

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