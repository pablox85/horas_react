/**
 * EJEMPLOS DE USO - Control de Horas
 * 
 * Este archivo muestra cómo usar los componentes, hooks y servicios
 * modularizados de la aplicación.
 */

// ============================================================================
// 1. IMPORTAR COMPONENTES
// ============================================================================

import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { EntriesList } from './components/EntriesList';
import { TotalSection } from './components/TotalSection';
import { NotificationSuccess } from './components/NotificationSuccess';

// ============================================================================
// 2. IMPORTAR HOOKS
// ============================================================================

import { useTimeManager } from './hooks/useTimeManager';

// ============================================================================
// 3. IMPORTAR SERVICIOS
// ============================================================================

// Storage
import {
  loadEntries,
  saveEntries,
  loadTheme,
  saveTheme,
  clearEntries,
} from './services/storageService';

// Cálculos
import {
  calculateTotalHours,
  calculateCost,
  calculateTotals,
  getHourlyRate,
} from './services/calculationService';

// PDF
import { exportToPDF } from './services/pdfService';

// ============================================================================
// 4. IMPORTAR UTILIDADES
// ============================================================================

import {
  formatTime,
  formatDisplayTime,
  formatDateDisplay,
  formatCurrency,
} from './utils/formatters';

// ============================================================================
// EJEMPLO 1: Usar un componente
// ============================================================================

function App() {
  const [darkMode, setDarkMode] = React.useState(true);

  return (
    // Header muestra el título y toggle de tema
    <Header
      darkMode={darkMode}
      onToggleTheme={() => setDarkMode(!darkMode)}
      hourlyRate={625}
    />
  );
}

// ============================================================================
// EJEMPLO 2: Usar el hook useTimeManager
// ============================================================================

function CreateEntryExample() {
  const timeManager = useTimeManager();

  const handleCreateEntry = () => {
    // Crear una entrada validada
    const newEntry = timeManager.createEntry({
      tripType: 'Rendición',
      customTrip: '',
      date: '2024-01-29',
      mode: 'manual',
      hours: 2,
      minutes: 30,
      timerSeconds: 0,
    });

    if (newEntry) {
      console.log('Entrada creada:', newEntry);
      // Resultado:
      // {
      //   id: 1704067200000,
      //   tripType: 'Rendición',
      //   date: '29/01/2024',
      //   hours: 2.5,
      //   cost: 1562.5
      // }
    }
  };

  return <button onClick={handleCreateEntry}>Crear Entrada</button>;
}

// ============================================================================
// EJEMPLO 3: Usar servicios de cálculo
// ============================================================================

function CalculationExample() {
  // Calcular horas totales
  const horasTotales = calculateTotalHours({
    mode: 'manual',
    hours: 3,
    minutes: 45,
  });
  console.log('Horas totales:', horasTotales); // 3.75

  // Calcular costo
  const costo = calculateCost(horasTotales);
  console.log('Costo:', costo); // 2343.75 (3.75 * 625)

  // Calcular totales de un array
  const entries = [
    { id: 1, hours: 2, cost: 1250 },
    { id: 2, hours: 3, cost: 1875 },
  ];
  const { totalCost, totalHours } = calculateTotals(entries);
  console.log('Totales:', { totalCost, totalHours }); // { totalCost: 3125, totalHours: 5 }

  // Obtener tarifa
  const tarifa = getHourlyRate();
  console.log('Tarifa:', tarifa); // 625
}

// ============================================================================
// EJEMPLO 4: Usar servicios de almacenamiento
// ============================================================================

function StorageExample() {
  // Cargar entradas
  const entries = loadEntries();
  console.log('Entradas guardadas:', entries);

  // Guardar entradas
  const newEntries = [...entries, { id: 1, tripType: 'Visita', cost: 1250 }];
  saveEntries(newEntries);

  // Cargar tema
  const isDarkMode = loadTheme();
  console.log('Modo oscuro:', isDarkMode);

  // Guardar tema
  saveTheme(true); // true = oscuro, false = claro

  // Limpiar todo
  // clearEntries(); // ¡Cuidado! Borra todo
}

// ============================================================================
// EJEMPLO 5: Usar formatters (utilidades)
// ============================================================================

function FormattersExample() {
  // Formatear tiempo
  const tiempo = formatTime(3661); // segundos
  console.log('Tiempo:', tiempo); // "01:01:01"

  // Formatear tiempo para mostrar
  const tiempoDisplay = formatDisplayTime(2.5);
  console.log('Tiempo display:', tiempoDisplay); // "2h 30m"

  // Formatear fecha
  const fecha = formatDateDisplay('2024-01-29');
  console.log('Fecha:', fecha); // "29/01/2024"

  // Formatear moneda
  const moneda = formatCurrency(1250.75);
  console.log('Moneda:', moneda); // "$1250.75"
}

// ============================================================================
// EJEMPLO 6: Usar servicio de PDF
// ============================================================================

function ExportExample() {
  const entries = [
    {
      id: 1,
      date: '29/01/2024',
      tripType: 'Rendición',
      hours: 2.5,
      cost: 1562.5,
    },
    {
      id: 2,
      date: '30/01/2024',
      tripType: 'Visita',
      hours: 3,
      cost: 1875,
    },
  ];

  const handleExport = () => {
    exportToPDF(entries);
    // Descarga un archivo: facturacion_2024-01-29.pdf
  };

  return <button onClick={handleExport}>Exportar PDF</button>;
}

// ============================================================================
// EJEMPLO 7: Composición completa (App principal)
// ============================================================================

function CompleteExample() {
  // Estados
  const [entries, setEntries] = React.useState([]);
  const [darkMode, setDarkMode] = React.useState(true);
  const [date, setDate] = React.useState(new Date().toISOString().split('T')[0]);

  // Hooks
  const timeManager = useTimeManager();

  // Efectos
  React.useEffect(() => {
    // Cargar datos al montar
    setEntries(loadEntries());
    setDarkMode(loadTheme());
  }, []);

  // Funciones
  const handleAddEntry = (tripType, mode, hours, minutes, timerSeconds) => {
    const newEntry = timeManager.createEntry({
      tripType,
      customTrip: '',
      date,
      mode,
      hours,
      minutes,
      timerSeconds,
    });

    if (newEntry) {
      const newEntries = [...entries, newEntry];
      setEntries(newEntries);
      saveEntries(newEntries);
    }
  };

  const handleDeleteEntry = (id) => {
    const newEntries = entries.filter((e) => e.id !== id);
    setEntries(newEntries);
    saveEntries(newEntries);
  };

  const { totalCost, totalHours } = calculateTotals(entries);

  // Render
  return (
    <div>
      <Header
        darkMode={darkMode}
        onToggleTheme={() => {
          setDarkMode(!darkMode);
          saveTheme(!darkMode);
        }}
        hourlyRate={getHourlyRate()}
      />

      <InputSection
        date={date}
        onDateChange={setDate}
        onAddEntry={(tripType, mode, h, m, ts) =>
          handleAddEntry(tripType, mode, h, m, ts)
        }
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
        onExportPDF={() => exportToPDF(entries)}
        darkMode={darkMode}
      />
    </div>
  );
}

// ============================================================================
// EJEMPLO 8: Crear un nuevo componente reutilizable
// ============================================================================

// Archivo: src/components/MyCustomComponent.jsx
import React from 'react';

export function MyCustomComponent({ entries, darkMode, onAction }) {
  // Usar servicios aquí si es necesario
  const { totalCost, totalHours } = calculateTotals(entries);

  return (
    <div className={darkMode ? 'bg-dark' : 'bg-light'}>
      <h2>Mi Componente Personalizado</h2>
      <p>Total: {formatCurrency(totalCost)}</p>
      <button onClick={onAction}>Hacer algo</button>
    </div>
  );
}

// Usar en App.jsx:
// <MyCustomComponent 
//   entries={entries} 
//   darkMode={darkMode} 
//   onAction={handleAction}
// />

// ============================================================================
// EJEMPLO 9: Crear un nuevo servicio
// ============================================================================

// Archivo: src/services/reportService.js
/**
 * Servicio para generar reportes
 */
export const generateReport = (entries) => {
  const { totalCost, totalHours } = calculateTotals(entries);

  return {
    startDate: entries[0]?.date,
    endDate: entries[entries.length - 1]?.date,
    totalEntries: entries.length,
    totalCost,
    totalHours,
    averageCostPerEntry: totalCost / entries.length,
    averageHoursPerEntry: totalHours / entries.length,
  };
};

// Usar en App.jsx:
// import { generateReport } from './services/reportService';
// const report = generateReport(entries);
// console.log(report);

// ============================================================================
// EJEMPLO 10: Crear un nuevo hook reutilizable
// ============================================================================

// Archivo: src/hooks/usePersistentState.js
import { useState, useEffect } from 'react';

/**
 * Hook que sincroniza estado con localStorage automáticamente
 */
export const usePersistentState = (key, initialValue) => {
  const [state, setState] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
};

// Usar en componentes:
// import { usePersistentState } from '../hooks/usePersistentState';
// const [myData, setMyData] = usePersistentState('myKey', []);

// ============================================================================
// RESUMEN DE PATRONES
// ============================================================================

/*
COMPONENTES:
- Reciben props (datos y callbacks)
- No tienen lógica de negocio
- Son reutilizables
- Se renderidan basado en props

HOOKS:
- Encapsulan lógica
- Pueden usar useState, useEffect, etc
- Reutilizables en múltiples componentes
- Devuelven datos/métodos

SERVICIOS:
- Funciones puras (sin efectos)
- No dependen de React
- Reutilizables en cualquier contexto
- Fáciles de testear

UTILIDADES:
- Funciones simples
- Sin estado
- Máxima reutilización
- Formato, cálculos simples

APP:
- Coordina todo
- Maneja estado global
- Orquesta componentes
- Sincroniza datos
*/
