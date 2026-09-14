import {
  toKey,
  isSamePath,
  commonAncestor,
  childIndexTowards,
  RingPath,
} from './ring-path.util';

describe('RingPath Utilities', () => {
  describe('toKey', () => {
    it('should convert empty array to empty string', () => {
      expect(toKey([])).toBe('');
    });

    it('should convert single element path', () => {
      expect(toKey([1])).toBe('1');
    });

    it('should convert multi-element paths with dots', () => {
      expect(toKey([1, 3])).toBe('1.3');
      expect(toKey([1, 5, 3])).toBe('1.5.3');
    });
  });

  describe('isSamePath', () => {
    it('should return true for identical paths', () => {
      expect(isSamePath([], [])).toBe(true);
      expect(isSamePath([1], [1])).toBe(true);
      expect(isSamePath([1, 5, 3], [1, 5, 3])).toBe(true);
    });

    it('should return false for different paths', () => {
      expect(isSamePath([], [1])).toBe(false);
      expect(isSamePath([1, 2], [1, 3])).toBe(false);
      expect(isSamePath([1, 5], [1, 5, 3])).toBe(false);
    });
  });

  describe('commonAncestor', () => {
    it('should handle empty paths (root ring)', () => {
      expect(commonAncestor([], [])).toEqual([]);
      expect(commonAncestor([], [1, 2])).toEqual([]);
      expect(commonAncestor([1, 2], [])).toEqual([]);
    });

    it('should find common ancestor for divergent paths', () => {
      expect(commonAncestor([1, 2], [1, 5, 3])).toEqual([1]);
      expect(commonAncestor([1, 2], [4, 7])).toEqual([]);
    });

    it('should find common ancestor when one is prefix of the other', () => {
      expect(commonAncestor([1], [1, 5, 3])).toEqual([1]);
      expect(commonAncestor([1, 5], [1, 5, 3])).toEqual([1, 5]);
    });

    it('should handle identical depth-3 paths', () => {
      expect(commonAncestor([1, 5, 3], [1, 5, 3])).toEqual([1, 5, 3]);
    });
  });

  describe('childIndexTowards', () => {
    it('should satisfy the 4 canonical cases from specification', () => {
      // childIndexTowards([], [1,5,3]) -> 1 (bajo por el miembro 1)
      expect(childIndexTowards([], [1, 5, 3])).toBe(1);

      // childIndexTowards([1], [1,5,3]) -> 5 (bajo por el miembro 5)
      expect(childIndexTowards([1], [1, 5, 3])).toBe(5);

      // childIndexTowards([1,5], [1,5]) -> null (ya estoy en el anillo destino)
      expect(childIndexTowards([1, 5], [1, 5])).toBeNull();

      // childIndexTowards([1,5], [2]) -> null (el destino NO está debajo de mí)
      expect(childIndexTowards([1, 5], [2])).toBeNull();
    });

    it('should return null when target is root ring []', () => {
      expect(childIndexTowards([], [])).toBeNull();
      expect(childIndexTowards([1], [])).toBeNull();
      expect(childIndexTowards([1, 2, 3], [])).toBeNull();
    });

    it('should handle depth 3 paths correctly', () => {
      // Descender desde profundidad 2 hacia profundidad 3
      expect(childIndexTowards([1, 5], [1, 5, 3])).toBe(3);

      // Descender desde profundidad 3 hacia profundidad 4
      expect(childIndexTowards([1, 5, 3], [1, 5, 3, 2])).toBe(2);

      // Destino con misma profundidad pero rama diferente
      expect(childIndexTowards([1, 5, 2], [1, 5, 3])).toBeNull();

      // Destino en rama no emparentada a profundidad 3
      expect(childIndexTowards([2, 1, 0], [1, 5, 3])).toBeNull();
    });

    it('should return null when target length <= mine length', () => {
      const mine: RingPath = [1, 2, 3];
      const targetShorter: RingPath = [1, 2];
      expect(childIndexTowards(mine, targetShorter)).toBeNull();
    });

    it('should return null when mine is not a strict prefix of target', () => {
      expect(childIndexTowards([1, 4], [1, 5, 3])).toBeNull();
      expect(childIndexTowards([2], [1, 5, 3])).toBeNull();
    });
  });
});
