/**
 * Servicio de cálculos relacionados con horas y costos
 */

const HOURLY_RATE = 625; // Tarifa por hora en pesos

/**
 * Calcula las horas totales en decimal basado en el modo de entrada
 * @param {object} params - Parámetros de cálculo
 * @param {string} params.mode - 'manual' o 'timer'
 * @param {number} params.hours - Horas (si es manual)
 * @param {number} params.minutes - Minutos (si es manual)
 * @param {number} params.timerSeconds - Segundos del timer (si es timer)
 * @returns {number|null} Horas en decimal o null si datos inválidos
 */
export const calculateTotalHours = ({ mode, hours = 0, minutes = 0, timerSeconds = 0 }) => {
  if (mode === 'manual') {
    const totalHours = hours + (minutes / 60);
    return totalHours > 0 ? totalHours : null;
  } else if (mode === 'timer') {
    const totalHours = timerSeconds / 3600;
    return timerSeconds > 0 ? totalHours : null;
  }
  return null;
};

/**
 * Calcula el costo de una entrada basado en las horas
 * @param {number} hours - Horas en formato decimal
 * @returns {number} Costo en pesos
 */
export const calculateCost = (hours) => {
  return hours * HOURLY_RATE;
};

/**
 * Calcula los totales de un array de entradas
 * @param {Array} entries - Array de entradas
 * @returns {object} Objeto con { totalCost, totalHours }
 */
export const calculateTotals = (entries) => {
  return {
    totalCost: entries.reduce((sum, entry) => sum + entry.cost, 0),
    totalHours: entries.reduce((sum, entry) => sum + entry.hours, 0),
  };
};

/**
 * Obtiene la tarifa por hora
 * @returns {number} Tarifa en pesos
 */
export const getHourlyRate = () => {
  return HOURLY_RATE;
};
