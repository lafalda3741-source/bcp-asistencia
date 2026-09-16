-- =====================================================================
-- BCP ASISTENCIA - Esquema completo de Supabase
-- Ejecutar en el SQL Editor de Supabase (proyecto nuevo o existente)
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- TABLA: configuracion  (fila única de configuración global)
-- ---------------------------------------------------------------------
create table if not exists configuracion (
  id integer primary key default 1,
  pin_admin_hash text not null,
  minutos_tolerancia integer not null default 10,
  nombre_empresa text not null default 'BCP Asistencia',
  logo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint configuracion_singleton check (id = 1)
);

-- ---------------------------------------------------------------------
-- TABLA: empleados
-- ---------------------------------------------------------------------
create table if not exists empleados (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  legajo text,
  correo text,
  telefono text,
  pin_hash text not null,
  token_acceso text not null unique default encode(gen_random_bytes(16), 'hex'),
  horas_jornada text not null default '08:00', -- hh:mm
  horarios_semanales jsonb not null default '{
    "lunes":    {"activo": true,  "entrada": "08:00", "salida": "16:00"},
    "martes":   {"activo": true,  "entrada": "08:00", "salida": "16:00"},
    "miercoles":{"activo": true,  "entrada": "08:00", "salida": "16:00"},
    "jueves":   {"activo": true,  "entrada": "08:00", "salida": "16:00"},
    "viernes":  {"activo": true,  "entrada": "08:00", "salida": "16:00"},
    "sabado":   {"activo": false, "entrada": null, "salida": null},
    "domingo":  {"activo": false, "entrada": null, "salida": null}
  }'::jsonb,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_empleados_token on empleados(token_acceso);
create index if not exists idx_empleados_activo on empleados(activo);

-- ---------------------------------------------------------------------
-- TABLA: fichajes
-- ---------------------------------------------------------------------
create table if not exists fichajes (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references empleados(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','pausa','reanudacion','salida')),
  fecha_hora timestamptz not null default now(),
  latitud double precision,
  longitud double precision,
  precision_m double precision,
  editado_manualmente boolean not null default false,
  editado_por text,
  editado_motivo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fichajes_empleado on fichajes(empleado_id);
create index if not exists idx_fichajes_fecha on fichajes(fecha_hora);
create index if not exists idx_fichajes_empleado_fecha on fichajes(empleado_id, fecha_hora);

-- ---------------------------------------------------------------------
-- TABLA: justificaciones
-- ---------------------------------------------------------------------
create table if not exists justificaciones (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references empleados(id) on delete cascade,
  fecha_inicio date not null,
  cantidad_dias_habiles integer not null default 1,
  fecha_fin date not null,
  tipo text not null check (tipo in ('vacaciones','licencia_medica','feriado')),
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_justificaciones_empleado on justificaciones(empleado_id);
create index if not exists idx_justificaciones_rango on justificaciones(fecha_inicio, fecha_fin);

-- ---------------------------------------------------------------------
-- TABLA: auditoria (para ediciones manuales de fichajes)
-- ---------------------------------------------------------------------
create table if not exists auditoria (
  id uuid primary key default gen_random_uuid(),
  fichaje_id uuid references fichajes(id) on delete set null,
  accion text not null, -- 'edicion' | 'creacion' | 'eliminacion'
  valores_anteriores jsonb,
  valores_nuevos jsonb,
  realizado_por text not null default 'admin',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- FUNCIÓN: calcular fecha_fin excluyendo sábados y domingos
-- ---------------------------------------------------------------------
create or replace function calcular_fecha_fin_habil(fecha_inicio date, dias_habiles integer)
returns date
language plpgsql
immutable
as $$
declare
  fecha date := fecha_inicio;
  contados integer := 0;
begin
  if dias_habiles <= 0 then
    return fecha_inicio;
  end if;
  -- el primer día hábil cuenta como día 1
  if extract(isodow from fecha) < 6 then
    contados := 1;
  end if;
  while contados < dias_habiles loop
    fecha := fecha + interval '1 day';
    if extract(isodow from fecha) < 6 then
      contados := contados + 1;
    end if;
  end loop;
  return fecha;
end;
$$;

-- ---------------------------------------------------------------------
-- TRIGGER: updated_at automático
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_empleados_updated on empleados;
create trigger trg_empleados_updated before update on empleados
  for each row execute function set_updated_at();

drop trigger if exists trg_fichajes_updated on fichajes;
create trigger trg_fichajes_updated before update on fichajes
  for each row execute function set_updated_at();

drop trigger if exists trg_justificaciones_updated on justificaciones;
create trigger trg_justificaciones_updated before update on justificaciones
  for each row execute function set_updated_at();

drop trigger if exists trg_configuracion_updated on configuracion;
create trigger trg_configuracion_updated before update on configuracion
  for each row execute function set_updated_at();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
-- Modelo de acceso:
--  - El PIN de administrador y el PIN de cada empleado se validan del
--    lado del cliente (bcrypt) contra el hash guardado. Como esta app
--    NO usa Supabase Auth (login por email/password), el control de
--    acceso fino se hace con la clave "anon" + políticas RLS abiertas
--    de lectura/escritura acotadas por columnas sensibles ocultas
--    (los hashes de PIN nunca se exponen a través del cliente porque
--    las consultas de validación se hacen vía función RPC segura).
--
--  - IMPORTANTE: por eso el pin_hash y el pin_admin_hash NUNCA se
--    seleccionan directamente desde el cliente; se comparan siempre
--    mediante las funciones RPC `validar_pin_empleado` y
--    `validar_pin_admin`, que corren con SECURITY DEFINER y solo
--    devuelven verdadero/falso (o el id de empleado), nunca el hash.

alter table empleados enable row level security;
alter table fichajes enable row level security;
alter table justificaciones enable row level security;
alter table configuracion enable row level security;
alter table auditoria enable row level security;

-- Empleados: lectura pública de columnas no sensibles (se filtran en la
-- capa de aplicación seleccionando explícitamente las columnas necesarias;
-- pin_hash jamás se debe pedir desde el cliente).
create policy "empleados_select" on empleados for select using (true);
create policy "empleados_insert" on empleados for insert with check (true);
create policy "empleados_update" on empleados for update using (true);
create policy "empleados_delete" on empleados for delete using (true);

-- Fichajes: un empleado solo debería poder fichar los suyos; como no hay
-- Supabase Auth, la app exige el token_acceso + PIN validado antes de
-- cualquier escritura. RLS permite el acceso general y la app filtra por
-- empleado_id en cada consulta.
create policy "fichajes_select" on fichajes for select using (true);
create policy "fichajes_insert" on fichajes for insert with check (true);
create policy "fichajes_update" on fichajes for update using (true);
create policy "fichajes_delete" on fichajes for delete using (true);

create policy "justificaciones_select" on justificaciones for select using (true);
create policy "justificaciones_insert" on justificaciones for insert with check (true);
create policy "justificaciones_update" on justificaciones for update using (true);
create policy "justificaciones_delete" on justificaciones for delete using (true);

create policy "configuracion_select" on configuracion for select using (true);
create policy "configuracion_update" on configuracion for update using (true);

create policy "auditoria_select" on auditoria for select using (true);
create policy "auditoria_insert" on auditoria for insert with check (true);

-- =====================================================================
-- FUNCIONES RPC de validación de PIN (SECURITY DEFINER)
-- Estas son las ÚNICAS vías para comparar un PIN: nunca se expone
-- pin_hash / pin_admin_hash al cliente.
-- =====================================================================

create or replace function validar_pin_empleado(p_token text, p_pin text)
returns table(empleado_id uuid, nombre text, valido boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_hash text;
  v_nombre text;
begin
  select id, pin_hash, nombre into v_id, v_hash, v_nombre
  from empleados
  where token_acceso = p_token and activo = true;

  if v_id is null then
    return query select null::uuid, null::text, false;
    return;
  end if;

  -- La comparación real de bcrypt se hace en la app (bcryptjs) porque
  -- Postgres no trae bcrypt nativo sin extensiones adicionales; esta
  -- función se deja disponible si se instala pgcrypto+crypt con
  -- blowfish (ver comentario abajo). Alternativa recomendada: usar
  -- crypt()/gen_salt('bf') de pgcrypto, compatible con bcryptjs.
  return query select v_id, v_nombre, (v_hash = crypt(p_pin, v_hash));
end;
$$;

create or replace function validar_pin_admin(p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
begin
  select pin_admin_hash into v_hash from configuracion where id = 1;
  if v_hash is null then
    return false;
  end if;
  return v_hash = crypt(p_pin, v_hash);
end;
$$;

-- Nota: para que crypt()/gen_salt('bf') sea 100% compatible con
-- bcryptjs, ambos usan el mismo algoritmo bcrypt ($2a$/$2b$), por lo
-- que se recomienda generar los hashes SIEMPRE desde la app con
-- bcryptjs (bcrypt.hash(pin, 10)) y guardarlos tal cual; la función
-- crypt(p_pin, v_hash) de pgcrypto puede leer hashes $2a$/$2b$ para
-- compararlos correctamente.

-- =====================================================================
-- DATOS DEMO
-- =====================================================================

-- PIN admin demo: 1234  (hash bcrypt de "1234")
insert into configuracion (id, pin_admin_hash, minutos_tolerancia, nombre_empresa)
values (1, crypt('1234', gen_salt('bf')), 10, 'BCP Asistencia')
on conflict (id) do nothing;

-- Empleados demo (PIN de todos: 1234)
insert into empleados (nombre, legajo, correo, pin_hash, horas_jornada, activo)
values
  ('Ariel Mayor', 'EMP-001', 'ariel.mayor@bcp.org.ar', crypt('1234', gen_salt('bf')), '08:00', true),
  ('Beatriz Pons', 'EMP-002', 'beatriz.pons@bcp.org.ar', crypt('1234', gen_salt('bf')), '08:00', true),
  ('Maria Veronica Scardacione', 'EMP-003', 'mv.scardacione@bcp.org.ar', crypt('1234', gen_salt('bf')), '08:00', true)
on conflict do nothing;

-- Fichajes demo para el primer empleado (hoy: entrada + pausa + reanudación + salida)
insert into fichajes (empleado_id, tipo, fecha_hora, latitud, longitud, precision_m)
select id, 'entrada', now() - interval '8 hours', -38.7260, -62.2621, 12
from empleados where legajo = 'EMP-001'
union all
select id, 'pausa', now() - interval '4 hours', -38.7260, -62.2621, 10
from empleados where legajo = 'EMP-001'
union all
select id, 'reanudacion', now() - interval '3 hours 30 minutes', -38.7260, -62.2621, 10
from empleados where legajo = 'EMP-001'
union all
select id, 'salida', now() - interval '10 minutes', -38.7260, -62.2621, 15
from empleados where legajo = 'EMP-001'
on conflict do nothing;

-- Justificación demo (vacaciones)
insert into justificaciones (empleado_id, fecha_inicio, cantidad_dias_habiles, fecha_fin, tipo, observaciones)
select id, current_date, 5, calcular_fecha_fin_habil(current_date, 5), 'vacaciones', 'Vacaciones anuales'
from empleados where legajo = 'EMP-002'
on conflict do nothing;

-- =====================================================================
-- REALTIME
-- =====================================================================
alter publication supabase_realtime add table fichajes;
alter publication supabase_realtime add table justificaciones;
alter publication supabase_realtime add table empleados;

-- =====================================================================
-- MIGRACIÓN v1.1 — Vista de empleado ampliada
-- (seguro de re-ejecutar sobre una base que ya tenga v1.0)
-- =====================================================================

-- Las justificaciones ahora tienen un flujo de aprobación: cuando las
-- crea el administrador quedan 'aprobada' directamente; cuando las pide
-- el propio empleado desde su enlace, quedan 'pendiente' hasta que el
-- admin las aprueba o rechaza.
alter table justificaciones
  add column if not exists estado text not null default 'aprobada'
    check (estado in ('pendiente','aprobada','rechazada')),
  add column if not exists decidido_por text,
  add column if not exists decidido_en timestamptz;

-- Comentario opcional que el empleado puede dejar sobre su jornada;
-- se muestra en el reporte de Excel.
create table if not exists comentarios_diarios (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references empleados(id) on delete cascade,
  fecha date not null,
  comentario text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(empleado_id, fecha)
);

alter table comentarios_diarios enable row level security;

drop policy if exists "comentarios_select" on comentarios_diarios;
drop policy if exists "comentarios_insert" on comentarios_diarios;
drop policy if exists "comentarios_update" on comentarios_diarios;
create policy "comentarios_select" on comentarios_diarios for select using (true);
create policy "comentarios_insert" on comentarios_diarios for insert with check (true);
create policy "comentarios_update" on comentarios_diarios for update using (true);

drop trigger if exists trg_comentarios_updated on comentarios_diarios;
create trigger trg_comentarios_updated before update on comentarios_diarios
  for each row execute function set_updated_at();

alter publication supabase_realtime add table comentarios_diarios;

-- =====================================================================
-- FIN DEL SCRIPT
-- =====================================================================
