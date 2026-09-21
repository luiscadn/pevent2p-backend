#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────
 *  CityPulse — Aplanar carpetas duplicadas
 * ─────────────────────────────────────────────────────────────────────
 *
 *  `nest g service topology/routing` crea, sin `--flat`:
 *      topology/routing/routing.service.ts        ← carpeta de más
 *  y lo que se quería era:
 *      topology/routing.service.ts
 *
 *  Este script detecta esas carpetas sobrantes, mueve los archivos un
 *  nivel arriba y corrige TODOS los imports que apuntaban a ellos.
 *
 *  Uso (desde la raíz del repositorio):
 *      node scripts/aplanar-carpetas.mjs            ← solo muestra qué haría
 *      node scripts/aplanar-carpetas.mjs --aplicar  ← lo hace de verdad
 *
 *  ⚠️  Hacer commit ANTES de ejecutar con --aplicar.
 * ─────────────────────────────────────────────────────────────────────
 */

import fs from 'node:fs';
import path from 'node:path';

const APLICAR = process.argv.includes('--aplicar');
const ROOT = process.cwd();
const APPS = path.join(ROOT, 'apps');

if (!fs.existsSync(path.join(ROOT, 'nest-cli.json'))) {
  console.error('\n  ⚠️  Ejecutar desde la raíz del repositorio (donde está nest-cli.json)\n');
  process.exit(1);
}

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

// ─────────────────────────────────────────────────────────────────────
//  1. Encontrar las carpetas duplicadas
// ─────────────────────────────────────────────────────────────────────

function listarCarpetas(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name === 'node_modules' || e.name === 'dist') continue;
    const p = path.join(dir, e.name);
    out.push(p, ...listarCarpetas(p));
  }
  return out;
}

/**
 * Una carpeta D es "duplicada" si:
 *   - todos sus archivos se llaman <nombre-de-D>.<tipo>.ts
 *     (ej: routing/routing.service.ts, routing/routing.service.spec.ts)
 *   - NO tiene un .module.ts  → si lo tuviera, es una carpeta de módulo legítima
 *   - NO tiene subcarpetas
 *   - su carpeta padre SÍ tiene un .module.ts → está dentro de un módulo
 */
function esDuplicada(dir) {
  const nombre = path.basename(dir);
  const entradas = fs.readdirSync(dir, { withFileTypes: true });
  if (!entradas.length) return false;
  if (entradas.some((e) => e.isDirectory())) return false;

  const patron = new RegExp(`^${nombre.replace(/[-.]/g, '\\$&')}\\.(service|controller|gateway|guard|pipe|filter|interceptor)(\\.spec)?\\.ts$`);
  if (!entradas.every((e) => patron.test(e.name))) return false;

  const padre = path.dirname(dir);
  return fs.readdirSync(padre).some((f) => f.endsWith('.module.ts'));
}

const carpetas = fs.existsSync(APPS) ? listarCarpetas(APPS).filter(esDuplicada) : [];

// ─────────────────────────────────────────────────────────────────────
//  2. Planear los movimientos
// ─────────────────────────────────────────────────────────────────────

const movimientos = [];   // { desde, hasta }
const conflictos = [];

for (const dir of carpetas) {
  const padre = path.dirname(dir);
  for (const f of fs.readdirSync(dir)) {
    const desde = path.join(dir, f);
    const hasta = path.join(padre, f);
    if (fs.existsSync(hasta)) conflictos.push({ desde, hasta });
    else movimientos.push({ desde, hasta });
  }
}

// ─────────────────────────────────────────────────────────────────────
//  3. Planear la corrección de imports
// ─────────────────────────────────────────────────────────────────────

function listarTs(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listarTs(p));
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

const sinExt = (p) => p.replace(/\.ts$/, '');
const destinoDe = new Map(movimientos.map((m) => [sinExt(m.desde), sinExt(m.hasta)]));

/** Dónde quedará un archivo después de mover (él mismo puede moverse) */
const nuevaUbicacion = (archivo) =>
  movimientos.find((m) => m.desde === archivo)?.hasta ?? archivo;

const IMPORT_RE = /(\bfrom\s+|\bimport\s*\(\s*|\brequire\s*\(\s*)(['"])(\.{1,2}\/[^'"]+)\2/g;

const ediciones = [];   // { archivo, antes, despues, cambios: [[viejo, nuevo]] }

for (const archivo of listarTs(path.join(ROOT, 'apps'))) {
  const src = fs.readFileSync(archivo, 'utf8');
  const ubicacionFinal = nuevaUbicacion(archivo);
  const cambios = [];

  const nuevo = src.replace(IMPORT_RE, (todo, prefijo, comilla, espec) => {
    // A qué archivo apunta HOY el import
    const objetivo = path.resolve(path.dirname(archivo), espec);
    // A dónde irá ese archivo (o se queda donde está)
    const objetivoFinal = destinoDe.get(objetivo) ?? objetivo;

    // Si ni el importador ni el importado se mueven, no se toca
    if (objetivoFinal === objetivo && ubicacionFinal === archivo) return todo;

    let nuevoEspec = path.relative(path.dirname(ubicacionFinal), objetivoFinal).split(path.sep).join('/');
    if (!nuevoEspec.startsWith('.')) nuevoEspec = './' + nuevoEspec;
    if (nuevoEspec === espec) return todo;

    cambios.push([espec, nuevoEspec]);
    return `${prefijo}${comilla}${nuevoEspec}${comilla}`;
  });

  if (cambios.length) ediciones.push({ archivo, nuevo, cambios });
}

// ─────────────────────────────────────────────────────────────────────
//  4. Mostrar el plan
// ─────────────────────────────────────────────────────────────────────

const V = '\x1b[32m', A = '\x1b[33m', R = '\x1b[31m', G = '\x1b[90m', N = '\x1b[0m', B = '\x1b[1m';
const color = process.stdout.isTTY;
const c = (k, s) => (color ? k + s + N : s);

console.log('');
console.log(c(B, `  📁 Aplanar carpetas duplicadas ${APLICAR ? '— APLICANDO' : '— simulación'}`));
console.log(c(G, '  ' + '─'.repeat(62)));

if (!carpetas.length) {
  console.log(c(V, '  ✅ No hay carpetas duplicadas. Nada que hacer.\n'));
  process.exit(0);
}

console.log(c(B, `\n  ${carpetas.length} carpeta(s) duplicada(s):\n`));
for (const m of movimientos) {
  console.log(`    ${c(G, rel(m.desde))}`);
  console.log(`      → ${c(V, rel(m.hasta))}`);
}

if (conflictos.length) {
  console.log(c(R, `\n  ❌ ${conflictos.length} conflicto(s): el destino ya existe, NO se moverán:\n`));
  for (const x of conflictos) console.log(`    ${rel(x.desde)}  ✗  ${rel(x.hasta)}`);
}

console.log(c(B, `\n  ${ediciones.length} archivo(s) con imports a corregir:\n`));
for (const e of ediciones) {
  console.log(`    ${rel(nuevaUbicacion(e.archivo))}`);
  for (const [viejo, nuevo] of e.cambios) console.log(`      ${c(A, viejo)}  →  ${c(V, nuevo)}`);
}

if (!APLICAR) {
  console.log(c(G, '\n  ' + '─'.repeat(62)));
  console.log(`  Esto fue una ${c(B, 'simulación')}. No se modificó nada.`);
  console.log(`  1. Haz commit de lo que tengas`);
  console.log(`  2. Ejecuta: ${c(B, 'node scripts/aplanar-carpetas.mjs --aplicar')}\n`);
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────
//  5. Aplicar
// ─────────────────────────────────────────────────────────────────────

// Primero reescribir los imports (en la ubicación ORIGINAL de cada archivo)
for (const e of ediciones) fs.writeFileSync(e.archivo, e.nuevo, 'utf8');

// Después mover
for (const m of movimientos) fs.renameSync(m.desde, m.hasta);

// Borrar las carpetas que quedaron vacías
let borradas = 0;
for (const dir of carpetas) {
  if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
    borradas++;
  }
}

console.log(c(G, '\n  ' + '─'.repeat(62)));
console.log(c(V, `  ✅ ${movimientos.length} archivos movidos, ${ediciones.length} con imports corregidos, ${borradas} carpetas borradas`));
console.log(`\n  Ahora verifica:`);
console.log(`    npm run build`);
console.log(`    npm run estado\n`);
