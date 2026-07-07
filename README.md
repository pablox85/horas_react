# Control de Viajes

Aplicacion Next.js para gestionar empresas, empleados, horas trabajadas y viajes por distancia con Firebase Auth, Firestore y despliegue en Vercel.

## Arranque rapido

```bash
npm install
npm run dev
```

La aplicacion vive en `horasJSX/`, pero los scripts de la raiz usan npm workspaces.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run typecheck`

## Estructura vigente

- `horasJSX/app/`: rutas Next.js App Router.
- `horasJSX/components/`: componentes compartidos.
- `horasJSX/hooks/`: hooks de auth, tema y perfil.
- `horasJSX/lib/`: Firebase, tenant y formatters.
- `horasJSX/services/`: Firestore, calculos y PDF.
- `horasJSX/types/`: modelos TypeScript.

## Configuracion

Usar variables `NEXT_PUBLIC_FIREBASE_*` en `horasJSX/.env.local` para desarrollo local y en Vercel para produccion.

Para ingresar con cuenta demo
Email: demo@demo.com
Pwsd: demo1234
