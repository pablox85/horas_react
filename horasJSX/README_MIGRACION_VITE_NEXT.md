# Migracion desde Vite

## Cambios principales

- `src/App.jsx` deja de ser el entrypoint activo.
- La navegacion pasa a `app/` con Next.js App Router.
- Los componentes nuevos viven en `components/`.
- La capa Firebase queda en `lib/firebase.ts`.
- Las operaciones de datos quedan centralizadas en `services/firestore-service.ts`.
- Los modelos tipados quedan en `types/models.ts`.

## Variables de entorno

Renombrar variables Vite:

```bash
VITE_FIREBASE_API_KEY              -> NEXT_PUBLIC_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN          -> NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID           -> NEXT_PUBLIC_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET       -> NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID  -> NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID               -> NEXT_PUBLIC_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID       -> NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
```

## Datos

La version Vite usaba entradas bajo colecciones por tenant y fallback local. La version SaaS usa colecciones planas con `tenantId` en cada documento:

- `companies`
- `employees`
- `hourRecords`
- `distanceTrips`

Los viajes por distancia guardan `kilometers`, `ratePerKm` y `cost`, donde
`cost = kilometers * ratePerKm`.

Para migrar datos existentes, crear documentos equivalentes con el `tenantId` del usuario o empresa correspondiente.
