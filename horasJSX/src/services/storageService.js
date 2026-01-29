/**
 * Servicio de persistencia con localStorage
 * Maneja lectura y escritura de datos en el navegador
 */

const ENTRIES_KEY = 'billing-entries';
const THEME_KEY = 'theme';

/**
 * Carga las entradas guardadas desde localStorage
 * @returns {Array} Array de entradas o [] si no hay datos
 */
export const loadEntries = () => {
  try {
    const saved = localStorage.getItem(ENTRIES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.log('No hay entradas previas');
    return [];
  }
};

/**
 * Guarda las entradas en localStorage
 * @param {Array} entries - Array de entradas a guardar
 * @throws {Error} Si hay error al guardar
 */
export const saveEntries = (entries) => {
  try {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Error al guardar entradas:', error);
    throw error;
  }
};

/**
 * Carga la preferencia de tema guardada
 * @returns {string} 'dark' o 'light'
 */
export const loadTheme = () => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved ? saved === 'dark' : true; // true = dark mode por defecto
  } catch (error) {
    console.log('No hay preferencia de tema guardada');
    return true;
  }
};

/**
 * Guarda la preferencia de tema
 * @param {boolean} isDarkMode - true para modo oscuro, false para claro
 */
export const saveTheme = (isDarkMode) => {
  try {
    localStorage.setItem(THEME_KEY, isDarkMode ? 'dark' : 'light');
  } catch (error) {
    console.error('Error al guardar tema:', error);
  }
};

/**
 * Limpia todas las entradas del almacenamiento
 */
export const clearEntries = () => {
  try {
    localStorage.removeItem(ENTRIES_KEY);
  } catch (error) {
    console.error('Error al limpiar entradas:', error);
  }
};
