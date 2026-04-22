/**
 * ============================================================================
 * CONTROL DE HORAS - APLICACIÓN DE FACTURACIÓN (Componente Principal)
 * ============================================================================
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { EntriesList } from './components/EntriesList';
import { TotalSection } from './components/TotalSection';
import { NotificationSuccess } from './components/NotificationSuccess';
import { ParallelPage } from './components/ParallelPage';
import { useTimeManager } from './hooks/useTimeManager';
import {
  fetchEntries,
  addEntry,
  deleteEntry,
  clearEntries,
  saveTotals,
} from './services/storageService';
import {
  calculateCost,
  calculateTotals,
  getHourlyRate,
} from './services/calculationService';
import { createPDFPreview, exportToPDF } from './services/pdfService';

const TIMER_STORAGE_KEY = 'horas_react_timer';

const parseEntryDateToTimestamp = (entryDate) => {
  if (!entryDate || typeof entryDate !== 'string') return 0;

  const parts = entryDate.split('/');
  if (parts.length !== 3) return 0;

  const [day, month, year] = parts.map((value) => Number(value));
  if (!day || !month || !year) return 0;

  return new Date(year, month - 1, day).getTime();
};

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
  const [currentView, setCurrentView] = useState('control');
  const [entryOrderMode, setEntryOrderMode] = useState('date');
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');

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
      setDate((currentDate) => {
        const shouldAutoUpdate =
          !currentDate || currentDate === lastAutoDateRef.current;

        lastAutoDateRef.current = today;

        return shouldAutoUpdate ? today : currentDate;
      });
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
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      const dateDiff =
        parseEntryDateToTimestamp(b.date) - parseEntryDateToTimestamp(a.date);
      if (dateDiff !== 0) return dateDiff;
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    });
  }, [entries]);
  const displayedEntries = entryOrderMode === 'date' ? sortedEntries : entries;

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
    const preview = createPDFPreview(displayedEntries);
    if (!preview) return;

    setPdfPreviewUrl(preview.url);
    setShowPdfPreview(true);
  };

  const handleClosePDFPreview = () => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }
    setPdfPreviewUrl('');
    setShowPdfPreview(false);
  };

  const handleDownloadFromPreview = () => {
    exportToPDF(displayedEntries);
    handleClosePDFPreview();
  };

  const handleImportEntriesFromPDF = async (rows) => {
    const baseNow = Date.now();
    const imported = rows.map((row, index) => {
      const hoursValue = Number(row.hours) || 0;
      const createdAt = baseNow + index;
      return {
        id: createdAt,
        createdAt,
        tripType: row.tripType,
        date: row.date,
        hours: hoursValue,
        cost: calculateCost(hoursValue),
      };
    });

    if (imported.length === 0) return;

    setEntries((current) => [...imported, ...current]);

    try {
      await Promise.all(imported.map((entry) => addEntry(entry)));
    } catch (error) {
      console.error('Error importando entradas desde PDF:', error);
      alert('Se importaron en pantalla, pero hubo error al guardar algunas entradas.');
    }

    setCurrentView('control');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  return (
    <div
      className={`min-h-screen py-8 px-4 transition-colors duration-500 ${
        darkMode
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
          : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'
      }`}
    >
      {currentView === 'control' ? (
        <div className="max-w-4xl mx-auto">
          <NotificationSuccess show={showSuccess} darkMode={darkMode} />

          <Header
            darkMode={darkMode}
            onToggleTheme={() => setDarkMode(!darkMode)}
            onOpenParallel={() => setCurrentView('parallel')}
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
            onDateChange={setDate}
            onModeChange={setMode}
            onHoursChange={setHours}
            onMinutesChange={setMinutes}
            onStartTimer={handleStartTimer}
            onStopTimer={handleStopTimer}
            onAddEntry={handleAddEntry}
            darkMode={darkMode}
          />

          <EntriesList
            entries={displayedEntries}
            onDeleteEntry={handleDeleteEntry}
            orderMode={entryOrderMode}
            onToggleOrderMode={() =>
              setEntryOrderMode((mode) => (mode === 'date' ? 'manual' : 'date'))
            }
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
      ) : (
        <ParallelPage
          darkMode={darkMode}
          onBack={() => setCurrentView('control')}
          onImportEntries={handleImportEntriesFromPDF}
        />
      )}

      {showPdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            className={`w-full max-w-5xl h-[90vh] rounded-2xl border shadow-2xl flex flex-col ${
              darkMode
                ? 'bg-slate-900 border-slate-700'
                : 'bg-white border-slate-300'
            }`}
          >
            <div
              className={`px-4 py-3 border-b flex items-center justify-between ${
                darkMode ? 'border-slate-700' : 'border-slate-200'
              }`}
            >
              <p className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Vista previa del PDF
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadFromPreview}
                  className={`py-2 px-4 rounded-lg font-semibold transition-colors ${
                    darkMode
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  Descargar PDF
                </button>
                <button
                  onClick={handleClosePDFPreview}
                  className={`py-2 px-4 rounded-lg font-semibold transition-colors ${
                    darkMode
                      ? 'bg-slate-700 hover:bg-slate-600 text-white'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                  }`}
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="flex-1">
              {pdfPreviewUrl && (
                <iframe
                  src={pdfPreviewUrl}
                  title="Vista previa PDF"
                  className="w-full h-full rounded-b-2xl"
                />
              )}
            </div>
          </div>
        </div>
      )}

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
