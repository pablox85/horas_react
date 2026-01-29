/**
 * Utilidades para formatear tiempos y moneda
 */

/**
 * Formatea segundos a formato HH:MM:SS
 * @param {number} seconds - Segundos totales
 * @returns {string} Tiempo formateado (ej: "01:30:45")
 */
export const formatTime = (seconds) => {
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
export const formatDisplayTime = (totalHours) => {
  const h = Math.floor(totalHours);
  const m = Math.round((totalHours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

/**
 * Formatea fecha a formato local (DD/MM/YYYY)
 * @param {string} dateString - Fecha en formato YYYY-MM-DD
 * @returns {string} Fecha formateada
 */
export const formatDateDisplay = (dateString) => {
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

/**
 * Formatea dinero a moneda local
 * @param {number} amount - Cantidad numérica
 * @returns {string} Cantidad formateada con $
 */
export const formatCurrency = (amount) => {
  return `$${amount.toFixed(2)}`;
};
