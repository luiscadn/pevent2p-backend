#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────
 *  CityPulse — Informe de estado del proyecto
 * ─────────────────────────────────────────────────────────────────────
 *
 *  Revisa el repositorio y genera un checklist de qué está hecho y qué
 *  falta, según la estructura acordada. NO modifica ningún archivo del
 *  proyecto: solo lee y escribe el informe.
 *
 *  Uso (desde la raíz del repositorio):
 *      node scripts/estado-proyecto.mjs
 *      node scripts/estado-proyecto.mjs --no-color
 *      node scripts/estado-proyecto.mjs --salida informe.md
 *
 *  Sin dependencias: solo usa módulos nativos de Node (18+).
 * ─────────────────────────────────────────────────────────────────────
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// ═════════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN
// ═════════════════════════════════════════════════════════════════════

const FECHA_ENTREGA = new Date('2026-10-07T23:59:59');

const HITOS = [
  { id: 'H1', fecha: '2026-09-28', titulo: 'El anillo se forma con 4 nodos' },
  { id: 'H2', fecha: '2026-10-03', titulo: 'Un evento viaja de un nodo a otro por P2P' },
  { id: 'H3', fecha: '2026-10-07', titulo: 'Funciona con el servidor apagado y sincroniza al encenderlo' },
];

const RUTA_CRITICA = [
  'shared.ringPath',
  'nodo.topology',
  'nodo.routing',
  'nodo.messageRouter',
  'nodo.broadcast',
  'nodo.eventsService',
];

// ═════════════════════════════════════════════════════════════════════
//  ARGUMENTOS
// ═════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const USAR_COLOR = !args.includes('--no-color') && process.stdout.isTTY;
const idxSalida = args.indexOf('--salida');
const ARCHIVO_SALIDA = idxSalida >= 0 ? args[idxSalida + 1] : 'ESTADO_PROYECTO.md';

// ═════════════════════════════════════════════════════════════════════
//  UTILIDADES DE ARCHIVOS
// ═════════════════════════════════════════════════════════════════════

function encontrarRaiz(desde) {
  let dir = desde;
  for (;;) {
    if (fs.existsSync(path.join(dir, 'nest-cli.json'))) return dir;
    const padre = path.dirname(dir);
    if (padre === dir) return desde;
    dir = padre;
  }
}

const ROOT = encontrarRaiz(process.cwd());

const abs = (rel) => path.join(ROOT, rel);
const existe = (rel) => fs.existsSync(abs(rel));

function leer(rel) {
  try {
    return fs.readFileSync(abs(rel), 'utf8');
  } catch {
    return null;
  }
}

/** Lista recursiva de archivos .ts de una carpeta (sin node_modules ni dist) */
const cacheArchivos = new Map();
function listarTs(relDir) {
  if (cacheArchivos.has(relDir)) return cacheArchivos.get(relDir);
  const resultado = [];
  const recorrer = (dirAbs) => {
    let entradas;
    try {
      entradas = fs.readdirSync(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entradas) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
      const p = path.join(dirAbs, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts')) {
        resultado.push(path.relative(ROOT, p).split(path.sep).join('/'));
      }
    }
  };
  recorrer(abs(relDir));
  cacheArchivos.set(relDir, resultado);
  return resultado;
}

/**
 * Busca un archivo. Primero en la ruta exacta acordada; si no está,
 * lo busca por nombre dentro de la app (por si lo pusieron en otra carpeta).
 */
function localizar(rutas, raizBusqueda) {
  for (const r of rutas) {
    if (existe(r)) return { ruta: r, exacta: true };
  }
  if (!raizBusqueda) return null;
  const todos = listarTs(raizBusqueda);
  for (const r of rutas) {
    const nombre = path.basename(r);
    const hallado = todos.find((f) => path.basename(f) === nombre);
    if (hallado) return { ruta: hallado, exacta: false };
  }
  return null;
}

// ═════════════════════════════════════════════════════════════════════
//  ANÁLISIS DE CÓDIGO
// ═════════════════════════════════════════════════════════════════════

/**
 * Quita comentarios respetando strings.
 * Así, un `// nextHop` comentado NO cuenta como implementado.
 */
function quitarComentarios(src) {
  let out = '';
  let i = 0;
  let enString = null;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (enString) {
      out += c;
      if (c === '\\') { out += n ?? ''; i += 2; continue; }
      if (c === enString) enString = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { enString = c; out += c; i++; continue; }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** Cuenta líneas con contenido real (sin imports, llaves sueltas ni comentarios) */
function lineasSignificativas(src) {
  return quitarComentarios(src)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !l.startsWith('import '))
    .filter((l) => !/^[{}()\[\];,]+$/.test(l)).length;
}

/**
 * ¿Es un esqueleto recién generado por `nest g`?
 *
 * `nest g service X` produce `export class XService {}`: la clase existe
 * pero su cuerpo está VACÍO. Se detecta así, mirando si todas las
 * clases / interfaces / enums del archivo tienen el cuerpo vacío.
 * (No se cuentan líneas: el código escrito en una sola línea engañaría.)
 *
 * Los módulos quedan fuera: su clase SIEMPRE tiene el cuerpo vacío,
 * todo va en el decorador @Module({...}).
 */
function esEsqueleto(src, tipo) {
  if (!['service', 'controller', 'util', 'dto', 'interface', 'entity'].includes(tipo)) return false;

  const limpio = quitarComentarios(src).replace(/^\s*import\b[^;]*;?/gm, '');

  // Si exporta funciones, constantes o tipos, tiene contenido
  if (/export\s+(async\s+)?(function|const|let|type)\s+\w+/.test(limpio)) return false;

  const declaracion = /\b(class|interface|enum)\s+\w+[^{]*\{/g;
  let m;
  let hayDeclaraciones = false;

  while ((m = declaracion.exec(limpio))) {
    hayDeclaraciones = true;
    const inicio = m.index + m[0].length;
    let profundidad = 1;
    let i = inicio;
    while (i < limpio.length && profundidad > 0) {
      if (limpio[i] === '{') profundidad++;
      else if (limpio[i] === '}') profundidad--;
      i++;
    }
    const cuerpo = limpio.slice(inicio, i - 1);
    if (cuerpo.trim().length > 0) return false;   // hay una con contenido
  }

  if (hayDeclaraciones) return true;               // todas vacías
  return limpio.trim().length === 0;               // archivo vacío
}

// ═════════════════════════════════════════════════════════════════════
//  ESTADOS
// ═════════════════════════════════════════════════════════════════════

const E = {
  OK: 'OK',
  INCOMPLETO: 'INCOMPLETO',
  ESQUELETO: 'ESQUELETO',
  FALTA: 'FALTA',
  SOBRA: 'SOBRA',
};

const ICONO = {
  OK: '✅',
  INCOMPLETO: '🟠',
  ESQUELETO: '🟡',
  FALTA: '❌',
  SOBRA: '⚠️',
};

const PUNTAJE = { OK: 1, INCOMPLETO: 0.5, ESQUELETO: 0.15, FALTA: 0, SOBRA: 0 };

// ═════════════════════════════════════════════════════════════════════
//  DEFINICIÓN DE LOS CHEQUEOS
// ═════════════════════════════════════════════════════════════════════

/**
 * Tipos de chequeo:
 *   archivo  → debe existir; opcionalmente con marcadores de contenido
 *   ausente  → NO debe existir (restos, cosas descartadas)
 *   custom   → función que devuelve { estado, detalle }
 *
 * Marcador: [etiqueta legible, expresión regular]
 */
const CHEQUEOS = [];
const archivo = (def) => CHEQUEOS.push({ tipoChequeo: 'archivo', ...def });
const ausente = (def) => CHEQUEOS.push({ tipoChequeo: 'ausente', guardia: true, ...def });
const custom = (def) => CHEQUEOS.push({ tipoChequeo: 'custom', ...def });

const A = {
  INFRA: '0. Infraestructura',
  SHARED: '1. libs/shared',
  N_CONF: '2. Nodo · configuración',
  N_TOPO: '3. Nodo · topología',
  N_RED: '4. Nodo · red',
  N_DOM: '5. Nodo · índice y dominio',
  S_CONF: '6. Servidor · configuración',
  S_RING: '7. Servidor · anillos y directorio',
  S_DOM: '8. Servidor · dominio (CRUD)',
  S_ENT: '9. Servidor · entidades',
};

const NODO = 'apps/nodo/src';
const SERV = 'apps/servidor/src';
const SHR = 'libs/shared/src';

// ─────────────────────────────────────────────────────────────────────
//  0. INFRAESTRUCTURA
// ─────────────────────────────────────────────────────────────────────

function leerJson(rel) {
  const txt = leer(rel);
  if (txt == null) return null;
  try {
    return JSON.parse(txt);
  } catch {
    try {
      return JSON.parse(quitarComentarios(txt).replace(/,(\s*[}\]])/g, '$1'));
    } catch {
      return undefined; // existe pero no se pudo leer
    }
  }
}

custom({
  area: A.INFRA, id: 'infra.node', desc: 'Node.js 18 o superior',
  fn: () => {
    const major = Number(process.versions.node.split('.')[0]);
    return major >= 18
      ? { estado: E.OK, detalle: `v${process.versions.node}` }
      : { estado: E.FALTA, detalle: `v${process.versions.node} — se necesita 18+ (fetch y randomUUID nativos)` };
  },
});

custom({
  area: A.INFRA, id: 'infra.nestcli', desc: 'nest-cli.json en modo monorepo',
  fn: () => {
    const j = leerJson('nest-cli.json');
    if (j === null) return { estado: E.FALTA, detalle: 'no existe nest-cli.json' };
    if (j === undefined) return { estado: E.INCOMPLETO, detalle: 'no se pudo leer el JSON' };
    const faltan = [];
    if (j.monorepo !== true) faltan.push('"monorepo": true');
    const p = j.projects ?? {};
    for (const nombre of ['nodo', 'servidor', 'shared']) if (!p[nombre]) faltan.push(`proyecto "${nombre}"`);
    return faltan.length
      ? { estado: E.INCOMPLETO, detalle: `falta: ${faltan.join(', ')}` }
      : { estado: E.OK, detalle: 'nodo, servidor y shared registrados' };
  },
});

custom({
  area: A.INFRA, id: 'infra.deleteOutDir', desc: 'deleteOutDir en false (para correr varios nodos)',
  fn: () => {
    const j = leerJson('nest-cli.json');
    if (!j) return { estado: E.FALTA, detalle: 'no se pudo leer nest-cli.json' };
    const v = j.compilerOptions?.deleteOutDir;
    return v === false
      ? { estado: E.OK, detalle: 'false' }
      : { estado: E.INCOMPLETO, detalle: `está en ${v ?? 'true (por defecto)'}: los nodos se caerán al recompilar` };
  },
});

custom({
  area: A.INFRA, id: 'infra.alias', desc: 'Alias @app/shared en tsconfig.json',
  fn: () => {
    const txt = leer('tsconfig.json');
    if (txt == null) return { estado: E.FALTA, detalle: 'no existe tsconfig.json' };
    return /["']@app\/shared["']\s*:/.test(txt)
      ? { estado: E.OK, detalle: 'configurado' }
      : { estado: E.FALTA, detalle: 'falta "paths": { "@app/shared": [...] }' };
  },
});

custom({
  area: A.INFRA, id: 'infra.docker', desc: 'docker-compose.yml con PostgreSQL',
  fn: () => {
    const txt = leer('docker-compose.yml') ?? leer('docker-compose.yaml') ?? leer('compose.yml');
    if (txt == null) return { estado: E.FALTA, detalle: 'no existe docker-compose.yml' };
    const faltan = [];
    if (!/image:\s*postgres/i.test(txt)) faltan.push('imagen postgres');
    if (!/volumes:/i.test(txt)) faltan.push('volumen persistente');
    return faltan.length
      ? { estado: E.INCOMPLETO, detalle: `falta: ${faltan.join(', ')}` }
      : { estado: E.OK, detalle: 'postgres con volumen' };
  },
});

custom({
  area: A.INFRA, id: 'infra.env', desc: 'Archivo .env con las variables necesarias',
  fn: () => {
    const txt = leer('.env');
    if (txt == null) return { estado: E.FALTA, detalle: 'no existe .env (copiar de .env.example)' };
    const claves = ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD', 'DB_DATABASE', 'SERVER_URL', 'JWT_SECRET'];
    const faltan = claves.filter((k) => !new RegExp(`^\\s*${k}\\s*=`, 'm').test(txt));
    return faltan.length
      ? { estado: E.INCOMPLETO, detalle: `faltan: ${faltan.join(', ')}` }
      : { estado: E.OK, detalle: `${claves.length} variables definidas` };
  },
});

custom({
  area: A.INFRA, id: 'infra.envExample', desc: '.env.example para el resto del equipo',
  fn: () => existe('.env.example')
    ? { estado: E.OK, detalle: 'existe' }
    : { estado: E.FALTA, detalle: 'crear una copia del .env sin valores sensibles' },
});

custom({
  area: A.INFRA, id: 'infra.gitignore', desc: '.gitignore excluye .env y dist/',
  fn: () => {
    const txt = leer('.gitignore');
    if (txt == null) return { estado: E.FALTA, detalle: 'no existe .gitignore' };
    const faltan = [];
    if (!/^\s*\.env\s*$/m.test(txt)) faltan.push('.env');
    if (!/^\s*\/?dist\/?\s*$/m.test(txt)) faltan.push('dist/');
    return faltan.length
      ? { estado: E.INCOMPLETO, detalle: `agregar: ${faltan.join(', ')}` }
      : { estado: E.OK, detalle: '.env y dist/ excluidos' };
  },
});

custom({
  area: A.INFRA, id: 'infra.envGit', guardia: true, desc: '.env NO está subido al repositorio',
  fn: () => {
    try {
      const salida = execSync('git ls-files .env', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
        .toString().trim();
      return salida
        ? { estado: E.SOBRA, detalle: '¡.env está en git! Ejecutar: git rm --cached .env' }
        : { estado: E.OK, detalle: 'no está versionado' };
    } catch {
      return { estado: E.OK, detalle: 'no se pudo consultar git (se omite)' };
    }
  },
});

custom({
  area: A.INFRA, id: 'infra.deps', desc: 'Dependencias declaradas e instaladas',
  fn: () => {
    const pkg = leerJson('package.json');
    if (!pkg) return { estado: E.FALTA, detalle: 'no existe package.json' };
    const todas = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    const requeridas = [
      '@nestjs/typeorm', 'typeorm', 'pg', '@nestjs/config', '@nestjs/schedule',
      'class-validator', 'class-transformer', '@nestjs/mapped-types',
      '@nestjs/jwt', '@nestjs/passport', 'passport', 'passport-jwt', 'bcrypt', 'cross-env',
    ];
    const faltan = requeridas.filter((d) => !todas[d]);
    if (faltan.length) return { estado: E.INCOMPLETO, detalle: `npm i ${faltan.join(' ')}` };
    if (!existe('node_modules')) return { estado: E.INCOMPLETO, detalle: 'declaradas pero sin instalar: npm install' };
    return { estado: E.OK, detalle: `${requeridas.length} dependencias` };
  },
});

custom({
  area: A.INFRA, id: 'infra.scripts', desc: 'Scripts para levantar servidor y varios nodos',
  fn: () => {
    const pkg = leerJson('package.json');
    if (!pkg) return { estado: E.FALTA, detalle: 'no existe package.json' };
    const s = pkg.scripts ?? {};
    const requeridos = ['servidor', 'build:nodo', 'nodo1', 'nodo2', 'nodo3', 'nodo4', 'db:up'];
    const faltan = requeridos.filter((k) => !s[k]);
    return faltan.length
      ? { estado: E.INCOMPLETO, detalle: `faltan: ${faltan.join(', ')}` }
      : { estado: E.OK, detalle: 'servidor, build y nodo1..4' };
  },
});

ausente({
  area: A.INFRA, id: 'infra.sobraCitypulse', desc: 'Resto del proyecto original (apps/citypulse)',
  ruta: 'apps/citypulse', razon: 'borrarlo: era el esqueleto de "nest new"',
});

// ─────────────────────────────────────────────────────────────────────
//  1. LIBS/SHARED
// ─────────────────────────────────────────────────────────────────────

const variantes = (base) => [
  `${SHR}/${base}.interface.ts`,
  `${SHR}/${base}.model.ts`,
  `${SHR}/${base}.ts`,
];

archivo({
  area: A.SHARED, id: 'shared.event', desc: 'Interfaz Event', tipo: 'interface',
  rutas: variantes('models/event'), buscarEn: SHR,
  marcadores: [
    ['id', /\bid\s*[?]?:/], ['title', /\btitle\s*[?]?:/], ['zoneId', /\bzoneId\s*[?]?:/],
    ['authorId', /\bauthorId\s*[?]?:/], ['accessType', /\baccessType\s*[?]?:/],
    ['status', /\bstatus\s*[?]?:/], ['version (P2P)', /\bversion\s*[?]?:/],
    ['updatedAt (P2P)', /\bupdatedAt\s*[?]?:/],
  ],
});

archivo({
  area: A.SHARED, id: 'shared.user', desc: 'Interfaz User', tipo: 'interface',
  rutas: variantes('models/user'), buscarEn: SHR,
  marcadores: [['id', /\bid\s*[?]?:/], ['zoneId', /\bzoneId\s*[?]?:/], ['isZoneAdmin', /\bisZoneAdmin\s*[?]?:/]],
});

archivo({
  area: A.SHARED, id: 'shared.zone', desc: 'Interfaz Zone', tipo: 'interface',
  rutas: variantes('models/zone'), buscarEn: SHR,
  marcadores: [['id', /\bid\s*[?]?:/], ['name', /\bname\s*[?]?:/]],
});

archivo({
  area: A.SHARED, id: 'shared.report', desc: 'Interfaz Report (efímero)', tipo: 'interface',
  rutas: [...variantes('models/report'), ...variantes('models/incident')], buscarEn: SHR,
  marcadores: [['zoneId', /\bzoneId\s*[?]?:/], ['expiresAt', /\bexpiresAt\s*[?]?:/]],
});

archivo({
  area: A.SHARED, id: 'shared.peerInfo', desc: 'Interfaz PeerInfo', tipo: 'interface',
  rutas: variantes('models/peer-info'), buscarEn: SHR,
  marcadores: [
    ['peerId', /\bpeerId\s*[?]?:/], ['uri', /\buri\s*[?]?:/], ['ringPath', /\bringPath\s*[?]?:/],
    ['index', /\bindex\s*[?]?:/], ['isParent (corrección auditoría)', /\bisParent\s*[?]?:/],
  ],
});

archivo({
  area: A.SHARED, id: 'shared.ring', desc: 'RingPath, MyNeighbors y RingInfo', tipo: 'interface',
  rutas: variantes('models/ring'), buscarEn: SHR,
  marcadores: [
    ['type RingPath', /\bRingPath\b/], ['interface MyNeighbors', /\bMyNeighbors\b/],
    ['interface RingInfo', /\bRingInfo\b/], ['childRings', /\bchildRings\s*[?]?:/],
    ['foreignParent', /\bforeignParent\s*[?]?:/],
    ['nextIndex (corrección auditoría)', /\bnextIndex\s*[?]?:/],
  ],
});

archivo({
  area: A.SHARED, id: 'shared.messageType', desc: 'Enum MessageType', tipo: 'interface',
  rutas: [`${SHR}/protocol/message-type.enum.ts`, `${SHR}/protocol/message-types.ts`, `${SHR}/protocol/message-type.ts`],
  buscarEn: SHR,
  marcadores: [
    ['enum MessageType', /enum\s+MessageType/], ['PING', /\bPING\b/], ['EVENT_NEW', /\bEVENT_NEW\b/],
    ['EVENT_UPDATE', /\bEVENT_UPDATE\b/], ['EVENT_CANCEL', /\bEVENT_CANCEL\b/],
    ['REPORT_NEW', /\bREPORT_NEW\b/], ['SEARCH', /\bSEARCH\b/], ['SEARCH_RESULT', /\bSEARCH_RESULT\b/],
  ],
});

archivo({
  area: A.SHARED, id: 'shared.peerMessage', desc: 'Envoltura PeerMessage y enum Scope', tipo: 'interface',
  rutas: [`${SHR}/protocol/peer-message.interface.ts`, `${SHR}/protocol/peer-message.ts`],
  buscarEn: SHR,
  marcadores: [
    ['messageId', /\bmessageId\s*[?]?:/], ['type', /\btype\s*[?]?:/], ['scope', /\bscope\s*[?]?:/],
    ['ttl', /\bttl\s*[?]?:/], ['viaUri (anti-eco)', /\bviaUri\s*[?]?:/],
    ['payload', /\bpayload\s*[?]?:/], ['enum Scope', /enum\s+Scope/],
  ],
});

custom({
  area: A.SHARED, id: 'shared.payloads', desc: 'Payloads de los mensajes',
  fn: () => {
    const todos = listarTs(`${SHR}/protocol`).filter((f) => f.includes('/payloads/'));
    if (!todos.length) return { estado: E.FALTA, detalle: `carpeta ${SHR}/protocol/payloads/ vacía o inexistente` };
    const tiene = (re) => todos.some((f) => re.test(path.basename(f)));
    const faltan = [];
    if (!tiene(/event/i)) faltan.push('event-payload');
    if (!tiene(/search(?!-?result)/i)) faltan.push('search-payload');
    if (!tiene(/result/i)) faltan.push('search-result-payload');
    return faltan.length
      ? { estado: E.INCOMPLETO, detalle: `${todos.length} archivo(s); faltan: ${faltan.join(', ')}` }
      : { estado: E.OK, detalle: `${todos.length} payloads` };
  },
});

archivo({
  area: A.SHARED, id: 'shared.ringPath', desc: 'ring-path.util (las 4 funciones puras)', tipo: 'util',
  rutas: [`${SHR}/ring/ring-path.util.ts`, `${SHR}/ring/ring-path.ts`], buscarEn: SHR,
  marcadores: [
    ['toKey', /export\s+(function|const)\s+toKey\b/],
    ['isSamePath', /export\s+(function|const)\s+isSamePath\b/],
    ['commonAncestor', /export\s+(function|const)\s+commonAncestor\b/],
    ['childIndexTowards', /export\s+(function|const)\s+childIndexTowards\b/],
  ],
});

custom({
  area: A.SHARED, id: 'shared.index', desc: 'index.ts exporta todo lo de shared',
  fn: () => {
    const src = leer(`${SHR}/index.ts`);
    if (src == null) return { estado: E.FALTA, detalle: 'no existe libs/shared/src/index.ts' };
    const limpio = quitarComentarios(src);
    const archivos = listarTs(SHR).filter((f) => !f.endsWith('/index.ts'));
    const noExportados = archivos.filter((f) => {
      const rel = './' + path.relative(abs(SHR), abs(f)).split(path.sep).join('/').replace(/\.ts$/, '');
      const sinExt = rel.replace(/\.(interface|model|enum|util)$/, '');
      return !limpio.includes(`'${rel}'`) && !limpio.includes(`"${rel}"`)
          && !limpio.includes(`'${sinExt}`) && !limpio.includes(`"${sinExt}`);
    });
    const ignorables = noExportados.filter((f) => /shared\.(module|service)\.ts$/.test(f));
    const reales = noExportados.filter((f) => !ignorables.includes(f));
    if (!archivos.length) return { estado: E.ESQUELETO, detalle: 'shared todavía no tiene archivos' };
    return reales.length
      ? { estado: E.INCOMPLETO, detalle: `sin exportar: ${reales.map((f) => path.basename(f)).join(', ')}` }
      : { estado: E.OK, detalle: `${archivos.length - ignorables.length} archivos exportados` };
  },
});

ausente({
  area: A.SHARED, id: 'shared.sobraCrypto', desc: 'Carpeta crypto/ (fuera de alcance)',
  ruta: `${SHR}/crypto`, razon: 'se decidió no implementar firmas en esta versión',
});

// ─────────────────────────────────────────────────────────────────────
//  2. NODO · CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────

archivo({
  area: A.N_CONF, id: 'nodo.main', desc: 'main.ts del nodo', tipo: 'config',
  rutas: [`${NODO}/main.ts`],
  marcadores: [['NestFactory', /NestFactory\.create/], ['ValidationPipe', /ValidationPipe/], ['lee PORT', /\bPORT\b/]],
});

archivo({
  area: A.N_CONF, id: 'nodo.rootModule', desc: 'Módulo raíz del nodo', tipo: 'module',
  rutas: [`${NODO}/nodo.module.ts`, `${NODO}/app.module.ts`],
  marcadores: [
    ['ConfigModule', /ConfigModule\.forRoot/], ['ScheduleModule', /ScheduleModule\.forRoot/],
    ['NodeConfigModule', /NodeConfigModule/], ['TopologyModule', /TopologyModule/],
    ['NetworkModule', /NetworkModule/], ['LocalIndexModule', /LocalIndexModule/],
    ['EventsModule', /EventsModule/], ['ReportsModule', /ReportsModule/], ['SearchModule', /SearchModule/],
  ],
});

custom({
  area: A.N_CONF, id: 'nodo.sinTypeorm', guardia: true, desc: 'El nodo NO usa base de datos',
  fn: () => {
    const f = localizar([`${NODO}/nodo.module.ts`, `${NODO}/app.module.ts`]);
    if (!f) return { estado: E.OK, detalle: '(módulo raíz no encontrado)' };
    return /TypeOrmModule/.test(quitarComentarios(leer(f.ruta)))
      ? { estado: E.SOBRA, detalle: 'el nodo importa TypeOrmModule: debe guardar todo en memoria' }
      : { estado: E.OK, detalle: 'sin TypeORM' };
  },
});

custom({
  area: A.N_CONF, id: 'nodo.moduloDuplicado', guardia: true, desc: 'Un solo módulo raíz en el nodo',
  fn: () => existe(`${NODO}/nodo.module.ts`) && existe(`${NODO}/app.module.ts`)
    ? { estado: E.SOBRA, detalle: 'existen nodo.module.ts y app.module.ts: borrar el que main.ts no use' }
    : { estado: E.OK, detalle: 'uno solo' },
});

archivo({
  area: A.N_CONF, id: 'nodo.config', desc: 'NodeConfigService (identidad del nodo)', tipo: 'service',
  rutas: [`${NODO}/config/node-config.service.ts`], buscarEn: NODO,
  marcadores: [
    ['peerId', /get\s+peerId/], ['uri', /get\s+uri/], ['serverUrl', /get\s+serverUrl/],
    ['zoneId', /get\s+zoneId/], ['port', /get\s+port/],
  ],
});

archivo({
  area: A.N_CONF, id: 'nodo.configModule', desc: 'NodeConfigModule global', tipo: 'module',
  rutas: [`${NODO}/config/config.module.ts`, `${NODO}/config/node-config.module.ts`], buscarEn: NODO,
  marcadores: [['@Global', /@Global\(\)/], ['exports', /exports\s*:/]],
});

// ─────────────────────────────────────────────────────────────────────
//  3. NODO · TOPOLOGÍA
// ─────────────────────────────────────────────────────────────────────

archivo({
  area: A.N_TOPO, id: 'nodo.topology', desc: 'TopologyService (mi posición y mis vecinos)', tipo: 'service',
  rutas: [`${NODO}/topology/topology.service.ts`], buscarEn: NODO,
  marcadores: [
    ['getMe / setMe', /\b(getMe|setMe)\b/], ['getNeighbors / setNeighbors', /\b(getNeighbors|setNeighbors)\b/],
    ['allNeighbors', /\ballNeighbors\b/], ['isParent', /\bisParent\b/],
  ],
});

archivo({
  area: A.N_TOPO, id: 'nodo.routing', desc: 'RoutingService (nextHop)', tipo: 'service',
  rutas: [`${NODO}/topology/routing.service.ts`], buscarEn: NODO,
  marcadores: [
    ['nextHop', /\bnextHop\b/], ['usa childIndexTowards', /\bchildIndexTowards\b/],
    ['compara rutas', /\b(isSamePath|toKey)\b/], ['sube por foreignParent', /\bforeignParent\b/],
    ['bajar por childRings', /\bchildRings\b/],
  ],
});

archivo({
  area: A.N_TOPO, id: 'nodo.join', desc: 'JoinService (entrar a la red)', tipo: 'service',
  rutas: [`${NODO}/topology/join.service.ts`], buscarEn: NODO,
  marcadores: [
    ['se ejecuta al arrancar', /onModuleInit/], ['POST /ring/join', /ring\/join/],
    ['refresca vecinos', /ring\/neighbors/], ['avisa a los vecinos', /neighbors-changed|notifyNeighbors/],
    ['re-registro si 404 (auditoría)', /404|NotFound|status\s*===?\s*404/],
  ],
});

archivo({
  area: A.N_TOPO, id: 'nodo.topologyModule', desc: 'TopologyModule', tipo: 'module',
  rutas: [`${NODO}/topology/topology.module.ts`], buscarEn: NODO,
  marcadores: [['providers', /providers\s*:/], ['exports', /exports\s*:/]],
});

// ─────────────────────────────────────────────────────────────────────
//  4. NODO · RED
// ─────────────────────────────────────────────────────────────────────

archivo({
  area: A.N_RED, id: 'nodo.peerController', desc: 'PeerController (endpoints para otros nodos)', tipo: 'controller',
  rutas: [`${NODO}/network/peer.controller.ts`], buscarEn: NODO,
  marcadores: [
    ["@Controller('peer')", /@Controller\(\s*['"]peer['"]\s*\)/], ['POST message', /['"]message['"]/],
    ['GET ping', /['"]ping['"]/], ['POST neighbors-changed', /['"]neighbors-changed['"]/],
    ['GET info (diagnóstico)', /['"]info['"]/],
  ],
});

archivo({
  area: A.N_RED, id: 'nodo.peerClient', desc: 'PeerClientService (enviar a otros nodos)', tipo: 'service',
  rutas: [`${NODO}/network/peer-client.service.ts`], buscarEn: NODO,
  marcadores: [
    ['usa fetch', /\bfetch\s*\(/], ['/peer/message', /\/peer\/message/],
    ['ping', /\bping\b/], ['no lanza si falla (try/catch)', /\bcatch\b/],
  ],
});

archivo({
  area: A.N_RED, id: 'nodo.messageRouter', desc: 'MessageRouterService (el cerebro)', tipo: 'service',
  rutas: [`${NODO}/network/message-router.service.ts`], buscarEn: NODO,
  marcadores: [
    ['Set de mensajes vistos', /new\s+Set\s*</], ['descarta por messageId', /\bmessageId\b/],
    ['controla ttl', /\bttl\b/], ['enruta con nextHop', /\bnextHop\b/],
    ['maneja BROADCAST', /\bBROADCAST\b/], ['despacha por tipo', /\bswitch\s*\(|\bcase\s+MessageType\./],
  ],
});

archivo({
  area: A.N_RED, id: 'nodo.broadcast', desc: 'BroadcastService (difusión)', tipo: 'service',
  rutas: [`${NODO}/network/broadcast.service.ts`], buscarEn: NODO,
  marcadores: [
    ['broadcast', /\bbroadcast\s*\(/], ['relay', /\brelay\s*\(/],
    ['excluye al emisor (viaUri)', /\bviaUri\b/], ['usa allNeighbors', /\ballNeighbors\b/],
    ['genera messageId', /randomUUID|uuid/],
  ],
});

archivo({
  area: A.N_RED, id: 'nodo.heartbeat', desc: 'HeartbeatService (latidos)', tipo: 'service',
  rutas: [`${NODO}/network/heartbeat.service.ts`], buscarEn: NODO,
  marcadores: [['@Interval', /@Interval\(/], ['hace ping', /\bping\b/], ['cuenta fallos', /fall|fail|intentos|strikes/i]],
});

archivo({
  area: A.N_RED, id: 'nodo.serverSync', desc: 'ServerSyncService (cola de reintentos)', tipo: 'service',
  rutas: [`${NODO}/network/server-sync.service.ts`], buscarEn: NODO,
  marcadores: [
    ['@Interval', /@Interval\(/], ['cola de pendientes', /\b(pendientes|pending|queue|cola)\b/],
    ['POST /events', /\/events/],
  ],
});

archivo({
  area: A.N_RED, id: 'nodo.networkModule', desc: 'NetworkModule', tipo: 'module',
  rutas: [`${NODO}/network/network.module.ts`], buscarEn: NODO,
  marcadores: [['providers', /providers\s*:/], ['PeerController', /PeerController/], ['importa TopologyModule', /TopologyModule/]],
});

// ─────────────────────────────────────────────────────────────────────
//  5. NODO · ÍNDICE Y DOMINIO
// ─────────────────────────────────────────────────────────────────────

archivo({
  area: A.N_DOM, id: 'nodo.localIndex', desc: 'LocalIndexService (caché de eventos)', tipo: 'service',
  rutas: [`${NODO}/local-index/local-index.service.ts`], buscarEn: NODO,
  marcadores: [
    ['Map de eventos', /new\s+Map\s*</], ['upsertEvent', /\bupsertEvent\b/], ['search', /\bsearch\s*\(/],
    ['compara versión (auditoría)', /\.version\b/], ['la cancelación gana (auditoría)', /CANCELADO|CANCELLED/],
  ],
});

archivo({
  area: A.N_DOM, id: 'nodo.localIndexModule', desc: 'LocalIndexModule', tipo: 'module',
  rutas: [`${NODO}/local-index/local-index.module.ts`], buscarEn: NODO,
  marcadores: [['exports', /exports\s*:/]],
});

const dominioNodo = [
  {
    nombre: 'events', titulo: 'Eventos',
    ctrl: [['@Post', /@Post\(/], ['@Get', /@Get\(/]],
    svc: [
      ['guarda local', /\bupsertEvent\b/], ['difunde a la red', /\bbroadcast\b/],
      ['sincroniza con servidor', /serverSync|ServerSync|\/events/], ['genera id', /randomUUID|uuid/],
    ],
    dto: true,
  },
  {
    nombre: 'reports', titulo: 'Reportes',
    ctrl: [['@Post', /@Post\(/], ['@Get', /@Get\(/]],
    svc: [['difunde REPORT_NEW', /REPORT_NEW/], ['vigencia (expiresAt)', /expiresAt/]],
    dto: true,
  },
  {
    nombre: 'search', titulo: 'Búsqueda',
    ctrl: [['@Get', /@Get\(/]],
    svc: [['busca local', /localIndex|LocalIndex/], ['pregunta a la red (SEARCH)', /MessageType\.SEARCH\b|['"]SEARCH['"]/], ['espera respuestas', /setTimeout|sleep|delay|\b800\b/]],
    dto: false,
  },
];

for (const d of dominioNodo) {
  const id = d.nombre === 'events' ? 'nodo.eventsService' : `nodo.${d.nombre}Service`;
  archivo({
    area: A.N_DOM, id: `nodo.${d.nombre}Controller`, desc: `${d.titulo} · controller`, tipo: 'controller',
    rutas: [`${NODO}/domain/${d.nombre}/${d.nombre}.controller.ts`, `${NODO}/${d.nombre}/${d.nombre}.controller.ts`],
    buscarEn: NODO, marcadores: d.ctrl,
  });
  archivo({
    area: A.N_DOM, id, desc: `${d.titulo} · service`, tipo: 'service',
    rutas: [`${NODO}/domain/${d.nombre}/${d.nombre}.service.ts`, `${NODO}/${d.nombre}/${d.nombre}.service.ts`],
    buscarEn: NODO, marcadores: d.svc,
  });
  if (d.dto) {
    const sing = d.nombre.replace(/s$/, '');
    archivo({
      area: A.N_DOM, id: `nodo.${d.nombre}Dto`, desc: `${d.titulo} · DTO de creación`, tipo: 'dto',
      rutas: [`${NODO}/domain/${d.nombre}/dto/create-${sing}.dto.ts`], buscarEn: NODO,
      marcadores: [['validación class-validator', /@Is[A-Z]\w*\(/]],
    });
  }
}

// ─────────────────────────────────────────────────────────────────────
//  6. SERVIDOR · CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────

archivo({
  area: A.S_CONF, id: 'serv.main', desc: 'main.ts del servidor', tipo: 'config',
  rutas: [`${SERV}/main.ts`],
  marcadores: [['ValidationPipe', /ValidationPipe/], ['whitelist', /whitelist\s*:\s*true/], ['enableCors', /enableCors/]],
});

archivo({
  area: A.S_CONF, id: 'serv.rootModule', desc: 'Módulo raíz del servidor', tipo: 'module',
  rutas: [`${SERV}/servidor.module.ts`, `${SERV}/app.module.ts`],
  marcadores: [
    ['ConfigModule', /ConfigModule\.forRoot/], ['TypeOrmModule.forRootAsync', /TypeOrmModule\.forRootAsync/],
    ['AuthModule', /AuthModule/], ['UsersModule', /UsersModule/], ['ZonesModule', /ZonesModule/],
    ['EventsModule', /EventsModule/], ['FriendshipsModule', /FriendshipsModule/],
    ['AttendancesModule', /AttendancesModule/], ['InvitationsModule', /InvitationsModule/],
    ['DirectoryModule', /DirectoryModule/], ['RingModule', /RingModule/],
  ],
});

custom({
  area: A.S_CONF, id: 'serv.moduloDuplicado', guardia: true, desc: 'Un solo módulo raíz en el servidor',
  fn: () => existe(`${SERV}/servidor.module.ts`) && existe(`${SERV}/app.module.ts`)
    ? { estado: E.SOBRA, detalle: 'existen servidor.module.ts y app.module.ts: borrar el que main.ts no use' }
    : { estado: E.OK, detalle: 'uno solo' },
});

archivo({
  area: A.S_CONF, id: 'serv.dbConfig', desc: 'Configuración de PostgreSQL', tipo: 'config',
  rutas: [`${SERV}/config/database.config.ts`], buscarEn: SERV,
  marcadores: [['type postgres', /['"]postgres['"]/], ['entities', /entities\s*:/], ['synchronize', /synchronize\s*:/]],
});

custom({
  area: A.S_CONF, id: 'serv.sinSchema', guardia: true, desc: 'Sin schema separado (se usa public)',
  fn: () => {
    const f = localizar([`${SERV}/config/database.config.ts`], SERV);
    if (!f) return { estado: E.OK, detalle: '(configuración no encontrada)' };
    return /schema\s*:\s*['"](?!public)/.test(quitarComentarios(leer(f.ruta)))
      ? { estado: E.SOBRA, detalle: 'hay un schema distinto de public: se decidió no usarlo' }
      : { estado: E.OK, detalle: 'public' };
  },
});

// ─────────────────────────────────────────────────────────────────────
//  7. SERVIDOR · ANILLOS Y DIRECTORIO
// ─────────────────────────────────────────────────────────────────────

archivo({
  area: A.S_RING, id: 'serv.directory', desc: 'DirectoryService (nodos activos en memoria)', tipo: 'service',
  rutas: [`${SERV}/directory/directory.service.ts`], buscarEn: SERV,
  marcadores: [['Map en memoria', /new\s+Map\s*</], ['registrar', /\b(registrar|register|add)\s*\(/], ['eliminar', /\b(eliminar|remove|delete|unregister)\s*\(/]],
});

archivo({
  area: A.S_RING, id: 'serv.directoryCtrl', desc: 'DirectoryController', tipo: 'controller',
  rutas: [`${SERV}/directory/directory.controller.ts`], buscarEn: SERV,
  marcadores: [['GET online', /['"]online['"]/]],
});

archivo({
  area: A.S_RING, id: 'serv.ringRegistry', desc: 'RingRegistryService (todos los anillos)', tipo: 'service',
  rutas: [`${SERV}/ring/ring-registry.service.ts`], buscarEn: SERV,
  marcadores: [
    ['Map de anillos', /new\s+Map\s*</], ['calcula vecinos', /\b(vecinosDe|neighborsOf|getNeighbors)\b/],
    ['aritmética circular (%)', /%\s*n\b|%\s*\w+\.length/], ['padre extranjero', /foreignParent|padreExtranjero/],
    ['índices permanentes (auditoría)', /\bnextIndex\b/],
  ],
});

archivo({
  area: A.S_RING, id: 'serv.ringAllocator', desc: 'RingAllocatorService (decide la topología)', tipo: 'service',
  rutas: [`${SERV}/ring/ring-allocator.service.ts`], buscarEn: SERV,
  marcadores: [
    ['join', /\bjoin\s*\(/], ['leave', /\bleave\s*\(/], ['crea sub-anillos', /(sub|crear|create)\w*(anillo|ring)/i],
    ['designa padre (isParent)', /\bisParent\b/],
  ],
});

archivo({
  area: A.S_RING, id: 'serv.ringCtrl', desc: 'RingController', tipo: 'controller',
  rutas: [`${SERV}/ring/ring.controller.ts`], buscarEn: SERV,
  marcadores: [
    ['POST join', /['"]join['"]/], ['GET neighbors', /['"]neighbors['"]/], ['POST leave', /['"]leave['"]/],
    ['GET topology', /['"]topology['"]/], ['404 si no conoce al nodo (auditoría)', /NotFoundException/],
  ],
});

for (const m of ['directory', 'ring']) {
  archivo({
    area: A.S_RING, id: `serv.${m}Module`, desc: `${m[0].toUpperCase() + m.slice(1)}Module`, tipo: 'module',
    rutas: [`${SERV}/${m}/${m}.module.ts`], buscarEn: SERV,
    marcadores: [['providers', /providers\s*:/], ['controllers', /controllers\s*:/]],
  });
}

// ─────────────────────────────────────────────────────────────────────
//  8. SERVIDOR · DOMINIO (CRUD)
// ─────────────────────────────────────────────────────────────────────

const crud = [
  { n: 'auth', t: 'Autenticación', svc: [['hash de contraseña', /bcrypt/], ['emite JWT', /JwtService|\.sign\(/]] },
  { n: 'users', t: 'Usuarios', svc: [] },
  { n: 'zones', t: 'Zonas', svc: [] },
  { n: 'events', t: 'Eventos (persistencia)', svc: [['upsert idempotente por versión (auditoría)', /\.version\b/]] },
  { n: 'friendships', t: 'Amistades', svc: [['valida quién acepta (auditoría)', /requestedBy/]] },
  { n: 'attendances', t: 'Asistencias', svc: [] },
  { n: 'invitations', t: 'Invitaciones', svc: [] },
];

for (const c of crud) {
  archivo({
    area: A.S_DOM, id: `serv.${c.n}Module`, desc: `${c.t} · module`, tipo: 'module',
    rutas: [`${SERV}/${c.n}/${c.n}.module.ts`], buscarEn: SERV,
    marcadores: [['providers', /providers\s*:/]],
  });
  archivo({
    area: A.S_DOM, id: `serv.${c.n}Service`, desc: `${c.t} · service`, tipo: 'service',
    rutas: [`${SERV}/${c.n}/${c.n}.service.ts`], buscarEn: SERV,
    marcadores: c.svc,
  });
  archivo({
    area: A.S_DOM, id: `serv.${c.n}Controller`, desc: `${c.t} · controller`, tipo: 'controller',
    rutas: [`${SERV}/${c.n}/${c.n}.controller.ts`], buscarEn: SERV,
    marcadores: [],
  });
}

// ─────────────────────────────────────────────────────────────────────
//  9. SERVIDOR · ENTIDADES
// ─────────────────────────────────────────────────────────────────────

const entidades = [
  { n: 'user', m: [['@Entity', /@Entity\(/], ['email único', /unique\s*:\s*true/], ['isZoneAdmin', /\bisZoneAdmin\b/], ['relación con Zone', /@ManyToOne/]] },
  { n: 'zone', m: [['@Entity', /@Entity\(/], ['name', /\bname\b/], ['sub-zonas (auto-relación)', /parent/i]] },
  { n: 'event', m: [
    ['@Entity', /@Entity\(/], ['id UUID', /['"]uuid['"]/], ['version (P2P)', /\bversion\b/],
    ['updatedAt', /\bupdatedAt\b|UpdateDateColumn/], ['accessType como enum', /enum\s*:/],
    ['soft delete (auditoría)', /DeleteDateColumn/], ['relación con Zone', /@ManyToOne/],
  ] },
  { n: 'friendship', m: [['@Entity', /@Entity\(/], ['userA / userB', /userA|user_a/i], ['requestedBy (auditoría)', /requestedBy|requested_by/]] },
  { n: 'attendance', m: [['@Entity', /@Entity\(/], ['status', /\bstatus\b/], ['relación con User', /@ManyToOne/], ['único por usuario+evento', /@Unique|@Index\([^)]*unique/]] },
  { n: 'invitation', m: [['@Entity', /@Entity\(/], ['emisor', /from/i], ['receptor', /\bto[A-Z_]|toUser|to_user/], ['status', /\bstatus\b/]] },
];

for (const ent of entidades) {
  archivo({
    area: A.S_ENT, id: `serv.ent.${ent.n}`, desc: `Entidad ${ent.n}`, tipo: 'entity',
    rutas: [`${SERV}/entities/${ent.n}.entity.ts`], buscarEn: SERV,
    marcadores: ent.m,
  });
}

custom({
  area: A.S_ENT, id: 'serv.ent.sinReport', guardia: true, desc: 'Report NO se persiste',
  fn: () => {
    const f = listarTs(SERV).find((x) => /report\.entity\.ts$/.test(x));
    return f
      ? { estado: E.SOBRA, detalle: `${f}: los reportes son efímeros, viven solo en la red` }
      : { estado: E.OK, detalle: 'sin tabla report' };
  },
});

custom({
  area: A.S_ENT, id: 'serv.ent.sinCatalogos', guardia: true, desc: 'Sin tablas de catálogo (se usan enums)',
  fn: () => {
    const f = listarTs(SERV).filter((x) =>
      /(status|access-type|access_type|zone-type|report-type|catalog)\.entity\.ts$/i.test(x));
    return f.length
      ? { estado: E.SOBRA, detalle: `${f.map((x) => path.basename(x)).join(', ')}: se decidió usar enums` }
      : { estado: E.OK, detalle: 'enums' };
  },
});

custom({
  area: A.S_ENT, id: 'serv.ent.sinTopologia', guardia: true, desc: 'La topología NO se persiste',
  fn: () => {
    const f = listarTs(SERV).filter((x) => /(ring|topology|directory|peer)[\w-]*\.entity\.ts$/i.test(x));
    return f.length
      ? { estado: E.SOBRA, detalle: `${f.map((x) => path.basename(x)).join(', ')}: el estado volátil se reconstruye, no se guarda` }
      : { estado: E.OK, detalle: 'en memoria' };
  },
});

// ═════════════════════════════════════════════════════════════════════
//  HITOS: qué chequeos necesita cada uno
// ═════════════════════════════════════════════════════════════════════

const REQUISITOS_HITO = {
  H1: [
    'infra.nestcli', 'infra.alias', 'infra.docker', 'infra.env', 'infra.deps', 'infra.scripts',
    'shared.peerInfo', 'shared.ring', 'shared.ringPath', 'shared.index',
    'nodo.main', 'nodo.rootModule', 'nodo.config', 'nodo.configModule',
    'nodo.topology', 'nodo.join', 'nodo.topologyModule', 'nodo.peerController', 'nodo.peerClient',
    'serv.main', 'serv.rootModule', 'serv.dbConfig',
    'serv.directory', 'serv.ringRegistry', 'serv.ringAllocator', 'serv.ringCtrl', 'serv.ringModule',
  ],
  H2: [
    'shared.event', 'shared.messageType', 'shared.peerMessage', 'shared.payloads',
    'nodo.routing', 'nodo.messageRouter', 'nodo.broadcast', 'nodo.networkModule',
    'nodo.localIndex', 'nodo.eventsController', 'nodo.eventsService',
    'serv.eventsService', 'serv.ent.event',
  ],
  H3: ['nodo.serverSync', 'nodo.heartbeat', 'serv.eventsModule', 'serv.eventsController'],
};

// ═════════════════════════════════════════════════════════════════════
//  EJECUCIÓN DE LOS CHEQUEOS
// ═════════════════════════════════════════════════════════════════════

function evaluar(c) {
  if (c.tipoChequeo === 'custom') {
    try {
      return { ...c, ...c.fn() };
    } catch (e) {
      return { ...c, estado: E.INCOMPLETO, detalle: `error al revisar: ${e.message}` };
    }
  }

  if (c.tipoChequeo === 'ausente') {
    return existe(c.ruta)
      ? { ...c, estado: E.SOBRA, detalle: `${c.ruta} — ${c.razon}` }
      : { ...c, estado: E.OK, detalle: 'no existe (correcto)' };
  }

  // tipo 'archivo'
  const loc = localizar(c.rutas, c.buscarEn);
  if (!loc) return { ...c, estado: E.FALTA, detalle: `esperado en ${c.rutas[0]}` };

  const src = leer(loc.ruta) ?? '';
  const ubicacion = loc.exacta ? '' : ` (encontrado en ${loc.ruta})`;

  if (esEsqueleto(src, c.tipo)) {
    return { ...c, estado: E.ESQUELETO, detalle: `creado pero vacío${ubicacion}`, ruta: loc.ruta };
  }

  const limpio = quitarComentarios(src);
  const faltan = (c.marcadores ?? []).filter(([, re]) => !re.test(limpio)).map(([etq]) => etq);

  if (faltan.length) {
    return { ...c, estado: E.INCOMPLETO, detalle: `falta: ${faltan.join(', ')}${ubicacion}`, ruta: loc.ruta, faltan };
  }
  const total = (c.marcadores ?? []).length;
  const detalle = total
    ? `${total}/${total} elementos clave${ubicacion}`
    : `${lineasSignificativas(src)} líneas${ubicacion}`;
  return { ...c, estado: E.OK, detalle, ruta: loc.ruta };
}

const resultados = CHEQUEOS.map(evaluar);
const porId = Object.fromEntries(resultados.map((r) => [r.id, r]));

// ═════════════════════════════════════════════════════════════════════
//  CÁLCULOS DEL RESUMEN
// ═════════════════════════════════════════════════════════════════════

const areas = [...new Set(resultados.map((r) => r.area))];

/**
 * Las GUARDIAS (chequeos de "esto NO debe existir") no cuentan como
 * progreso: si contaran, un proyecto vacío ganaría puntos por no tener
 * tablas de catálogo. Solo aparecen como alerta (⚠️) cuando fallan.
 */
function resumenDe(lista) {
  const cuenta = { OK: 0, INCOMPLETO: 0, ESQUELETO: 0, FALTA: 0, SOBRA: 0 };
  const evaluables = lista.filter((r) => !r.guardia);

  for (const r of evaluables) cuenta[r.estado]++;
  cuenta.SOBRA = lista.filter((r) => r.estado === E.SOBRA).length;

  const puntos = evaluables.reduce((s, r) => s + PUNTAJE[r.estado], 0);
  const pct = evaluables.length ? Math.round((puntos / evaluables.length) * 100) : 100;
  return { ...cuenta, total: evaluables.length, pct };
}

const resumenAreas = areas.map((a) => ({ area: a, ...resumenDe(resultados.filter((r) => r.area === a)) }));
const resumenGlobal = resumenDe(resultados);

const hoy = new Date();
const diasRestantes = Math.ceil((FECHA_ENTREGA - hoy) / 86_400_000);

function estadoHito(h) {
  const reqs = REQUISITOS_HITO[h.id].map((id) => porId[id]).filter(Boolean);
  const listos = reqs.filter((r) => r.estado === E.OK).length;
  const pendientes = reqs.filter((r) => r.estado !== E.OK);
  const dias = Math.ceil((new Date(`${h.fecha}T23:59:59`) - hoy) / 86_400_000);
  return { ...h, listos, total: reqs.length, pendientes, dias };
}
const hitos = HITOS.map(estadoHito);

/** Próximos pasos: primero la ruta crítica, luego por orden de hito */
function proximosPasos(max = 8) {
  const orden = [
    ...RUTA_CRITICA,
    ...REQUISITOS_HITO.H1, ...REQUISITOS_HITO.H2, ...REQUISITOS_HITO.H3,
    ...resultados.map((r) => r.id),
  ];
  const vistos = new Set();
  const pasos = [];
  for (const id of orden) {
    if (vistos.has(id)) continue;
    vistos.add(id);
    const r = porId[id];
    if (r && r.estado !== E.OK && r.estado !== E.SOBRA) pasos.push(r);
    if (pasos.length >= max) break;
  }
  return pasos;
}

// ═════════════════════════════════════════════════════════════════════
//  SALIDA: MARKDOWN
// ═════════════════════════════════════════════════════════════════════

const barra = (pct, largo = 10) => {
  const llenos = Math.round((pct / 100) * largo);
  return '█'.repeat(llenos) + '░'.repeat(largo - llenos);
};

const fechaCorta = (d) => d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
const escapar = (s) => String(s ?? '').replace(/\|/g, '\\|');

function generarMarkdown() {
  const L = [];
  const fecha = hoy.toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' });

  L.push('# 📊 Estado del proyecto CityPulse', '');
  L.push(`> Generado el **${fecha}**`);
  L.push(`> Entrega del backend: **${fechaCorta(FECHA_ENTREGA)}** · Quedan **${diasRestantes} días**`, '');
  L.push(`## Progreso global: ${resumenGlobal.pct} %`, '');
  L.push('```');
  L.push(`${barra(resumenGlobal.pct, 30)}  ${resumenGlobal.pct} %`);
  L.push('```', '');
  L.push(`| ✅ Completo | 🟠 Incompleto | 🟡 Esqueleto | ❌ Falta | ⚠️ Sobra |`);
  L.push(`|:-:|:-:|:-:|:-:|:-:|`);
  L.push(`| ${resumenGlobal.OK} | ${resumenGlobal.INCOMPLETO} | ${resumenGlobal.ESQUELETO} | ${resumenGlobal.FALTA} | ${resumenGlobal.SOBRA} |`, '');

  // ── Por área ──
  L.push('## Progreso por área', '');
  L.push('| Área | Progreso | % | ✅ | 🟠 | 🟡 | ❌ | ⚠️ |');
  L.push('|---|---|--:|:-:|:-:|:-:|:-:|:-:|');
  for (const a of resumenAreas) {
    L.push(`| ${a.area} | \`${barra(a.pct)}\` | ${a.pct} % | ${a.OK} | ${a.INCOMPLETO} | ${a.ESQUELETO} | ${a.FALTA} | ${a.SOBRA} |`);
  }
  L.push('');

  // ── Ruta crítica ──
  L.push('## 🔴 Ruta crítica', '');
  L.push('Estas clases van **en serie**: cada una depende de la anterior. Determinan la fecha mínima de entrega.', '');
  L.push('```');
  L.push(RUTA_CRITICA.map((id) => {
    const r = porId[id];
    return `${ICONO[r?.estado ?? 'FALTA']} ${r?.desc.split(' (')[0] ?? id}`;
  }).join('\n   ↓\n'));
  L.push('```', '');

  // ── Hitos ──
  L.push('## 🎯 Hitos', '');
  for (const h of hitos) {
    const pct = Math.round((h.listos / h.total) * 100);
    const plazo = h.dias < 0 ? `**vencido hace ${-h.dias} días**` : `quedan ${h.dias} días`;
    const icono = h.listos === h.total ? '✅' : h.dias < 0 ? '🔥' : h.dias <= 3 ? '⏰' : '🔲';
    L.push(`### ${icono} ${h.id} · ${fechaCorta(new Date(h.fecha + 'T12:00'))} — ${h.titulo}`, '');
    L.push(`\`${barra(pct)}\` **${h.listos} / ${h.total}** requisitos listos · ${plazo}`, '');
    if (h.pendientes.length) {
      L.push('<details><summary>Pendientes</summary>', '');
      for (const p of h.pendientes) L.push(`- ${ICONO[p.estado]} **${escapar(p.desc)}** — ${escapar(p.detalle)}`);
      L.push('', '</details>', '');
    }
  }

  // ── Próximos pasos ──
  const pasos = proximosPasos();
  if (pasos.length) {
    L.push('## 👉 Próximos pasos sugeridos', '');
    L.push('Ordenados por prioridad: primero la ruta crítica, después los requisitos del hito más cercano.', '');
    pasos.forEach((p, i) => L.push(`${i + 1}. ${ICONO[p.estado]} **${escapar(p.desc)}** — ${escapar(p.detalle)}`));
    L.push('');
  }

  // ── Lo que sobra ──
  const sobran = resultados.filter((r) => r.estado === E.SOBRA);
  if (sobran.length) {
    L.push('## ⚠️ Cosas que sobran o contradicen lo acordado', '');
    for (const s of sobran) L.push(`- **${escapar(s.desc)}** — ${escapar(s.detalle)}`);
    L.push('');
  }

  // ── Detalle ──
  L.push('## 📋 Detalle por área', '');
  for (const a of areas) {
    const items = resultados.filter((r) => r.area === a);
    const ra = resumenAreas.find((x) => x.area === a);
    L.push(`### ${a} — ${ra.pct} %`, '');
    L.push('| | Elemento | Detalle |');
    L.push('|:-:|---|---|');
    for (const r of items) L.push(`| ${ICONO[r.estado]} | ${escapar(r.desc)} | ${escapar(r.detalle)} |`);
    L.push('');
  }

  // ── Leyenda ──
  L.push('---', '');
  L.push('## Leyenda', '');
  L.push('| Estado | Significado |');
  L.push('|:-:|---|');
  L.push('| ✅ | **Completo**: existe y contiene todos los elementos clave |');
  L.push('| 🟠 | **Incompleto**: tiene código, pero le faltan elementos acordados (se listan) |');
  L.push('| 🟡 | **Esqueleto**: creado con `nest g` pero todavía vacío |');
  L.push('| ❌ | **Falta**: el archivo no existe |');
  L.push('| ⚠️ | **Sobra**: existe algo que se decidió no hacer, o un resto que hay que borrar |');
  L.push('');
  L.push('> **Limitación:** la revisión es **estática y heurística**. Busca archivos y palabras clave en el código');
  L.push('> (sin contar comentarios). Un ✅ significa que *están las piezas*, no que *funcione*.');
  L.push('> La prueba real sigue siendo levantar los nodos y verificar `GET /peer/info`.');
  L.push('');

  return L.join('\n');
}

// ═════════════════════════════════════════════════════════════════════
//  SALIDA: CONSOLA
// ═════════════════════════════════════════════════════════════════════

const C = USAR_COLOR
  ? { r: '\x1b[0m', b: '\x1b[1m', dim: '\x1b[2m', verde: '\x1b[32m', amarillo: '\x1b[33m', rojo: '\x1b[31m', cian: '\x1b[36m', gris: '\x1b[90m' }
  : { r: '', b: '', dim: '', verde: '', amarillo: '', rojo: '', cian: '', gris: '' };

const colorPct = (p) => (p >= 80 ? C.verde : p >= 40 ? C.amarillo : C.rojo);

function imprimirConsola() {
  const linea = C.gris + '─'.repeat(64) + C.r;
  console.log('');
  console.log(`${C.b}${C.cian}  📊 CityPulse — estado del proyecto${C.r}`);
  console.log(linea);
  console.log(`  Progreso global  ${colorPct(resumenGlobal.pct)}${barra(resumenGlobal.pct, 24)} ${resumenGlobal.pct} %${C.r}`);
  console.log(`  ${C.gris}✅ ${resumenGlobal.OK}   🟠 ${resumenGlobal.INCOMPLETO}   🟡 ${resumenGlobal.ESQUELETO}   ❌ ${resumenGlobal.FALTA}   ⚠️  ${resumenGlobal.SOBRA}${C.r}`);
  console.log(`  ${C.gris}Quedan ${diasRestantes} días para el ${fechaCorta(FECHA_ENTREGA)}${C.r}`);
  console.log(linea);

  for (const a of resumenAreas) {
    const nombre = a.area.padEnd(38).slice(0, 38);
    console.log(`  ${nombre} ${colorPct(a.pct)}${barra(a.pct)} ${String(a.pct).padStart(3)} %${C.r}`);
  }
  console.log(linea);

  console.log(`  ${C.b}Ruta crítica${C.r}`);
  console.log('  ' + RUTA_CRITICA.map((id) => ICONO[porId[id]?.estado ?? 'FALTA']).join(' → '));
  console.log(linea);

  console.log(`  ${C.b}Hitos${C.r}`);
  for (const h of hitos) {
    const pct = Math.round((h.listos / h.total) * 100);
    const plazo = h.dias < 0 ? `${C.rojo}vencido${C.r}` : `${h.dias} días`;
    console.log(`  ${h.id} ${fechaCorta(new Date(h.fecha + 'T12:00')).padEnd(8)} ${colorPct(pct)}${barra(pct)} ${h.listos}/${h.total}${C.r}  ${C.gris}${plazo}${C.r}`);
  }
  console.log(linea);

  const pasos = proximosPasos(5);
  if (pasos.length) {
    console.log(`  ${C.b}Próximos pasos${C.r}`);
    pasos.forEach((p, i) => console.log(`  ${i + 1}. ${ICONO[p.estado]} ${p.desc}`));
    console.log(linea);
  }

  const sobran = resultados.filter((r) => r.estado === E.SOBRA);
  if (sobran.length) {
    console.log(`  ${C.amarillo}${C.b}⚠️  ${sobran.length} cosa(s) que sobran — ver el informe${C.r}`);
    console.log(linea);
  }

  console.log(`  ${C.verde}Informe completo → ${ARCHIVO_SALIDA}${C.r}`);
  console.log('');
}

// ═════════════════════════════════════════════════════════════════════
//  MAIN
// ═════════════════════════════════════════════════════════════════════

if (!fs.existsSync(path.join(ROOT, 'nest-cli.json'))) {
  console.error('\n  ⚠️  No se encontró nest-cli.json. Ejecuta el script desde la raíz del repositorio.\n');
}

fs.writeFileSync(path.join(ROOT, ARCHIVO_SALIDA), generarMarkdown(), 'utf8');
imprimirConsola();
