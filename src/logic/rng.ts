/**
 * Seedable PRNG so generated batches are reproducible.
 *
 * mulberry32: fast, good distribution, integer-seedable.
 * Same seed + same generator code = same puzzles.
 */

export type Rng = () => number // returns [0, 1)

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Random integer in [min, max] inclusive. */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

/** Pick one element from an array. */
export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

/** Pick `k` distinct elements from `arr` (without replacement). */
export function sample<T>(rng: Rng, arr: readonly T[], k: number): T[] {
  if (k > arr.length) throw new Error('sample: k > arr.length')
  const copy = arr.slice()
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rng() * (copy.length - i))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, k)
}

/** Fisher–Yates shuffle. Returns new array + index permutation. */
export function shuffle<T>(rng: Rng, arr: T[]): { result: T[]; permutation: number[] } {
  const result = arr.slice()
  const permutation = arr.map((_, i) => i)
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
    ;[permutation[i], permutation[j]] = [permutation[j], permutation[i]]
  }
  return { result, permutation }
}

/** Choose a random seed from current time + Math.random (for non-reproducible runs). */
export function randomSeed(): number {
  return ((Date.now() & 0xffffffff) ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
}
