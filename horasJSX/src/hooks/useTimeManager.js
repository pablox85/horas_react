/**
 * Hook personalizado para gestionar la lógica de tiempo
 * Maneja entrada manual, timer, y validaciones
 */

import { useRef, useCallback } from 'react';
import { calculateTotalHours, calculateCost } from '../services/calculationService';
import { formatDateDisplay } from '../utils/formatters';

/**
 * Hook que proporciona métodos para gestionar entradas de tiempo
 * @returns {object} Objeto con métodos para crear y validar entradas
 */
export const useTimeManager = () => {
  const timerInterval = useRef(null);

  /**
   * Obtiene el valor del tipo de viaje (maneja custom)
   * @param {string} tripType - Tipo de viaje seleccionado
   * @param {string} customTrip - Viaje personalizado
   * @returns {string|null} Tipo de viaje o null si es inválido
   */
  const getTripTypeValue = useCallback((tripType, customTrip) => {
    if (tripType === 'custom') {
      return customTrip.trim() || null;
    }
    return tripType;
  }, []);

  /**
   * Crea una nueva entrada de horas
   * @param {object} params - Parámetros de la entrada
   * @returns {object|null} Entrada creada o null si hay error de validación
   */
  const createEntry = useCallback((params) => {
    const {
      tripType,
      customTrip,
      date,
      mode,
      hours,
      minutes,
      timerSeconds,
    } = params;

    // Validación 1: Tipo de viaje
    const tripValue = getTripTypeValue(tripType, customTrip);
    if (!tripValue) {
      alert('Por favor ingresa el tipo de viaje');
      return null;
    }

    // Validación 2: Fecha
    if (!date) {
      alert('Por favor selecciona una fecha');
      return null;
    }

    // Cálculo de horas totales
    const totalHours = calculateTotalHours({
      mode,
      hours,
      minutes,
      timerSeconds,
    });

    if (totalHours === null) {
      if (mode === 'manual') {
        alert('Por favor ingresa un tiempo válido');
      } else {
        alert('Por favor inicia el timer');
      }
      return null;
    }

    // Crear entrada
    const now = Date.now();
    const newEntry = {
      id: now,
      createdAt: now,
      tripType: tripValue,
      date: formatDateDisplay(date),
      hours: totalHours,
      cost: calculateCost(totalHours),
    };

    return newEntry;
  }, [getTripTypeValue]);

  /**
   * Resetea el formulario a valores iniciales
   * @returns {object} Objeto con valores iniciales
   */
  const getFormReset = useCallback(() => {
    return {
      tripType: 'Rendición',
      customTrip: '',
      hours: 0,
      minutes: 0,
      timerSeconds: 0,
      isTimerRunning: false,
      date: new Date().toISOString().split('T')[0],
    };
  }, []);

  return {
    createEntry,
    getTripTypeValue,
    getFormReset,
    timerInterval,
  };
};
