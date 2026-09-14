export type RingPath = number[];

/**
 * Convierte un RingPath en texto, para usarlo como clave de un Map.
 * []      -> ""
 * [1]     -> "1"
 * [1, 3]  -> "1.3"
 */
export function toKey(path: RingPath): string {
  return path.join('.');
}

/**
 * ¿Son el mismo anillo?
 */
export function isSamePath(a: RingPath, b: RingPath): boolean {
  return toKey(a) === toKey(b);
}

/**
 * El anillo "ancestro común" de dos anillos.
 * commonAncestor([1,2], [1,5,3])  ->  [1]
 * commonAncestor([1,2], [4,7])    ->  []
 */
export function commonAncestor(a: RingPath, b: RingPath): RingPath {
  const result: number[] = [];
  const min = Math.min(a.length, b.length);
  for (let i = 0; i < min; i++) {
    if (a[i] !== b[i]) break;
    result.push(a[i]);
  }
  return result;
}

/**
 * LA FUNCIÓN MÁS IMPORTANTE.
 * Si estoy en el anillo `mine` y el destino está en `target`,
 * ¿por cuál miembro de MI anillo tengo que bajar?
 *
 * childIndexTowards([],    [1,5,3])  ->  1    (bajo por el miembro 1)
 * childIndexTowards([1],   [1,5,3])  ->  5    (bajo por el miembro 5)
 * childIndexTowards([1,5], [1,5])    ->  null (ya estoy en el anillo destino)
 * childIndexTowards([1,5], [2])      ->  null (el destino NO está debajo de mí)
 */
export function childIndexTowards(
  mine: RingPath,
  target: RingPath,
): number | null {
  // Si el destino no es más profundo que yo, no está debajo
  if (target.length <= mine.length) return null;
  // Si mi ruta no es prefijo de la del destino, no está debajo
  for (let i = 0; i < mine.length; i++) {
    if (mine[i] !== target[i]) return null;
  }
  return target[mine.length];
}
