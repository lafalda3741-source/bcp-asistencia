# BCP Asistencia

Aplicación de control de asistencia de empleados. React + Vite + Tailwind +
Supabase (base de datos, autenticación por PIN y tiempo real), con soporte
PWA instalable.

## 1. Requisitos

- Node.js 18 o superior
- Una cuenta y proyecto en [Supabase](https://supabase.com)

## 2. Crear el proyecto en Supabase

1. Creá un proyecto nuevo en Supabase.
2. Andá a **SQL Editor** y ejecutá todo el contenido de `supabase/schema.sql`.
   Esto crea las tablas (`empleados`, `fichajes`, `justificaciones`,
   `configuracion`, `auditoria`), los índices, las políticas de RLS, las
   funciones de validación de PIN y carga datos de demostración.
3. Verificá en **Table Editor** que se hayan creado las tablas y que
   `configuracion` tenga una fila con `minutos_tolerancia = 10`.
4. Andá a **Project Settings → API** y copiá:
   - `Project URL`
   - `anon public key`

## 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Completá `.env` con tus datos de Supabase:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-publica
```

## 4. Instalar dependencias y ejecutar

```bash
npm install
npm run dev
```

La app queda disponible en `http://localhost:5173`.

- **Panel de administrador:** `http://localhost:5173/` — PIN inicial `1234`
  (cambialo desde Configuración apenas entres).
- **Vista de empleado:** `http://localhost:5173/empleado/{token_acceso}` —
  el enlace de cada empleado se genera automáticamente y se puede copiar o
  enviar por WhatsApp desde el panel (sección Empleados). El PIN de los
  empleados demo es `1234`.

## 5. Build de producción

```bash
npm run build
npm run preview
```

`vite-plugin-pwa` genera automáticamente el manifest, el service worker y el
cacheo offline durante el build. Los íconos ya están en `public/icons/`
(192×192, 512×512 y apple-touch-icon). Podés reemplazarlos por el logo
definitivo de tu empresa manteniendo los mismos nombres de archivo.

## 6. Seguridad de los PIN

- Los PIN **nunca** se guardan en texto plano: se hashean con `bcryptjs`
  antes de escribirse en `empleados.pin_hash` / `configuracion.pin_admin_hash`.
- La verificación de un PIN (login) se hace siempre a través de las
  funciones RPC de Postgres `validar_pin_empleado` y `validar_pin_admin`
  (`SECURITY DEFINER`), que jamás devuelven el hash al navegador.
- Row Level Security está habilitado en todas las tablas.

## 7. Estructura del proyecto

```
supabase/schema.sql        SQL completo (tablas, RLS, funciones, demo)
src/lib/                   Supabase client, auth, cálculos de horas,
                            días hábiles, geolocalización, export a Excel
src/components/admin/      Panel de administrador
src/components/employee/   Vista de fichaje del empleado (PWA mobile-first)
src/pages/                 AdminApp y EmployeeApp (enrutamiento)
```

## 8. Notas de negocio implementadas

- Tiempo neto = períodos trabajados menos pausas.
- El tiempo fichado antes del horario planificado no suma ni genera extras.
- Las horas extra sólo se cuentan después de la salida planificada.
- La tolerancia de minutos define si una entrada se considera puntual.
- Las justificaciones (vacaciones, licencia médica, feriado) no generan
  tiempo pendiente ese día.
- El reporte de Excel incluye colores (verde = extras, rojo/naranja =
  pendiente, gris/amarillo = justificación) y el enlace a Google Maps de
  cada fichaje es clicable.

## 9. Pendiente / a criterio del cliente

- Reemplazar los íconos placeholder por el isologo definitivo de la empresa.
- Configurar un dominio propio y HTTPS para que la geolocalización y el
  service worker funcionen correctamente en producción (los navegadores
  exigen HTTPS para `navigator.geolocation` fuera de `localhost`).
- Definir la política de retención de `auditoria` si se requiere.
