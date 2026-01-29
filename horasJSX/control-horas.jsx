/**
 * ============================================================================
 * CONTROL DE HORAS - APLICACIÓN DE FACTURACIÓN
 * ============================================================================
 * 
 * Aplicación React para llevar control de horas trabajadas y calcular costos
 * de facturación. Incluye modo manual, timer, y modo oscuro/claro.
 * 
 * Características principales:
 * - Entrada manual de horas y minutos
 * - Timer cronómetro en tiempo real
 * - Persistencia de datos con localStorage
 * - Exportación a PDF
 * - Modo oscuro/claro con toggle
 * - Diseño responsive y animaciones suaves
 * 
 * @author Control de Horas App
 * @version 2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Clock, Play, Pause, Save, FileText, RefreshCw, Trash2, Calendar, Timer, TrendingUp, Moon, Sun } from 'lucide-react';

export default function ControlHoras() {
  // ========================================================================
  // ESTADOS DE LA APLICACIÓN
  // ========================================================================
  
  /** Array que almacena todas las entradas de horas registradas */
  const [entries, setEntries] = useState([]);
  
  /** Tipo de viaje seleccionado (Rendición, Visita, o custom) */
  const [tripType, setTripType] = useState('Rendición');
  
  /** Texto del viaje personalizado cuando el usuario elige "Otro" */
  const [customTrip, setCustomTrip] = useState('');
  
  /** Fecha seleccionada para la entrada (formato YYYY-MM-DD) */
  const [date, setDate] = useState('');
  
  /** Modo de entrada actual: 'manual' o 'timer' */
  const [mode, setMode] = useState('manual');
  
  /** Horas ingresadas manualmente */
  const [hours, setHours] = useState(0);
  
  /** Minutos ingresados manualmente */
  const [minutes, setMinutes] = useState(0);
  
  /** Segundos acumulados en el timer */
  const [timerSeconds, setTimerSeconds] = useState(0);
  
  /** Estado del timer (corriendo o detenido) */
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  
  /** Mostrar/ocultar notificación de éxito */
  const [showSuccess, setShowSuccess] = useState(false);
  
  /** Estado del modo oscuro (true = oscuro, false = claro) */
  const [darkMode, setDarkMode] = useState(true);
  
  /** Referencia al intervalo del timer para poder limpiarlo */
  const timerInterval = useRef(null);

  // ========================================================================
  // CONSTANTES
  // ========================================================================
  
  /** Tarifa por hora en pesos */
  const HOURLY_RATE = 625;

  // ========================================================================
  // EFECTOS - INICIALIZACIÓN Y SINCRONIZACIÓN
  // ========================================================================
  
  /**
   * Effect 1: Inicialización al montar el componente
   * - Establece la fecha actual
   * - Carga entradas guardadas del localStorage
   * - Carga la preferencia de tema guardada
   */
  useEffect(() => {
    setDate(new Date().toISOString().split('T')[0]);
    loadEntries();
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    }
  }, []);

  /**
   * Effect 2: Manejo del timer
   * - Inicia/detiene el intervalo según el estado isTimerRunning
   * - Incrementa timerSeconds cada segundo cuando está activo
   * - Limpia el intervalo al desmontar
   */
  useEffect(() => {
    if (isTimerRunning) {
      timerInterval.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    }
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [isTimerRunning]);

  /**
   * Effect 3: Persistencia del tema
   * - Guarda la preferencia de modo oscuro/claro en localStorage
   */
  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // ========================================================================
  // FUNCIONES DE PERSISTENCIA - LocalStorage
  // ========================================================================
  
  /**
   * Carga las entradas guardadas desde localStorage
   * Las parsea desde JSON y actualiza el estado
   */
  const loadEntries = () => {
    try {
      const saved = localStorage.getItem('billing-entries');
      if (saved) {
        setEntries(JSON.parse(saved));
      }
    } catch (error) {
      console.log('No hay entradas previas');
    }
  };

  /**
   * Guarda las entradas en localStorage
   * @param {Array} newEntries - Array de entradas a guardar
   */
  const saveEntries = (newEntries) => {
    try {
      localStorage.setItem('billing-entries', JSON.stringify(newEntries));
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  // ========================================================================
  // FUNCIONES DE FORMATEO
  // ========================================================================
  
  /**
   * Formatea segundos a formato HH:MM:SS
   * @param {number} seconds - Segundos totales
   * @returns {string} Tiempo formateado (ej: "01:30:45")
   */
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  /**
   * Formatea horas decimales a formato legible (ej: "2h 30m")
   * @param {number} totalHours - Horas en formato decimal
   * @returns {string} Tiempo formateado para mostrar
   */
  const formatDisplayTime = (totalHours) => {
    const h = Math.floor(totalHours);
    const m = Math.round((totalHours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // ========================================================================
  // FUNCIONES DE LÓGICA DE NEGOCIO
  // ========================================================================
  
  /**
   * Obtiene el valor del tipo de viaje seleccionado
   * Si es custom, retorna el texto personalizado
   * @returns {string|null} Tipo de viaje o null si está vacío
   */
  const getTripTypeValue = () => {
    if (tripType === 'custom') {
      return customTrip.trim() || null;
    }
    return tripType;
  };

  /**
   * Agrega una nueva entrada de horas
   * Valida datos, calcula costo, y guarda en localStorage
   * Muestra notificación de éxito y resetea el formulario
   */
  const addEntry = () => {
    // Validación 1: Tipo de viaje
    const tripValue = getTripTypeValue();
    if (!tripValue) {
      alert('Por favor ingresa el tipo de viaje');
      return;
    }
    
    // Validación 2: Fecha
    if (!date) {
      alert('Por favor selecciona una fecha');
      return;
    }

    // Cálculo de horas totales según el modo
    let totalHours;
    if (mode === 'manual') {
      // Modo manual: suma horas y minutos convertidos a decimal
      totalHours = hours + (minutes / 60);
      if (totalHours <= 0) {
        alert('Por favor ingresa un tiempo válido');
        return;
      }
    } else {
      // Modo timer: convierte segundos a horas
      if (timerSeconds <= 0) {
        alert('Por favor inicia el timer');
        return;
      }
      totalHours = timerSeconds / 3600;
    }

    // Formateo de fecha para visualización (DD/MM/YYYY)
    const [year, month, day] = date.split('-');
    const displayDate = `${day}/${month}/${year}`;

    // Creación del objeto de entrada
    const newEntry = {
      id: Date.now(), // Timestamp como ID único
      tripType: tripValue,
      date: displayDate,
      hours: totalHours,
      cost: totalHours * HOURLY_RATE // Cálculo del costo
    };

    // Actualización del estado y persistencia
    const newEntries = [...entries, newEntry];
    setEntries(newEntries);
    saveEntries(newEntries);
    
    // Notificación de éxito (2 segundos)
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);

    // Limpiar formulario
    resetForm();
  };

  /**
   * Elimina una entrada por ID
   * @param {number} id - ID de la entrada a eliminar
   */
  const deleteEntry = (id) => {
    const newEntries = entries.filter(e => e.id !== id);
    setEntries(newEntries);
    saveEntries(newEntries);
  };

  /**
   * Resetea todos los campos del formulario a sus valores iniciales
   */
  const resetForm = () => {
    setTripType('Rendición');
    setCustomTrip('');
    setHours(0);
    setMinutes(0);
    setTimerSeconds(0);
    setIsTimerRunning(false);
    setDate(new Date().toISOString().split('T')[0]);
  };

  /**
   * Resetea todas las entradas del mes
   * Pide confirmación antes de borrar
   */
  const resetMonth = () => {
    if (confirm('¿Estás seguro de que quieres resetear el mes?')) {
      setEntries([]);
      saveEntries([]);
    }
  };

  // ========================================================================
  // EXPORTACIÓN A PDF
  // ========================================================================
  
  /**
   * Genera y descarga un PDF con todas las entradas
   * Incluye tabla detallada, totales y tarifa por hora
   * Usa la librería jsPDF
   */
  const exportToPDF = async () => {
    // Validación: debe haber entradas
    if (entries.length === 0) {
      alert('No hay entradas para exportar');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // --- ENCABEZADO ---
    doc.setFontSize(20);
    doc.setTextColor(51, 65, 85);
    doc.text('Control de Horas - Facturación', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const today = new Date().toLocaleDateString('es-AR');
    doc.text(`Generado: ${today}`, 105, 28, { align: 'center' });

    doc.setDrawColor(51, 65, 85);
    doc.line(20, 32, 190, 32);

    // --- TABLA DE ENTRADAS ---
    let yPos = 50;
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    // Headers de la tabla
    doc.setFont(undefined, 'bold');
    doc.text('Fecha', 20, yPos);
    doc.text('Tipo de Viaje', 50, yPos);
    doc.text('Tiempo', 110, yPos);
    doc.text('Costo', 160, yPos);
    
    yPos += 10;
    doc.line(20, yPos - 2, 190, yPos - 2);
    doc.setFont(undefined, 'normal');

    // Cálculo de totales
    const totalCost = entries.reduce((sum, entry) => sum + entry.cost, 0);
    const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);

    // Renderizado de cada entrada
    entries.forEach(entry => {
      const timeDisplay = formatDisplayTime(entry.hours);

      // Paginación: nueva página si no hay espacio
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.text(entry.date, 20, yPos);
      doc.text(entry.tripType, 50, yPos);
      doc.text(timeDisplay, 110, yPos);
      doc.text(`$${entry.cost.toFixed(2)}`, 160, yPos);
      
      yPos += 8;
    });

    // --- TOTALES ---
    yPos += 5;
    doc.setDrawColor(51, 65, 85);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);
    
    const totalTimeDisplay = formatDisplayTime(totalHours);
    
    doc.text('TOTAL:', 20, yPos);
    doc.text(totalTimeDisplay, 110, yPos);
    doc.text(`$${totalCost.toFixed(2)}`, 160, yPos);

    // --- PIE DE PÁGINA ---
    yPos += 15;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Tarifa por hora: $${HOURLY_RATE}`, 105, yPos, { align: 'center' });

    // Descarga del archivo
    const fileName = `facturacion_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  // ========================================================================
  // CÁLCULOS DERIVADOS - Totales
  // ========================================================================
  
  /** Costo total de todas las entradas */
  const totalCost = entries.reduce((sum, e) => sum + e.cost, 0);
  
  /** Horas totales trabajadas */
  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);

  // ========================================================================
  // RENDERIZADO - UI/JSX
  // ========================================================================

  return (
    <div className={`min-h-screen py-8 px-4 transition-colors duration-500 ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
        : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'
    }`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className={`rounded-2xl p-8 mb-8 shadow-xl border transition-all duration-500 ${
          darkMode
            ? 'bg-slate-800/50 border-slate-700/50 backdrop-blur-xl'
            : 'bg-white/80 border-slate-200 backdrop-blur-sm'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Clock className={`w-10 h-10 ${darkMode ? 'text-blue-400' : 'text-slate-700'}`} />
              <h1 className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Control de Horas
              </h1>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-3 rounded-xl transition-all duration-300 ${
                darkMode
                  ? 'bg-slate-700 hover:bg-slate-600 text-yellow-400'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>
          </div>
          <p className={`text-lg ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Tarifa: <span className="font-semibold">${HOURLY_RATE}/hora</span>
          </p>
        </div>

        {/* Success notification */}
        {showSuccess && (
          <div className={`fixed top-8 right-8 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-slideIn ${
            darkMode
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-500 text-white'
          }`}>
            <Save className="w-5 h-5" />
            <span className="font-semibold">Entrada guardada</span>
          </div>
        )}

        {/* Input Section */}
        <div className={`rounded-2xl p-8 mb-8 shadow-xl border transition-all duration-500 ${
          darkMode
            ? 'bg-slate-800/50 border-slate-700/50 backdrop-blur-xl'
            : 'bg-white/80 border-slate-200 backdrop-blur-sm'
        }`}>
          <div className="space-y-6">
            {/* Trip Type */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Tipo de viaje
              </label>
              <select
                value={tripType}
                onChange={(e) => setTripType(e.target.value)}
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

            {tripType === 'custom' && (
              <div className="animate-fadeIn">
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Viaje personalizado
                </label>
                <input
                  type="text"
                  value={customTrip}
                  onChange={(e) => setCustomTrip(e.target.value)}
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
              <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
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

            {/* Mode Selector */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setMode('manual')}
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
                onClick={() => setMode('timer')}
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

            {/* Manual Mode */}
            {mode === 'manual' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Horas
                    </label>
                    <input
                      type="number"
                      value={hours}
                      onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
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
                    <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Minutos
                    </label>
                    <input
                      type="number"
                      value={minutes}
                      onChange={(e) => setMinutes(parseFloat(e.target.value) || 0)}
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
                  onClick={addEntry}
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
            )}

            {/* Timer Mode */}
            {mode === 'timer' && (
              <div className="space-y-5 animate-fadeIn">
                <div className={`rounded-2xl p-6 text-center shadow-xl border transition-all duration-500 ${
                  darkMode
                    ? 'bg-slate-900/80 border-slate-700'
                    : 'bg-slate-100 border-slate-200'
                }`}>
                  <p className={`text-xs uppercase tracking-widest mb-3 font-semibold ${
                    darkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    Tiempo Transcurrido
                  </p>
                  <div className={`text-4xl sm:text-5xl font-bold mb-3 font-mono tracking-tight ${
                    darkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {formatTime(timerSeconds)}
                  </div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {isTimerRunning ? 'En curso...' : 'Listo para iniciar'}
                  </p>
                </div>
                
                {!isTimerRunning ? (
                  timerSeconds > 0 ? (
                    <button
                      onClick={addEntry}
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
                      onClick={() => setIsTimerRunning(true)}
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
                    onClick={() => setIsTimerRunning(false)}
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
            )}
          </div>
        </div>

        {/* Entries */}
        <div className="mb-8">
          <h2 className={`text-2xl font-bold mb-5 flex items-center gap-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <FileText className="w-6 h-6" />
            Historial de Entradas
          </h2>
          <div className="space-y-3">
            {entries.length === 0 ? (
              <div className={`rounded-2xl p-12 text-center shadow-xl border transition-all duration-500 ${
                darkMode
                  ? 'bg-slate-800/50 border-slate-700/50'
                  : 'bg-white/80 border-slate-200'
              }`}>
                <Clock className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                <p className={`text-lg ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
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
                      <h3 className={`font-bold text-lg mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        🚗 {entry.tripType}
                      </h3>
                      <div className="flex items-center gap-3 text-sm flex-wrap">
                        <span className={`px-3 py-1 rounded-full font-medium ${
                          darkMode
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          📅 {entry.date}
                        </span>
                        <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                          ⏱️ {formatDisplayTime(entry.hours)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <div className={`text-3xl font-bold ${
                    darkMode ? 'text-blue-400' : 'text-slate-900'
                  }`}>
                    ${entry.cost.toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Total */}
        <div className={`rounded-2xl p-8 text-center shadow-xl border transition-all duration-500 ${
          darkMode
            ? 'bg-slate-800/50 border-slate-700/50'
            : 'bg-white/80 border-slate-200'
        }`}>
          <div className="flex items-center justify-center gap-3 mb-3">
            <TrendingUp className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-slate-700'}`} />
            <p className={`text-sm uppercase tracking-wider font-semibold ${
              darkMode ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Total Mensual
            </p>
          </div>
          <div className={`text-5xl sm:text-6xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            ${totalCost.toFixed(2)}
          </div>
          <p className={`text-lg mb-8 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {formatDisplayTime(totalHours)} trabajadas
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={exportToPDF}
              disabled={entries.length === 0}
              className={`py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                darkMode
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
              }`}
            >
              <FileText className="w-5 h-5" />
              Exportar PDF
            </button>
            <button
              onClick={resetMonth}
              className={`py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                darkMode
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
              }`}
            >
              <RefreshCw className="w-5 h-5" />
              Resetear
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* ================================================================
           ANIMACIONES CSS PERSONALIZADAS
           - fadeIn: Aparición suave de elementos con desplazamiento
           - slideIn: Entrada desde la izquierda para lista de entradas
           ================================================================ */
        
        /* Animación fadeIn: Para campos que aparecen condicionalmente */
        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(-10px); /* Inicia 10px arriba */
          }
          to { 
            opacity: 1; 
            transform: translateY(0); /* Termina en posición normal */
          }
        }

        /* Animación slideIn: Para entradas que se cargan del localStorage */
        @keyframes slideIn {
          from { 
            opacity: 0; 
            transform: translateX(-20px); /* Inicia 20px a la izquierda */
          }
          to { 
            opacity: 1; 
            transform: translateX(0); /* Termina en posición normal */
          }
        }

        /* Clases de utilidad para aplicar las animaciones */
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out; /* Duración: 0.3s, suavizado: ease-out */
        }

        .animate-slideIn {
          animation: slideIn 0.4s ease-out forwards; /* forwards mantiene el estado final */
          opacity: 0; /* Inicia invisible hasta que la animación comienza */
        }
      `}</style>
    </div>
  );
}

/**
 * ============================================================================
 * FIN DEL COMPONENTE
 * ============================================================================
 * 
 * RESUMEN DE FUNCIONALIDADES:
 * 
 * 1. GESTIÓN DE TIEMPO:
 *    - Entrada manual (horas + minutos)
 *    - Timer/cronómetro en tiempo real
 * 
 * 2. PERSISTENCIA:
 *    - LocalStorage para entradas
 *    - LocalStorage para preferencia de tema
 * 
 * 3. CÁLCULOS:
 *    - Conversión de tiempo a horas decimales
 *    - Cálculo de costo (horas × tarifa)
 *    - Totales acumulados
 * 
 * 4. EXPORTACIÓN:
 *    - Generación de PDF con tabla completa
 *    - Formato profesional con encabezados y totales
 * 
 * 5. UI/UX:
 *    - Modo oscuro/claro con toggle
 *    - Animaciones suaves
 *    - Diseño responsive
 *    - Notificaciones de éxito
 * 
 * LIBRERÍAS EXTERNAS REQUERIDAS:
 * - React (hooks: useState, useEffect, useRef)
 * - lucide-react (iconos)
 * - jsPDF (generación de PDFs)
 * - Tailwind CSS (estilos)
 * 
 * ============================================================================
 */
