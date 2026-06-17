# Instalacion

## Requisitos

- Node.js 20 o superior.
- Proyecto Firebase con Authentication y Cloud Firestore habilitados.

## Pasos

1. Instalar dependencias:

```bash
npm install
```

2. Crear `.env.local` desde `.env.example` y completar las variables `NEXT_PUBLIC_FIREBASE_*`.

3. Activar proveedor Email/Password en Firebase Authentication.

4. Publicar reglas de Firestore usando `firestore.rules`.

5. Ejecutar en desarrollo:

```bash
npm run dev
```

La app corre por defecto en `http://localhost:3000`.

## Modo demo local

Si Firebase no esta configurado, se puede ingresar con:

```txt
demo@demo.com
demo1
```

Los datos se guardan en `localStorage` con el tenant `demo-local`.

## Modulos

- Horas trabajadas: carga manual o timer.
- Viajes por distancia: calcula `kilometros * precio por km`.
- Empleados.
- Empresas.
- Dashboard.

## Multi-tenant

Cada documento operativo contiene `tenantId`. La app resuelve el tenant con este orden:

1. Claim `tenantId` del usuario autenticado.
2. Fallback aislado `tenant-{uid}`.

Para SaaS productivo, asigna `tenantId` como custom claim desde un backend administrativo seguro.
