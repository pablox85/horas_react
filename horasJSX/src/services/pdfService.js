/**
 * Servicio para exportación a PDF
 * Genera reportes de facturación en formato PDF
 */

import { formatDisplayTime, formatCurrency } from '../utils/formatters';
import { getHourlyRate } from './calculationService';

/**
 * Genera y descarga un PDF con todas las entradas
 * @param {Array} entries - Array de entradas a exportar
 * @throws {Error} Si no hay jsPDF disponible o error en generación
 */
export const exportToPDF = (entries) => {
  if (entries.length === 0) {
    alert('No hay entradas para exportar');
    return;
  }

  if (!window.jspdf) {
    alert('Error: jsPDF no está cargado');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const HOURLY_RATE = getHourlyRate();

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
  entries.forEach((entry) => {
    const timeDisplay = formatDisplayTime(entry.hours);

    // Paginación: nueva página si no hay espacio
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    doc.text(entry.date, 20, yPos);
    doc.text(entry.tripType, 50, yPos);
    doc.text(timeDisplay, 110, yPos);
    doc.text(formatCurrency(entry.cost), 160, yPos);

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
  doc.text(formatCurrency(totalCost), 160, yPos);

  // --- PIE DE PÁGINA ---
  yPos += 15;
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Tarifa por hora: ${formatCurrency(HOURLY_RATE)}`, 105, yPos, { align: 'center' });

  // Descarga del archivo
  const fileName = `facturacion_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
