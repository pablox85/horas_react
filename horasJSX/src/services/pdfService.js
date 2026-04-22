import { formatDisplayTime, formatCurrency } from '../utils/formatters';
import { getHourlyRate } from './calculationService';

const createPDFDocument = (entries) => {
  if (entries.length === 0) {
    alert('No hay entradas para exportar');
    return null;
  }

  if (!window.jspdf) {
    alert('Error: jsPDF no está cargado');
    return null;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const HOURLY_RATE = getHourlyRate();
  const HEADER_TO_FIRST_ROW_GAP = 10;
  const HEADER_SEPARATOR_OFFSET = 5;
  const ROW_HEIGHT = 8;

  doc.setFontSize(20);
  doc.setTextColor(51, 65, 85);
  doc.text('Viaticos - Laurence Larsen', 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Pablo Perez y Regina Aguilar Rut: 219599720011', 20, 38, { align: 'left' });

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const today = new Date().toLocaleDateString('es-AR');
  doc.text(`Generado: ${today}`, 105, 28, { align: 'center' });

  doc.setDrawColor(51, 65, 85);
  doc.line(20, 32, 190, 32);

  let yPos = 50;
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  doc.setFont(undefined, 'bold');
  doc.text('Fecha', 20, yPos);
  doc.text('Tipo de Viaje', 50, yPos);
  doc.text('Tiempo', 110, yPos);
  doc.text('Costo', 160, yPos);

  yPos += HEADER_TO_FIRST_ROW_GAP;
  const headerSeparatorY = yPos - HEADER_SEPARATOR_OFFSET;
  doc.line(20, headerSeparatorY, 190, headerSeparatorY);
  doc.setFont(undefined, 'normal');

  const totalCost = entries.reduce((sum, entry) => sum + entry.cost, 0);
  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);

  entries.forEach((entry) => {
    const timeDisplay = formatDisplayTime(entry.hours);

    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    doc.text(entry.date, 20, yPos);
    doc.text(entry.tripType, 50, yPos);
    doc.text(timeDisplay, 110, yPos);
    doc.text(formatCurrency(entry.cost), 160, yPos);

    yPos += ROW_HEIGHT;
  });

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

  yPos += 15;
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Tarifa por hora: ${formatCurrency(HOURLY_RATE)}`, 105, yPos, { align: 'center' });

  return doc;
};

export const createPDFPreview = (entries) => {
  const doc = createPDFDocument(entries);
  if (!doc) return null;

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const fileName = `facturacion_${new Date().toISOString().split('T')[0]}.pdf`;

  return { url, fileName };
};

export const exportToPDF = (entries) => {
  const doc = createPDFDocument(entries);
  if (!doc) return;

  const fileName = `Viaticos_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};