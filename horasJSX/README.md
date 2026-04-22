# Control de Horas

Aplicación React para llevar control de horas trabajadas, calcular costos de facturación y exportar reportes en PDF.

## Descripción

La app permite:

- cargar horas en modo manual o con timer;
- registrar fecha y tipo de viaje;
- calcular horas y costo automáticamente;
- visualizar el historial de entradas;
- exportar un PDF con el resumen;
- persistir datos en `localStorage` por defecto;
- usar Firestore si configurás las variables `VITE_FIREBASE_*`.

## Estructura

```
src/
├── components/
├── hooks/
├── services/
├── utils/
├── App.jsx
├── main.jsx
└── index.css
```

## Tecnologías

- React 18
- Vite
- Tailwind CSS
- Lucide React
- jsPDF
- Firebase Firestore opcional

## Instalación

Desde `horasJSX/`:

```bash
npm install
```

## Uso

```bash
npm run dev
```

Abrirá la app en `http://localhost:3000/` o en el puerto disponible que elijas.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

## Persistencia

Cuando no hay Firebase configurado, la app usa `localStorage` para:

- `billing-entries`
- `billing-totals`
- `horas_react_timer`

Si configurás Firebase, la misma interfaz guarda y lee desde Firestore.

## Servicios principales

- `storageService.js`: lectura y escritura de entradas y totales
- `calculationService.js`: cálculo de horas, costos y tarifa
- `pdfService.js`: exportación del reporte en PDF

## Componentes principales

- `Header.jsx`
- `InputSection.jsx`
- `EntriesList.jsx`
- `TotalSection.jsx`
- `NotificationSuccess.jsx`

## Notas

- El proyecto está pensado para funcionar aunque no haya credenciales de Firebase cargadas.
- La raíz del repositorio incluye scripts puente para ejecutar la app sin entrar manualmente a `horasJSX/`.
