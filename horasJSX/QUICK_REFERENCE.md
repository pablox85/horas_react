# Referencia Rápida - Estructura del Proyecto

## 📁 Árbol de Directorios Completo

```
horasJSX/
├── src/
│   ├── components/
│   │   ├── Header.jsx              # Encabezado principal
│   │   ├── InputSection.jsx        # Contenedor de inputs
│   │   ├── ManualInput.jsx         # Entrada manual de horas
│   │   ├── TimerInput.jsx          # Controles del timer
│   │   ├── TimerDisplay.jsx        # Display del cronómetro
│   │   ├── EntriesList.jsx         # Listado de entradas
│   │   ├── TotalSection.jsx        # Panel de totales
│   │   └── NotificationSuccess.jsx # Notificación flotante
│   │
│   ├── hooks/
│   │   └── useTimeManager.js       # Lógica de tiempo
│   │
│   ├── services/
│   │   ├── storageService.js       # LocalStorage
│   │   ├── calculationService.js   # Cálculos
│   │   └── pdfService.js           # PDF export
│   │
│   ├── utils/
│   │   └── formatters.js           # Funciones de formato
│   │
│   ├── App.jsx                     # Componente principal
│   ├── main.jsx                    # Punto de entrada
│   └── index.css                   # Estilos globales
│
├── node_modules/                   # Dependencias (generado)
├── dist/                           # Build (generado)
│
├── index.html                      # HTML principal
├── package.json                    # Dependencias y scripts
├── vite.config.js                  # Configuración de Vite
├── tailwind.config.js              # Configuración de Tailwind
├── postcss.config.js               # Configuración de PostCSS
├── .eslintrc.json                  # Configuración de ESLint
├── .gitignore                      # Archivos ignorados por git
│
├── README.md                       # Documentación principal
├── MIGRATION_GUIDE.md              # Guía de modularización
└── QUICK_REFERENCE.md              # Este archivo
```

## 🎯 Componentes Principales

| Archivo | Responsabilidad | Props Principales |
|---------|-----------------|-------------------|
| Header.jsx | Título y toggle tema | darkMode, onToggleTheme, hourlyRate |
| InputSection.jsx | Contenedor de inputs | mode, onModeChange, tripType, ... |
| ManualInput.jsx | Form manual | hours, minutes, onHoursChange, ... |
| TimerInput.jsx | Timer controls | timerSeconds, isTimerRunning, ... |
| EntriesList.jsx | Listado | entries, onDeleteEntry, darkMode |
| TotalSection.jsx | Totales | totalCost, totalHours, ... |
| NotificationSuccess.jsx | Notificación | show, darkMode |

## 🔧 Servicios Disponibles

### storageService
```javascript
import { loadEntries, saveEntries, loadTheme, saveTheme, clearEntries } from './services/storageService';

// Cargar
const entries = loadEntries();
const isDark = loadTheme();

// Guardar
saveEntries(newEntries);
saveTheme(true);

// Limpiar
clearEntries();
```

### calculationService
```javascript
import { 
  calculateTotalHours, 
  calculateCost, 
  calculateTotals, 
  getHourlyRate 
} from './services/calculationService';

// Usar
const hours = calculateTotalHours({ mode: 'manual', hours: 2, minutes: 30 });
const cost = calculateCost(2.5);
const { totalCost, totalHours } = calculateTotals(entries);
const rate = getHourlyRate(); // 625
```

### pdfService
```javascript
import { exportToPDF } from './services/pdfService';

// Usar
exportToPDF(entries); // Descarga automática
```

## 🛠️ Hooks Personalizados

### useTimeManager
```javascript
import { useTimeManager } from './hooks/useTimeManager';

const timeManager = useTimeManager();

// Crear entrada
const entry = timeManager.createEntry({
  tripType: 'Rendición',
  customTrip: '',
  date: '2024-01-29',
  mode: 'manual',
  hours: 2,
  minutes: 30,
  timerSeconds: 0
});

// Obtener valor de tipo de viaje
const tripValue = timeManager.getTripTypeValue('custom', 'Mi viaje');

// Resetear formulario
const reset = timeManager.getFormReset();
```

## 📋 Funciones de Formato

```javascript
import { 
  formatTime, 
  formatDisplayTime, 
  formatDateDisplay, 
  formatCurrency 
} from './utils/formatters';

// Usar
formatTime(3661);           // "01:01:01"
formatDisplayTime(2.5);     // "2h 30m"
formatDateDisplay('2024-01-29'); // "29/01/2024"
formatCurrency(1250);       // "$1250.00"
```

## 🎨 Patrones de Props

### Tema (darkMode)
Muchos componentes reciben `darkMode` para aplicar estilos condicionales:
```jsx
<Header darkMode={darkMode} />
<InputSection darkMode={darkMode} />
```

### Manejadores de Eventos
Los componentes no manejan lógica, solo llamar callbacks:
```jsx
<InputSection 
  onTripTypeChange={setTripType}
  onDateChange={setDate}
  onAddEntry={handleAddEntry}
  // ... otros callbacks
/>
```

### Datos
Todos los datos necesarios se pasan como props:
```jsx
<EntriesList 
  entries={entries}
  onDeleteEntry={handleDeleteEntry}
  darkMode={darkMode}
/>
```

## 🔄 Ciclo de Vida de una Entrada

```
1. Usuario selecciona tipo de viaje, fecha, modo
2. Usuario ingresa horas O inicia timer
3. Usuario hace clic en "Agregar/Guardar"
4. App.jsx llama handleAddEntry()
5. useTimeManager.createEntry() valida y crea
6. Si válido: se agrega a estado
7. Se guarda en localStorage (saveEntries)
8. Se muestra notificación
9. Se resetea formulario
```

## 💾 Estado Global (App.jsx)

```javascript
// Entradas y datos
const [entries, setEntries] = useState([]);

// Selecciones del usuario
const [tripType, setTripType] = useState('Rendición');
const [customTrip, setCustomTrip] = useState('');
const [date, setDate] = useState('');
const [mode, setMode] = useState('manual');

// Entrada manual
const [hours, setHours] = useState(0);
const [minutes, setMinutes] = useState(0);

// Timer
const [timerSeconds, setTimerSeconds] = useState(0);
const [isTimerRunning, setIsTimerRunning] = useState(false);

// UI
const [showSuccess, setShowSuccess] = useState(false);
const [darkMode, setDarkMode] = useState(true);
```

## 🚀 Scripts Disponibles

```bash
npm run dev       # Inicia servidor de desarrollo
npm run build     # Build para producción
npm run preview   # Preview del build
npm run lint      # Ejecuta ESLint
```

## 📦 Dependencias

```json
{
  "react": "^18.2.0",           // Framework
  "react-dom": "^18.2.0",       // DOM
  "lucide-react": "^0.263.1",   // Iconos
  "jspdf": "^2.5.1"             // PDF
}
```

## 🎯 Flujo Principal (App.jsx)

```
Inicialización (useEffect)
    ↓
Cargar entradas, tema
    ↓
Estado listo
    ↓
Usuario interactúa
    ↓
Manejador de evento en App.jsx
    ↓
Actualizar estado
    ↓
Persistir en localStorage
    ↓
Componentes se rerenderizado
    ↓
UI actualiza
```

## 🔐 Validaciones

Todas en `useTimeManager.createEntry()`:
- ✅ Tipo de viaje requerido
- ✅ Fecha requerida
- ✅ Horas/minutos válidos (manual)
- ✅ Timer iniciado (timer mode)

## 📊 Cálculos Principales

```javascript
// Total horas en decimal
totalHours = hours + (minutes / 60)

// Costo
cost = totalHours * 625 // tarifa

// Totales
totalCost = sum(entry.cost)
totalHours = sum(entry.hours)
```

## 🎨 Temas

Aplicación soporta:
- **Claro**: Gradientes claros, texto oscuro
- **Oscuro**: Gradientes oscuros, texto claro

Persistido en localStorage bajo clave `theme`.

## 📱 Breakpoints Tailwind

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

## 🐛 Debugging

Para debugging rápido:
```javascript
// En App.jsx
console.log('Entries:', entries);
console.log('State:', { tripType, date, mode, hours, minutes, timerSeconds });
```

## ⚡ Optimizaciones Posibles

1. Usar `useCallback` en App.jsx
2. Memoizar componentes con `React.memo`
3. Code splitting con `React.lazy`
4. Agregar Service Worker para offline
5. Comprimir assets

## 🚀 Deploy

```bash
# Build
npm run build

# Los archivos en /dist están listos para servir
# En Vercel, Netlify, o cualquier static host
```

## 📞 Soporte

Para dudas sobre:
- **Estructura**: Ver MIGRATION_GUIDE.md
- **Componentes**: Ver comentarios en cada archivo
- **Servicios**: Ver comentarios en services/
- **Hooks**: Ver comentarios en hooks/
