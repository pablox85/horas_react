# Deploy en Vercel

## Configuracion

1. Crear un proyecto en Vercel apuntando a este directorio (`horasJSX`).
2. Definir las variables de entorno de `.env.example` en Production y Preview.
3. Verificar que Firebase Auth autorice el dominio de Vercel en Authentication > Settings.
4. Publicar `firestore.rules` en Firebase.

## Scripts

```bash
npm run build
npm run start
```

Vercel Analytics esta integrado en `app/layout.tsx` con `@vercel/analytics/next`.

## Seguridad de datos

La UI filtra todas las consultas por `tenantId` y las reglas de Firestore rechazan lecturas o escrituras cruzadas. El middleware protege rutas de aplicacion usando la cookie de sesion generada tras Firebase Auth; Firestore sigue siendo la barrera de autorizacion de datos.
