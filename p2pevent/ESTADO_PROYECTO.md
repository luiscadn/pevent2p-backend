# 📊 Estado del proyecto CityPulse

> Generado el **lunes, 21 de septiembre de 2026, 8:43 a. m.**
> Entrega del backend: **7 de oct** · Quedan **17 días**

## Progreso global: 45 %

```
██████████████░░░░░░░░░░░░░░░░  45 %
```

| ✅ Completo | 🟠 Incompleto | 🟡 Esqueleto | ❌ Falta | ⚠️ Sobra |
|:-:|:-:|:-:|:-:|:-:|
| 31 | 7 | 20 | 25 | 0 |

## Progreso por área

| Área | Progreso | % | ✅ | 🟠 | 🟡 | ❌ | ⚠️ |
|---|---|--:|:-:|:-:|:-:|:-:|:-:|
| 0. Infraestructura | `██████████` | 100 % | 10 | 0 | 0 | 0 | 0 |
| 1. libs/shared | `██████████` | 100 % | 11 | 0 | 0 | 0 | 0 |
| 2. Nodo · configuración | `██████████` | 100 % | 4 | 0 | 0 | 0 | 0 |
| 3. Nodo · topología | `██████░░░░` | 57 % | 2 | 0 | 2 | 0 | 0 |
| 4. Nodo · red | `██░░░░░░░░` | 20 % | 0 | 1 | 6 | 0 | 0 |
| 5. Nodo · índice y dominio | `██░░░░░░░░` | 15 % | 0 | 1 | 7 | 2 | 0 |
| 6. Servidor · configuración | `████████░░` | 83 % | 2 | 1 | 0 | 0 | 0 |
| 7. Servidor · anillos y directorio | `████░░░░░░` | 39 % | 2 | 0 | 5 | 0 | 0 |
| 8. Servidor · dominio (CRUD) | `█░░░░░░░░░` | 10 % | 0 | 4 | 0 | 17 | 0 |
| 9. Servidor · entidades | `░░░░░░░░░░` | 0 % | 0 | 0 | 0 | 6 | 0 |

## 🔴 Ruta crítica

Estas clases van **en serie**: cada una depende de la anterior. Determinan la fecha mínima de entrega.

```
✅ ring-path.util
   ↓
✅ TopologyService
   ↓
🟡 RoutingService
   ↓
🟡 MessageRouterService
   ↓
🟡 BroadcastService
   ↓
🟡 Eventos · service
```

## 🎯 Hitos

### 🔲 H1 · 28 de sept — El anillo se forma con 4 nodos

`███████░░░` **19 / 27** requisitos listos · quedan 8 días

<details><summary>Pendientes</summary>

- 🟡 **JoinService (entrar a la red)** — creado pero vacío
- 🟡 **PeerController (endpoints para otros nodos)** — creado pero vacío
- 🟡 **PeerClientService (enviar a otros nodos)** — creado pero vacío
- 🟠 **Módulo raíz del servidor** — falta: FriendshipsModule, AttendancesModule, InvitationsModule
- 🟡 **DirectoryService (nodos activos en memoria)** — creado pero vacío
- 🟡 **RingRegistryService (todos los anillos)** — creado pero vacío
- 🟡 **RingAllocatorService (decide la topología)** — creado pero vacío
- 🟡 **RingController** — creado pero vacío

</details>

### 🔲 H2 · 3 de oct — Un evento viaja de un nodo a otro por P2P

`███░░░░░░░` **4 / 13** requisitos listos · quedan 13 días

<details><summary>Pendientes</summary>

- 🟡 **RoutingService (nextHop)** — creado pero vacío
- 🟡 **MessageRouterService (el cerebro)** — creado pero vacío
- 🟡 **BroadcastService (difusión)** — creado pero vacío
- 🟠 **NetworkModule** — falta: importa TopologyModule
- 🟡 **LocalIndexService (caché de eventos)** — creado pero vacío
- 🟡 **Eventos · controller** — creado pero vacío
- 🟡 **Eventos · service** — creado pero vacío
- ❌ **Eventos (persistencia) · service** — esperado en apps/servidor/src/events/events.service.ts
- ❌ **Entidad event** — esperado en apps/servidor/src/entities/event.entity.ts

</details>

### 🔲 H3 · 7 de oct — Funciona con el servidor apagado y sincroniza al encenderlo

`░░░░░░░░░░` **0 / 4** requisitos listos · quedan 17 días

<details><summary>Pendientes</summary>

- 🟡 **ServerSyncService (cola de reintentos)** — creado pero vacío
- 🟡 **HeartbeatService (latidos)** — creado pero vacío
- 🟠 **Eventos (persistencia) · module** — falta: providers
- ❌ **Eventos (persistencia) · controller** — esperado en apps/servidor/src/events/events.controller.ts

</details>

## 👉 Próximos pasos sugeridos

Ordenados por prioridad: primero la ruta crítica, después los requisitos del hito más cercano.

1. 🟡 **RoutingService (nextHop)** — creado pero vacío
2. 🟡 **MessageRouterService (el cerebro)** — creado pero vacío
3. 🟡 **BroadcastService (difusión)** — creado pero vacío
4. 🟡 **Eventos · service** — creado pero vacío
5. 🟡 **JoinService (entrar a la red)** — creado pero vacío
6. 🟡 **PeerController (endpoints para otros nodos)** — creado pero vacío
7. 🟡 **PeerClientService (enviar a otros nodos)** — creado pero vacío
8. 🟠 **Módulo raíz del servidor** — falta: FriendshipsModule, AttendancesModule, InvitationsModule

## 📋 Detalle por área

### 0. Infraestructura — 100 %

| | Elemento | Detalle |
|:-:|---|---|
| ✅ | Node.js 18 o superior | v24.18.1 |
| ✅ | nest-cli.json en modo monorepo | nodo, servidor y shared registrados |
| ✅ | deleteOutDir en false (para correr varios nodos) | false |
| ✅ | Alias @app/shared en tsconfig.json | configurado |
| ✅ | docker-compose.yml con PostgreSQL | postgres con volumen |
| ✅ | Archivo .env con las variables necesarias | 7 variables definidas |
| ✅ | .env.example para el resto del equipo | existe |
| ✅ | .gitignore excluye .env y dist/ | .env y dist/ excluidos |
| ✅ | .env NO está subido al repositorio | no está versionado |
| ✅ | Dependencias declaradas e instaladas | 14 dependencias |
| ✅ | Scripts para levantar servidor y varios nodos | servidor, build y nodo1..4 |
| ✅ | Resto del proyecto original (apps/citypulse) | no existe (correcto) |

### 1. libs/shared — 100 %

| | Elemento | Detalle |
|:-:|---|---|
| ✅ | Interfaz Event | 8/8 elementos clave |
| ✅ | Interfaz User | 3/3 elementos clave |
| ✅ | Interfaz Zone | 2/2 elementos clave |
| ✅ | Interfaz Report (efímero) | 2/2 elementos clave |
| ✅ | Interfaz PeerInfo | 5/5 elementos clave |
| ✅ | RingPath, MyNeighbors y RingInfo | 6/6 elementos clave |
| ✅ | Enum MessageType | 8/8 elementos clave |
| ✅ | Envoltura PeerMessage y enum Scope | 7/7 elementos clave |
| ✅ | Payloads de los mensajes | 3 payloads |
| ✅ | ring-path.util (las 4 funciones puras) | 4/4 elementos clave |
| ✅ | index.ts exporta todo lo de shared | 12 archivos exportados |
| ✅ | Carpeta crypto/ (fuera de alcance) | no existe (correcto) |

### 2. Nodo · configuración — 100 %

| | Elemento | Detalle |
|:-:|---|---|
| ✅ | main.ts del nodo | 3/3 elementos clave |
| ✅ | Módulo raíz del nodo | 9/9 elementos clave |
| ✅ | El nodo NO usa base de datos | sin TypeORM |
| ✅ | Un solo módulo raíz en el nodo | uno solo |
| ✅ | NodeConfigService (identidad del nodo) | 5/5 elementos clave |
| ✅ | NodeConfigModule global | 2/2 elementos clave |

### 3. Nodo · topología — 57 %

| | Elemento | Detalle |
|:-:|---|---|
| ✅ | TopologyService (mi posición y mis vecinos) | 4/4 elementos clave |
| 🟡 | RoutingService (nextHop) | creado pero vacío |
| 🟡 | JoinService (entrar a la red) | creado pero vacío |
| ✅ | TopologyModule | 2/2 elementos clave |

### 4. Nodo · red — 20 %

| | Elemento | Detalle |
|:-:|---|---|
| 🟡 | PeerController (endpoints para otros nodos) | creado pero vacío |
| 🟡 | PeerClientService (enviar a otros nodos) | creado pero vacío |
| 🟡 | MessageRouterService (el cerebro) | creado pero vacío |
| 🟡 | BroadcastService (difusión) | creado pero vacío |
| 🟡 | HeartbeatService (latidos) | creado pero vacío |
| 🟡 | ServerSyncService (cola de reintentos) | creado pero vacío |
| 🟠 | NetworkModule | falta: importa TopologyModule |

### 5. Nodo · índice y dominio — 15 %

| | Elemento | Detalle |
|:-:|---|---|
| 🟡 | LocalIndexService (caché de eventos) | creado pero vacío |
| 🟠 | LocalIndexModule | falta: exports |
| 🟡 | Eventos · controller | creado pero vacío |
| 🟡 | Eventos · service | creado pero vacío |
| ❌ | Eventos · DTO de creación | esperado en apps/nodo/src/domain/events/dto/create-event.dto.ts |
| 🟡 | Reportes · controller | creado pero vacío |
| 🟡 | Reportes · service | creado pero vacío |
| ❌ | Reportes · DTO de creación | esperado en apps/nodo/src/domain/reports/dto/create-report.dto.ts |
| 🟡 | Búsqueda · controller | creado pero vacío |
| 🟡 | Búsqueda · service | creado pero vacío |

### 6. Servidor · configuración — 83 %

| | Elemento | Detalle |
|:-:|---|---|
| ✅ | main.ts del servidor | 3/3 elementos clave |
| 🟠 | Módulo raíz del servidor | falta: FriendshipsModule, AttendancesModule, InvitationsModule |
| ✅ | Un solo módulo raíz en el servidor | uno solo |
| ✅ | Configuración de PostgreSQL | 3/3 elementos clave |
| ✅ | Sin schema separado (se usa public) | public |

### 7. Servidor · anillos y directorio — 39 %

| | Elemento | Detalle |
|:-:|---|---|
| 🟡 | DirectoryService (nodos activos en memoria) | creado pero vacío |
| 🟡 | DirectoryController | creado pero vacío |
| 🟡 | RingRegistryService (todos los anillos) | creado pero vacío |
| 🟡 | RingAllocatorService (decide la topología) | creado pero vacío |
| 🟡 | RingController | creado pero vacío |
| ✅ | DirectoryModule | 2/2 elementos clave |
| ✅ | RingModule | 2/2 elementos clave |

### 8. Servidor · dominio (CRUD) — 10 %

| | Elemento | Detalle |
|:-:|---|---|
| 🟠 | Autenticación · module | falta: providers |
| ❌ | Autenticación · service | esperado en apps/servidor/src/auth/auth.service.ts |
| ❌ | Autenticación · controller | esperado en apps/servidor/src/auth/auth.controller.ts |
| 🟠 | Usuarios · module | falta: providers |
| ❌ | Usuarios · service | esperado en apps/servidor/src/users/users.service.ts |
| ❌ | Usuarios · controller | esperado en apps/servidor/src/users/users.controller.ts |
| 🟠 | Zonas · module | falta: providers |
| ❌ | Zonas · service | esperado en apps/servidor/src/zones/zones.service.ts |
| ❌ | Zonas · controller | esperado en apps/servidor/src/zones/zones.controller.ts |
| 🟠 | Eventos (persistencia) · module | falta: providers |
| ❌ | Eventos (persistencia) · service | esperado en apps/servidor/src/events/events.service.ts |
| ❌ | Eventos (persistencia) · controller | esperado en apps/servidor/src/events/events.controller.ts |
| ❌ | Amistades · module | esperado en apps/servidor/src/friendships/friendships.module.ts |
| ❌ | Amistades · service | esperado en apps/servidor/src/friendships/friendships.service.ts |
| ❌ | Amistades · controller | esperado en apps/servidor/src/friendships/friendships.controller.ts |
| ❌ | Asistencias · module | esperado en apps/servidor/src/attendances/attendances.module.ts |
| ❌ | Asistencias · service | esperado en apps/servidor/src/attendances/attendances.service.ts |
| ❌ | Asistencias · controller | esperado en apps/servidor/src/attendances/attendances.controller.ts |
| ❌ | Invitaciones · module | esperado en apps/servidor/src/invitations/invitations.module.ts |
| ❌ | Invitaciones · service | esperado en apps/servidor/src/invitations/invitations.service.ts |
| ❌ | Invitaciones · controller | esperado en apps/servidor/src/invitations/invitations.controller.ts |

### 9. Servidor · entidades — 0 %

| | Elemento | Detalle |
|:-:|---|---|
| ❌ | Entidad user | esperado en apps/servidor/src/entities/user.entity.ts |
| ❌ | Entidad zone | esperado en apps/servidor/src/entities/zone.entity.ts |
| ❌ | Entidad event | esperado en apps/servidor/src/entities/event.entity.ts |
| ❌ | Entidad friendship | esperado en apps/servidor/src/entities/friendship.entity.ts |
| ❌ | Entidad attendance | esperado en apps/servidor/src/entities/attendance.entity.ts |
| ❌ | Entidad invitation | esperado en apps/servidor/src/entities/invitation.entity.ts |
| ✅ | Report NO se persiste | sin tabla report |
| ✅ | Sin tablas de catálogo (se usan enums) | enums |
| ✅ | La topología NO se persiste | en memoria |

---

## Leyenda

| Estado | Significado |
|:-:|---|
| ✅ | **Completo**: existe y contiene todos los elementos clave |
| 🟠 | **Incompleto**: tiene código, pero le faltan elementos acordados (se listan) |
| 🟡 | **Esqueleto**: creado con `nest g` pero todavía vacío |
| ❌ | **Falta**: el archivo no existe |
| ⚠️ | **Sobra**: existe algo que se decidió no hacer, o un resto que hay que borrar |

> **Limitación:** la revisión es **estática y heurística**. Busca archivos y palabras clave en el código
> (sin contar comentarios). Un ✅ significa que *están las piezas*, no que *funcione*.
> La prueba real sigue siendo levantar los nodos y verificar `GET /peer/info`.
