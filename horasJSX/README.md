# Control de Horas - Aplicación de Facturación

## 📋 Descripción

Aplicación React para llevar control de horas trabajadas y calcular costos de facturación. Incluye modo manual, timer en tiempo real, modo oscuro/claro, y exportación a PDF.

## 🏗️ Estructura del Proyecto

```
src/
├── components/           # Componentes reutilizables
│   ├── Header.jsx       # Encabezado con título y toggle de tema
│   ├── InputSection.jsx # Sección principal de entrada de datos
│   ├── ManualInput.jsx  # Formulario de entrada manual
│   ├── TimerInput.jsx   # Controles del cronómetro
│   ├── TimerDisplay.jsx # Pantalla del timer
│   ├── EntriesList.jsx  # Listado de entradas registradas
│   ├── TotalSection.jsx # Totales y botones de acción
│   └── NotificationSuccess.jsx # Notificación de éxito
│
├── hooks/               # Hooks personalizados
│   └── useTimeManager.js # Lógica de gestión de tiempo y validaciones
│
├── services/            # Servicios y lógica de negocio
│   ├── storageService.js # Persistencia con localStorage
│   ├── calculationService.js # Cálculos de horas y costos
│   └── pdfService.js    # Generación de PDFs
│
├── utils/               # Funciones utilitarias
│   └── formatters.js    # Funciones de formato (tiempo, moneda, etc)
│
├── App.jsx              # Componente principal (orquestador)
├── main.jsx             # Punto de entrada de la aplicación
└── index.css            # Estilos globales
```

## 🚀 Características

- ✅ **Entrada Manual**: Ingresa horas y minutos directamente
- ⏱️ **Timer**: Cronómetro en tiempo real con play/pause
- 📅 **Gestión de Fechas**: Selecciona la fecha de cada entrada
- 💰 **Cálculo Automático**: Calcula costos basado en tarifa por hora
- 📊 **Historial**: Visualiza todas tus entradas registradas
- 💾 **Persistencia**: Guarda datos en localStorage
- 🌙 **Modo Oscuro**: Toggle entre tema claro y oscuro
- 📄 **Exportación PDF**: Genera reportes profesionales
- 📱 **Responsive**: Funciona en dispositivos móviles y desktop

## 🔧 Tecnologías

- **React 18+** - Framework UI
- **Tailwind CSS** - Estilos
- **Lucide React** - Iconos
- **jsPDF** - Generación de PDFs

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Instalar dependencia de jsPDF si no está incluida
npm install jspdf
```

## 🚀 Uso

### Modo Manual
1. Selecciona el tipo de viaje (Rendición, Visita u Otro)
2. Selecciona la fecha
3. Cambia a modo "Manual"
4. Ingresa horas y minutos
5. Haz clic en "Agregar Entrada"

### Modo Timer
1. Selecciona el tipo de viaje y fecha
2. Cambia a modo "Timer"
3. Haz clic en "Iniciar Timer"
4. El cronómetro se ejecutará en tiempo real
5. Haz clic en "Detener Timer" cuando termines
6. Haz clic en "Guardar Entrada"

### Exportar a PDF
- Haz clic en "Exportar PDF" para descargar un reporte profesional

### Resetear
- Haz clic en "Resetear" para limpiar todas las entradas (requiere confirmación)

## 📝 Componentes

### Header
Encabezado principal con título, icono y toggle de tema oscuro/claro.

### InputSection
Sección que contiene:
- Selector de tipo de viaje
- Campo de fecha
- Selector de modo (Manual/Timer)
- Input condicional según el modo seleccionado

### ManualInput
Formulario para entrada de horas y minutos manualmente.

### TimerInput
Controles del cronómetro (Play, Pause, Save).

### EntriesList
Muestra un listado de todas las entradas con opción de eliminar cada una.

### TotalSection
Muestra totales mensuales y botones de exportación/reseteo.

## 🔌 Servicios

### storageService
- `loadEntries()` - Carga entradas desde localStorage
- `saveEntries(entries)` - Guarda entradas en localStorage
- `loadTheme()` - Carga preferencia de tema
- `saveTheme(isDarkMode)` - Guarda preferencia de tema
- `clearEntries()` - Limpia todas las entradas

### calculationService
- `calculateTotalHours(params)` - Calcula horas totales
- `calculateCost(hours)` - Calcula costo basado en horas
- `calculateTotals(entries)` - Calcula totales de un array
- `getHourlyRate()` - Obtiene la tarifa por hora

### pdfService
- `exportToPDF(entries)` - Genera y descarga PDF con entradas

## 🛠️ Utils

### formatters
- `formatTime(seconds)` - Formatea segundos a HH:MM:SS
- `formatDisplayTime(hours)` - Formatea horas a "Xh Ym"
- `formatDateDisplay(dateString)` - Formatea fecha a DD/MM/YYYY
- `formatCurrency(amount)` - Formatea dinero con $

## 🎨 Estilos

La aplicación utiliza Tailwind CSS para todos los estilos. Los temas oscuro/claro se aplican dinámicamente mediante clases condicionales basadas en el estado `darkMode`.

## 💾 LocalStorage

La aplicación persiste:
- **billing-entries**: Array de todas las entradas registradas
- **theme**: Preferencia de modo oscuro ('dark' o 'light')

## 📱 Responsive

La aplicación es completamente responsive y se adapta a:
- Dispositivos móviles (320px+)
- Tablets (768px+)
- Desktops (1024px+)

## 🔄 Ciclo de Vida

1. **Inicialización**: Carga entradas y preferencia de tema
2. **Timer**: Maneja incremento cada segundo cuando está activo
3. **Persistencia**: Guarda tema cuando cambia
4. **Limpieza**: Limpia intervalos al desmontar

## 🐛 Posibles Mejoras

- Agregar validación de entrada más robusta
- Implementar categorías de gastos
- Agregar reportes estadísticos
- Sincronización con base de datos
- Exportación a Excel/CSV
- Multi-idioma (i18n)

## 📄 Licencia

MIT
