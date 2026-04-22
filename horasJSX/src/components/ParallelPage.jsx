import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarRange,
  Download,
  FileText,
  RefreshCcw,
  Upload,
  X,
} from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const DATE_REGEX = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
const DATE_IN_TEXT_REGEX = /(\d{1,2}\/\d{1,2}\/\d{4})/g;

const parseDate = (value) => {
  if (!value || !DATE_REGEX.test(value.trim())) return null;
  const [day, month, year] = value.trim().split('/').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
};

const formatDate = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const fromISODate = (value) => {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

const normalizeMidnight = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const parseHoursFromDisplay = (text) => {
  if (!text) return 0;
  const hMatch = text.match(/(\d+)\s*h/i);
  const mMatch = text.match(/(\d+)\s*m/i);
  const h = hMatch ? Number(hMatch[1]) : 0;
  const m = mMatch ? Number(mMatch[1]) : 0;
  const total = h + m / 60;
  return Number.isFinite(total) ? total : 0;
};

const parseCostFromDisplay = (text) => {
  if (!text) return 0;
  const cleaned = text.replace(/[^\d,.-]/g, '').replace(',', '.');
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
};

const getDateItemsFromControlHorasPDF = async (pdfBytes) => {
  const loadingTask = getDocument({ data: pdfBytes });
  const pdf = await loadingTask.promise;
  const items = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    textContent.items.forEach((item) => {
      const rawText = item.str ?? '';
      const matches = [...rawText.matchAll(DATE_IN_TEXT_REGEX)];
      if (matches.length === 0) return;

      const baseX = item.transform?.[4] ?? 0;
      const y = item.transform?.[5] ?? 0;
      const itemWidth = item.width ?? 52;
      const itemHeight = item.height ?? 10;
      const safeCharWidth = rawText.length > 0 ? itemWidth / rawText.length : 6;

      matches.forEach((match) => {
        const dateText = match[1];
        const startIndex = match.index ?? 0;
        const x = baseX + safeCharWidth * startIndex;
        const dateWidth = Math.max(dateText.length * safeCharWidth, 52);

        items.push({
          pageNumber,
          text: dateText,
          x,
          y,
          width: dateWidth,
          height: itemHeight,
        });
      });
    });
  }

  return items;
};

const extractEntriesFromControlHorasPDF = async (pdfBytes) => {
  const loadingTask = getDocument({ data: pdfBytes });
  const pdf = await loadingTask.promise;
  const extracted = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const rowsMap = new Map();

    textContent.items.forEach((item) => {
      const text = String(item.str ?? '').trim();
      if (!text) return;

      const x = item.transform?.[4] ?? 0;
      const y = item.transform?.[5] ?? 0;
      const key = `${Math.round(y / 2) * 2}`;

      if (!rowsMap.has(key)) {
        rowsMap.set(key, []);
      }

      rowsMap.get(key).push({ text, x });
    });

    const rowKeys = [...rowsMap.keys()].map(Number).sort((a, b) => b - a);

    rowKeys.forEach((rowY) => {
      const cols = rowsMap.get(String(rowY)) || rowsMap.get(rowY) || [];
      if (cols.length === 0) return;

      const sortedCols = [...cols].sort((a, b) => a.x - b.x);

      const dateCol = sortedCols.find((c) => DATE_REGEX.test(c.text));
      if (!dateCol) return;

      const date = dateCol.text
        .split('/')
        .map((p) => p.padStart(2, '0'))
        .join('/');

      const tripText = sortedCols
        .filter((c) => c.x >= 45 && c.x < 110)
        .map((c) => c.text)
        .join(' ')
        .trim();

      const timeText = sortedCols
        .filter((c) => c.x >= 100 && c.x < 160)
        .map((c) => c.text)
        .join(' ')
        .trim();

      const costText = sortedCols
        .filter((c) => c.x >= 150)
        .map((c) => c.text)
        .join(' ')
        .trim();

      if (!tripText || !timeText) return;
      const hours = parseHoursFromDisplay(timeText);
      if (hours <= 0) return;

      extracted.push({
        id: `${pageNumber}-${rowY}-${date}-${tripText}`,
        date,
        tripType: tripText,
        hours,
        cost: parseCostFromDisplay(costText),
      });
    });
  }

  const seen = new Set();
  return extracted.filter((row) => {
    const key = `${row.date}|${row.tripType}|${row.hours.toFixed(2)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function ParallelPage({ darkMode, onBack, onImportEntries }) {
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfName, setPdfName] = useState('');
  const [pdfBytes, setPdfBytes] = useState(null);
  const [rangeStartISO, setRangeStartISO] = useState('');
  const [rangeEndISO, setRangeEndISO] = useState('');
  const [newStartISO, setNewStartISO] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUpdateMessage, setLastUpdateMessage] = useState('');
  const [detectedRows, setDetectedRows] = useState([]);

  const hasPDFLoaded = Boolean(pdfBytes && pdfUrl);

  const replacePreviewPDF = (nextBytes, fileName) => {
    const nextBlob = new Blob([nextBytes], { type: 'application/pdf' });
    const nextUrl = URL.createObjectURL(nextBlob);

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }

    setPdfBytes(nextBytes);
    setPdfUrl(nextUrl);
    if (fileName) setPdfName(fileName);
  };

  const detectRows = async (bytes) => {
    const rows = await extractEntriesFromControlHorasPDF(bytes);
    setDetectedRows(rows);
    if (rows.length > 0) {
      setLastUpdateMessage(`Filas detectadas para editar: ${rows.length}`);
    }
  };

  const handlePDFChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Selecciona un archivo PDF valido');
      return;
    }

    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);
    replacePreviewPDF(fileBytes, file.name);
    setLastUpdateMessage('');

    try {
      await detectRows(fileBytes);
    } catch (error) {
      console.error(error);
      setDetectedRows([]);
    }
  };

  const handleClearPDF = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    setPdfUrl('');
    setPdfName('');
    setPdfBytes(null);
    setRangeStartISO('');
    setRangeEndISO('');
    setNewStartISO('');
    setLastUpdateMessage('');
    setDetectedRows([]);
  };

  const handleApplyDateRangeChange = async () => {
    if (!hasPDFLoaded) {
      alert('Primero carga un PDF de Control de Horas');
      return;
    }

    if (!rangeStartISO || !rangeEndISO || !newStartISO) {
      alert('Completa fecha desde, fecha hasta y nuevo inicio');
      return;
    }

    const sourceStart = parseDate(fromISODate(rangeStartISO));
    const sourceEnd = parseDate(fromISODate(rangeEndISO));
    const targetStart = parseDate(fromISODate(newStartISO));

    if (!sourceStart || !sourceEnd || !targetStart) {
      alert('Hay fechas invalidas en el rango');
      return;
    }

    if (normalizeMidnight(sourceStart) > normalizeMidnight(sourceEnd)) {
      alert('La fecha desde no puede ser mayor que la fecha hasta');
      return;
    }

    setIsProcessing(true);
    setLastUpdateMessage('');

    try {
      const dateItems = await getDateItemsFromControlHorasPDF(pdfBytes);
      if (dateItems.length === 0) {
        alert('No pude detectar fechas de Control de Horas en el PDF');
        return;
      }

      const deltaDays = Math.round(
        (normalizeMidnight(targetStart) - normalizeMidnight(sourceStart)) /
          (1000 * 60 * 60 * 24)
      );

      const pdfDoc = await PDFDocument.load(pdfBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();

      let updatedCount = 0;
      const fromTs = normalizeMidnight(sourceStart);
      const toTs = normalizeMidnight(sourceEnd);

      dateItems.forEach((item) => {
        const parsed = parseDate(item.text);
        if (!parsed) return;

        const valueTs = normalizeMidnight(parsed);
        if (valueTs < fromTs || valueTs > toTs) return;

        const nextDate = new Date(parsed);
        nextDate.setDate(nextDate.getDate() + deltaDays);
        const nextLabel = formatDate(nextDate);

        const page = pages[item.pageNumber - 1];
        if (!page) return;

        page.drawRectangle({
          x: item.x - 1,
          y: item.y - 1,
          width: Math.max(item.width + 2, 55),
          height: Math.max(item.height + 2, 10),
          color: rgb(1, 1, 1),
        });

        page.drawText(nextLabel, {
          x: item.x,
          y: item.y,
          size: Math.max(item.height, 10),
          font,
          color: rgb(0, 0, 0),
        });

        updatedCount += 1;
      });

      if (updatedCount === 0) {
        alert('No encontre fechas dentro del rango indicado');
        return;
      }

      const editedBytes = await pdfDoc.save();
      replacePreviewPDF(editedBytes, pdfName);
      await detectRows(editedBytes);
      setLastUpdateMessage(`Fechas actualizadas: ${updatedCount}`);
    } catch (error) {
      console.error(error);
      alert('No pude procesar ese PDF. Proba con un PDF generado por Control de Horas.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadEditedPDF = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = pdfName ? `parallel_${pdfName}` : 'control_horas_editado.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDetectedRowChange = (id, field, value) => {
    setDetectedRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleImportToControl = async () => {
    if (detectedRows.length === 0) {
      alert('No hay filas detectadas para importar');
      return;
    }

    const cleaned = detectedRows
      .map((row) => ({
        date: row.date,
        tripType: String(row.tripType || '').trim(),
        hours: Number(row.hours),
      }))
      .filter((row) => parseDate(row.date) && row.tripType && row.hours > 0);

    if (cleaned.length === 0) {
      alert('No hay filas validas para importar');
      return;
    }

    await onImportEntries(cleaned);
  };

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  return (
    <div className="max-w-6xl mx-auto">
      <div
        className={`rounded-2xl p-8 mb-8 shadow-xl border transition-all duration-500 ${
          darkMode
            ? 'bg-slate-800/50 border-slate-700/50 backdrop-blur-xl'
            : 'bg-white/80 border-slate-200 backdrop-blur-sm'
        }`}
      >
        <div className="flex items-center justify-between mb-4 gap-3">
          <h1
            className={`text-3xl font-bold ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            Second Space
          </h1>
          <button
            onClick={onBack}
            className={`py-2 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 ${
              darkMode
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Control de Horas
          </button>
        </div>

        <p className={`${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          Carga un PDF, previsualiza, ajusta fechas y pasa sus filas a la web app
          para editar manualmente antes de importar.
        </p>

        <div
          className={`mt-6 rounded-xl border p-4 ${
            darkMode
              ? 'border-slate-700 bg-slate-900/40'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <label
              className={`cursor-pointer py-2 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 ${
                darkMode
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              Cargar PDF
              <input
                type="file"
                accept="application/pdf"
                onChange={handlePDFChange}
                className="hidden"
              />
            </label>

            {pdfName && (
              <div className="flex items-center gap-2">
                <FileText
                  className={`w-4 h-4 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}
                />
                <span
                  className={`text-sm ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  {pdfName}
                </span>
              </div>
            )}

            {hasPDFLoaded && (
              <>
                <button
                  onClick={handleDownloadEditedPDF}
                  className="py-2 px-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Download className="w-4 h-4" />
                  Descargar PDF
                </button>
                <button
                  onClick={handleClearPDF}
                  className={`py-2 px-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 ${
                    darkMode
                      ? 'bg-slate-700 hover:bg-slate-600 text-white'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                  }`}
                >
                  <X className="w-4 h-4" />
                  Limpiar
                </button>
              </>
            )}
          </div>

          {hasPDFLoaded && (
            <div
              className={`rounded-lg border p-4 mb-4 ${
                darkMode
                  ? 'border-slate-700 bg-slate-800/60'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <CalendarRange
                  className={`w-4 h-4 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}
                />
                <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Cambiar rango de fechas dentro del PDF
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="date"
                  value={rangeStartISO}
                  onChange={(e) => setRangeStartISO(e.target.value)}
                  className={`px-3 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <input
                  type="date"
                  value={rangeEndISO}
                  onChange={(e) => setRangeEndISO(e.target.value)}
                  className={`px-3 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <input
                  type="date"
                  value={newStartISO}
                  onChange={(e) => setNewStartISO(e.target.value)}
                  className={`px-3 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <button
                  onClick={handleApplyDateRangeChange}
                  disabled={isProcessing}
                  className={`py-2 px-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 ${
                    darkMode
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  <RefreshCcw className="w-4 h-4" />
                  {isProcessing ? 'Procesando...' : 'Cambiar Fechas'}
                </button>
              </div>
            </div>
          )}

          {detectedRows.length > 0 && (
            <div
              className={`rounded-lg border p-4 mb-4 ${
                darkMode
                  ? 'border-slate-700 bg-slate-800/60'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <p className={`text-sm mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Filas leidas del PDF. Puedes editarlas manualmente y luego importarlas.
              </p>

              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                      <th className="text-left pb-2">Fecha</th>
                      <th className="text-left pb-2">Tipo de viaje</th>
                      <th className="text-left pb-2">Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detectedRows.map((row) => (
                      <tr key={row.id}>
                        <td className="py-1 pr-2">
                          <input
                            type="text"
                            value={row.date}
                            onChange={(e) =>
                              handleDetectedRowChange(row.id, 'date', e.target.value)
                            }
                            className={`w-full px-2 py-1 rounded border ${
                              darkMode
                                ? 'bg-slate-700 border-slate-600 text-white'
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <input
                            type="text"
                            value={row.tripType}
                            onChange={(e) =>
                              handleDetectedRowChange(row.id, 'tripType', e.target.value)
                            }
                            className={`w-full px-2 py-1 rounded border ${
                              darkMode
                                ? 'bg-slate-700 border-slate-600 text-white'
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </td>
                        <td className="py-1">
                          <input
                            type="number"
                            min="0"
                            step="0.25"
                            value={row.hours}
                            onChange={(e) =>
                              handleDetectedRowChange(row.id, 'hours', e.target.value)
                            }
                            className={`w-full px-2 py-1 rounded border ${
                              darkMode
                                ? 'bg-slate-700 border-slate-600 text-white'
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3">
                <button
                  onClick={handleImportToControl}
                  className={`py-2 px-4 rounded-lg font-semibold transition-all duration-300 ${
                    darkMode
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  Importar a Control de Horas
                </button>
              </div>
            </div>
          )}

          {lastUpdateMessage && (
            <p className={`text-sm mb-3 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
              {lastUpdateMessage}
            </p>
          )}

          <div
            className={`h-[72vh] rounded-lg overflow-hidden border ${
              darkMode ? 'border-slate-700' : 'border-slate-200'
            }`}
          >
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                title="Vista previa PDF editado"
                className="w-full h-full"
              />
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Carga un PDF de Control de Horas para comenzar
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
