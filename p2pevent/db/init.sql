-- ═══════════════════════════════════════════════════════════════════════
--  CityPulse — Alcance reducido
--  Script de inicialización: esquema + datos de prueba
--  PostgreSQL 14 o superior
-- ═══════════════════════════════════════════════════════════════════════
--
--  USO
--  ───
--  A) Si TypeORM tiene synchronize: true  (lo normal en desarrollo)
--     Las tablas las crea la aplicación al arrancar.
--     → Ejecuta SOLO la PARTE 2 (datos de prueba).
--
--  B) Si prefieres crear el esquema desde aquí (synchronize: false)
--     → Ejecuta el archivo completo.
--
--  Desde Docker:
--     docker compose exec -T db psql -U postgres -d citypulse_db < db/init.sql
--
--  CONTRASEÑAS DE PRUEBA (hash bcrypt, coste 10)
--     admin@citypulse.co    → Admin123*
--     teatro@citypulse.co   → Owner123*
--     museo@citypulse.co    → Owner123*
--     ana / bruno / carla / diego @citypulse.co → User123*
-- ═══════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════
--  PARTE 1 — ESQUEMA
-- ═══════════════════════════════════════════════════════════════════════

-- Borrado en orden inverso a las dependencias
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS invitation CASCADE;
DROP TABLE IF EXISTS friendship CASCADE;
DROP TABLE IF EXISTS evidence   CASCADE;
DROP TABLE IF EXISTS event      CASCADE;
DROP TABLE IF EXISTS venue      CASCADE;
DROP TABLE IF EXISTS users      CASCADE;
DROP TABLE IF EXISTS zone       CASCADE;

DROP TYPE IF EXISTS user_role          CASCADE;
DROP TYPE IF EXISTS event_origin       CASCADE;
DROP TYPE IF EXISTS event_status       CASCADE;
DROP TYPE IF EXISTS event_visibility   CASCADE;
DROP TYPE IF EXISTS evidence_type      CASCADE;
DROP TYPE IF EXISTS friendship_status  CASCADE;
DROP TYPE IF EXISTS invitation_status  CASCADE;
DROP TYPE IF EXISTS attendance_status  CASCADE;


-- ─── Enumeraciones ────────────────────────────────────────────────────
-- Se usan ENUM y no tablas de catálogo: son valores fijos del dominio
-- y evitan un JOIN en cada consulta.

CREATE TYPE user_role         AS ENUM ('USER', 'OWNER', 'ADMIN');
CREATE TYPE event_origin      AS ENUM ('REPORTE_USUARIO', 'OFICIAL');
CREATE TYPE event_status      AS ENUM ('REPORTADO', 'CONFIRMADO', 'RECHAZADO', 'CANCELADO');
CREATE TYPE event_visibility  AS ENUM ('PUBLICO', 'PRIVADO');
CREATE TYPE evidence_type     AS ENUM ('FOTO', 'ENLACE', 'DOCUMENTO');
CREATE TYPE friendship_status AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA');
CREATE TYPE invitation_status AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA');
CREATE TYPE attendance_status AS ENUM ('ASISTIRE', 'QUIZAS', 'NO_ASISTIRE');


-- ─── zone ─────────────────────────────────────────────────────────────
-- Zonas del territorio. Auto-relación: una zona contiene sub-zonas.

CREATE TABLE zone (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(120) NOT NULL UNIQUE,
  description    VARCHAR(255),
  parent_zone_id INTEGER REFERENCES zone(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─── users ────────────────────────────────────────────────────────────
-- NOTA: "users" en plural NO es palabra reservada en PostgreSQL
-- (solo lo es "user" en singular), así que no necesita comillas.

CREATE TABLE users (
  id                  SERIAL PRIMARY KEY,
  email               VARCHAR(160) NOT NULL UNIQUE,
  username            VARCHAR(60)  NOT NULL UNIQUE,
  full_name           VARCHAR(120) NOT NULL,
  password_hash       VARCHAR(255) NOT NULL,
  role                user_role    NOT NULL DEFAULT 'USER',
  zone_id             INTEGER      REFERENCES zone(id) ON DELETE SET NULL,

  -- 2FA por TOTP. El secreto NUNCA se devuelve en una respuesta.
  two_factor_secret   VARCHAR(255),
  two_factor_enabled  BOOLEAN      NOT NULL DEFAULT FALSE,

  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ                                -- borrado lógico
);

CREATE INDEX idx_users_role ON users(role);


-- ─── venue ────────────────────────────────────────────────────────────
-- Lugar u organización. Su dueño es un usuario con rol OWNER.

CREATE TABLE venue (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  description VARCHAR(255),
  address     VARCHAR(200),
  zone_id     INTEGER NOT NULL REFERENCES zone(id)  ON DELETE RESTRICT,
  owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,        -- lo marca un ADMIN
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_venue_name_zone UNIQUE (name, zone_id)
);

CREATE INDEX idx_venue_owner ON venue(owner_id);


-- ─── event ────────────────────────────────────────────────────────────
-- LA TABLA CENTRAL. Contiene los DOS tipos de evento.
--   origin = de dónde vino   (no cambia nunca)
--   status = en qué estado está (cambia con la revisión)

CREATE TABLE event (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(150) NOT NULL,
  description      TEXT,

  start_date       TIMESTAMPTZ NOT NULL,
  end_date         TIMESTAMPTZ NOT NULL,

  zone_id          INTEGER NOT NULL REFERENCES zone(id)  ON DELETE RESTRICT,
  venue_id         INTEGER          REFERENCES venue(id) ON DELETE SET NULL,
  address_text     VARCHAR(255),          -- dirección libre si no hay venue

  origin           event_origin     NOT NULL,
  status           event_status     NOT NULL DEFAULT 'REPORTADO',
  visibility       event_visibility NOT NULL DEFAULT 'PUBLICO',

  capacity         INTEGER,
  ticket_price     NUMERIC(10,2),

  created_by_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  verified_by_id   INTEGER          REFERENCES users(id) ON DELETE SET NULL,
  verified_at      TIMESTAMPTZ,
  rejection_reason VARCHAR(255),

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ,

  CONSTRAINT ck_event_dates    CHECK (end_date > start_date),
  CONSTRAINT ck_event_capacity CHECK (capacity IS NULL OR capacity > 0),
  CONSTRAINT ck_event_price    CHECK (ticket_price IS NULL OR ticket_price >= 0),

  -- Un evento revisado tiene que tener revisor
  CONSTRAINT ck_event_revisado CHECK (
    status NOT IN ('CONFIRMADO','RECHAZADO') OR verified_by_id IS NOT NULL
  ),
  -- Al rechazar hay que decir por qué
  CONSTRAINT ck_event_motivo   CHECK (
    status <> 'RECHAZADO' OR rejection_reason IS NOT NULL
  ),
  -- Un evento oficial tiene que tener lugar
  CONSTRAINT ck_event_oficial  CHECK (origin <> 'OFICIAL' OR venue_id IS NOT NULL),
  -- Solo los eventos de un lugar pueden ser privados
  CONSTRAINT ck_event_privado  CHECK (visibility <> 'PRIVADO' OR venue_id IS NOT NULL)
);

CREATE INDEX idx_event_zone   ON event(zone_id)    WHERE deleted_at IS NULL;
CREATE INDEX idx_event_status ON event(status);
CREATE INDEX idx_event_start  ON event(start_date);
CREATE INDEX idx_event_author ON event(created_by_id);


-- ─── evidence ─────────────────────────────────────────────────────────
-- Pruebas de autenticidad de un reporte. Sin evento no tienen sentido.

CREATE TABLE evidence (
  id             SERIAL PRIMARY KEY,
  event_id       UUID          NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  type           evidence_type NOT NULL,
  url            VARCHAR(500)  NOT NULL,
  caption        VARCHAR(255),
  uploaded_by_id INTEGER       NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_event ON evidence(event_id);


-- ─── friendship ───────────────────────────────────────────────────────
-- Orden canónico user_a_id < user_b_id: la amistad entre 3 y 7 se guarda
-- siempre como (3,7). Así el UNIQUE impide de verdad los duplicados.
-- Pero ese orden pierde quién la pidió: por eso requested_by_user_id.

CREATE TABLE friendship (
  id                   SERIAL PRIMARY KEY,
  user_a_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status               friendship_status NOT NULL DEFAULT 'PENDIENTE',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at         TIMESTAMPTZ,

  CONSTRAINT ck_friend_orden CHECK (user_a_id < user_b_id),
  CONSTRAINT uq_friend_par   UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX idx_friend_status ON friendship(status);


-- ─── invitation ───────────────────────────────────────────────────────

CREATE TABLE invitation (
  id           SERIAL PRIMARY KEY,
  event_id     UUID    NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message      VARCHAR(255),
  status       invitation_status NOT NULL DEFAULT 'PENDIENTE',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,

  CONSTRAINT ck_inv_distintos CHECK (from_user_id <> to_user_id),
  CONSTRAINT uq_inv_unica     UNIQUE (event_id, from_user_id, to_user_id)
);

CREATE INDEX idx_inv_destinatario ON invitation(to_user_id, status);


-- ─── attendance ───────────────────────────────────────────────────────
-- Una sola respuesta por usuario y evento.

CREATE TABLE attendance (
  id           SERIAL PRIMARY KEY,
  event_id     UUID    NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       attendance_status NOT NULL DEFAULT 'ASISTIRE',
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_attendance UNIQUE (event_id, user_id)
);

CREATE INDEX idx_attendance_event ON attendance(event_id);


-- ═══════════════════════════════════════════════════════════════════════
--  PARTE 2 — DATOS DE PRUEBA
--  (si TypeORM crea las tablas, ejecuta solo desde aquí)
-- ═══════════════════════════════════════════════════════════════════════

TRUNCATE attendance, invitation, friendship, evidence, event, venue, users, zone
  RESTART IDENTITY CASCADE;


-- ─── Zonas ────────────────────────────────────────────────────────────
INSERT INTO zone (name, description, parent_zone_id) VALUES
  ('Cali',             'Territorio principal', NULL),   -- 1
  ('Centro Histórico', 'Comuna 3',                1),   -- 2
  ('San Antonio',      'Barrio turístico',        1),   -- 3
  ('Granada',          'Zona gastronómica',       1);   -- 4


-- ─── Usuarios ─────────────────────────────────────────────────────────
INSERT INTO users (email, username, full_name, password_hash, role, zone_id) VALUES
  ('admin@citypulse.co',  'admin',  'Admin CityPulse',
   '$2b$10$f6SEDDKxuh0yEMkfBPMxd.nr0yYlNtrLLrU5qQoiiJQGpfCyw16LC', 'ADMIN', 1),
  ('teatro@citypulse.co', 'teatro', 'Teatro Municipal',
   '$2b$10$Mc7goeCHm1KaV1bEQrEwnulI94BHOz5WbCn40r1bpklYqAT3sHo8O', 'OWNER', 2),
  ('museo@citypulse.co',  'museo',  'Museo La Tertulia',
   '$2b$10$SzJHWb6iVJ2FFNjgXRxjD.cPGnRu3g3vi2QMWiVcYV/0VlKPv.BIe', 'OWNER', 3),
  ('ana@citypulse.co',    'ana',    'Ana Gómez',
   '$2b$10$CoiUcYqDiNAynar9qk04yuDOTIHhgdbk8j/hxUOhPDmyRSVAh3bha', 'USER',  2),
  ('bruno@citypulse.co',  'bruno',  'Bruno Díaz',
   '$2b$10$n4HleU2kN.37EFvRDvGOU.zF89F6m0AwfHYNLdUzbgLzSm20nBHy6', 'USER',  2),
  ('carla@citypulse.co',  'carla',  'Carla Ruiz',
   '$2b$10$kEBG/fQTAv0pKmbRFK5pEusakKNsdfwfVnZITsohvkHJEajQAb5Zu', 'USER',  3),
  ('diego@citypulse.co',  'diego',  'Diego Mora',
   '$2b$10$wsHlQ7Tg2RHPa/VccUjD4ODvlv2vPLwM3IslLywUcc6219zQlaVDK', 'USER',  4);
-- ids: 1 admin · 2 teatro · 3 museo · 4 ana · 5 bruno · 6 carla · 7 diego


-- ─── Lugares ──────────────────────────────────────────────────────────
INSERT INTO venue (name, description, address, zone_id, owner_id, is_verified) VALUES
  ('Teatro Municipal Enrique Buenaventura', 'Teatro de la ciudad',
   'Cra 5 # 6-64', 2, 2, TRUE),                                    -- 1
  ('Museo La Tertulia', 'Museo de arte moderno',
   'Av Colombia # 5-105', 3, 3, TRUE);                             -- 2


-- ─── Eventos ──────────────────────────────────────────────────────────
-- Se fijan los UUID para que el seed sea reproducible y las pruebas
-- puedan referirse a un evento concreto.

-- OFICIALES: los publica un OWNER, nacen CONFIRMADOS
INSERT INTO event (id, title, description, start_date, end_date, zone_id, venue_id,
                   origin, status, visibility, capacity, ticket_price,
                   created_by_id, verified_by_id, verified_at) VALUES
  ('11111111-1111-1111-1111-111111111111',
   'Concierto de Jazz', 'Noche de jazz en vivo con músicos locales',
   now() + interval '3 days', now() + interval '3 days 3 hours', 2, 1,
   'OFICIAL', 'CONFIRMADO', 'PUBLICO', 300, 45000, 2, 2, now()),

  ('22222222-2222-2222-2222-222222222222',
   'Exposición: Arte Urbano', 'Muestra colectiva de muralistas',
   now() + interval '7 days', now() + interval '30 days', 3, 2,
   'OFICIAL', 'CONFIRMADO', 'PUBLICO', NULL, 0, 3, 3, now()),

  ('33333333-3333-3333-3333-333333333333',
   'Coctel privado de mecenas', 'Solo por invitación',
   now() + interval '10 days', now() + interval '10 days 4 hours', 3, 2,
   'OFICIAL', 'CONFIRMADO', 'PRIVADO', 50, NULL, 3, 3, now());

-- REPORTES pendientes de revisión
INSERT INTO event (id, title, description, start_date, end_date, zone_id,
                   address_text, origin, status, visibility, created_by_id) VALUES
  ('44444444-4444-4444-4444-444444444444',
   'Feria artesanal en la plaza', 'Vi montando carpas de artesanías',
   now() + interval '2 days', now() + interval '2 days 8 hours', 2,
   'Plaza de Caycedo', 'REPORTE_USUARIO', 'REPORTADO', 'PUBLICO', 4),

  ('55555555-5555-5555-5555-555555555555',
   'Festival gastronómico', 'Anuncian food trucks el fin de semana',
   now() + interval '5 days', now() + interval '6 days', 4,
   'Parque del Perro', 'REPORTE_USUARIO', 'REPORTADO', 'PUBLICO', 7);

-- REPORTE verificado y aprobado por el ADMIN
INSERT INTO event (id, title, description, start_date, end_date, zone_id,
                   address_text, origin, status, visibility,
                   created_by_id, verified_by_id, verified_at) VALUES
  ('66666666-6666-6666-6666-666666666666',
   'Mercado campesino', 'Mercado semanal de productores',
   now() + interval '1 day', now() + interval '1 day 6 hours', 3,
   'Parque de San Antonio', 'REPORTE_USUARIO', 'CONFIRMADO', 'PUBLICO',
   6, 1, now() - interval '2 hours');

-- REPORTE rechazado, con su motivo
INSERT INTO event (id, title, description, start_date, end_date, zone_id,
                   origin, status, visibility,
                   created_by_id, verified_by_id, verified_at, rejection_reason) VALUES
  ('77777777-7777-7777-7777-777777777777',
   'Concierto masivo gratuito', 'Dicen que viene un artista internacional',
   now() + interval '20 days', now() + interval '20 days 5 hours', 1,
   'REPORTE_USUARIO', 'RECHAZADO', 'PUBLICO',
   5, 1, now() - interval '1 hour',
   'El enlace aportado no corresponde al evento anunciado');


-- ─── Evidencias ───────────────────────────────────────────────────────
INSERT INTO evidence (event_id, type, url, caption, uploaded_by_id) VALUES
  ('44444444-4444-4444-4444-444444444444', 'FOTO',
   'https://ejemplo.co/fotos/feria-1.jpg', 'Carpas montándose', 4),
  ('44444444-4444-4444-4444-444444444444', 'ENLACE',
   'https://instagram.com/p/feria-artesanal', 'Publicación del organizador', 4),
  ('55555555-5555-5555-5555-555555555555', 'ENLACE',
   'https://facebook.com/events/12345', 'Evento de Facebook', 7),
  ('66666666-6666-6666-6666-666666666666', 'FOTO',
   'https://ejemplo.co/fotos/mercado.jpg', 'Puestos del mercado', 6),
  ('66666666-6666-6666-6666-666666666666', 'DOCUMENTO',
   'https://ejemplo.co/docs/permiso.pdf', 'Permiso municipal', 6),
  ('77777777-7777-7777-7777-777777777777', 'ENLACE',
   'https://sitio-dudoso.co/noticia', 'Nota de prensa', 5);


-- ─── Amistades ────────────────────────────────────────────────────────
-- Siempre con user_a_id < user_b_id
INSERT INTO friendship (user_a_id, user_b_id, requested_by_user_id, status, responded_at) VALUES
  (4, 5, 4, 'ACEPTADA',  now() - interval '5 days'),   -- Ana  ↔ Bruno
  (4, 6, 4, 'ACEPTADA',  now() - interval '3 days'),   -- Ana  ↔ Carla
  (5, 6, 5, 'ACEPTADA',  now() - interval '2 days'),   -- Bruno ↔ Carla
  (4, 7, 7, 'PENDIENTE', NULL),                        -- Diego → Ana, sin responder
  (5, 7, 7, 'RECHAZADA', now() - interval '1 day');    -- Diego → Bruno, rechazada


-- ─── Invitaciones ─────────────────────────────────────────────────────
INSERT INTO invitation (event_id, from_user_id, to_user_id, message, status, responded_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 4, 5, '¿Vamos al concierto?', 'ACEPTADA',  now() - interval '1 day'),
  ('11111111-1111-1111-1111-111111111111', 4, 6, 'Te va a gustar',       'PENDIENTE', NULL),
  ('22222222-2222-2222-2222-222222222222', 6, 4, 'La expo abre el viernes','PENDIENTE', NULL),
  ('33333333-3333-3333-3333-333333333333', 3, 4, 'Invitación al coctel', 'ACEPTADA',  now() - interval '6 hours');


-- ─── Asistencias ──────────────────────────────────────────────────────
INSERT INTO attendance (event_id, user_id, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 4, 'ASISTIRE'),
  ('11111111-1111-1111-1111-111111111111', 5, 'ASISTIRE'),
  ('11111111-1111-1111-1111-111111111111', 6, 'QUIZAS'),
  ('22222222-2222-2222-2222-222222222222', 6, 'ASISTIRE'),
  ('33333333-3333-3333-3333-333333333333', 4, 'ASISTIRE'),
  ('66666666-6666-6666-6666-666666666666', 6, 'ASISTIRE'),
  ('66666666-6666-6666-6666-666666666666', 4, 'QUIZAS');


-- ═══════════════════════════════════════════════════════════════════════
--  VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════════════════

SELECT 'zonas'        AS tabla, count(*) FROM zone
UNION ALL SELECT 'usuarios',     count(*) FROM users
UNION ALL SELECT 'lugares',      count(*) FROM venue
UNION ALL SELECT 'eventos',      count(*) FROM event
UNION ALL SELECT 'evidencias',   count(*) FROM evidence
UNION ALL SELECT 'amistades',    count(*) FROM friendship
UNION ALL SELECT 'invitaciones', count(*) FROM invitation
UNION ALL SELECT 'asistencias',  count(*) FROM attendance;
