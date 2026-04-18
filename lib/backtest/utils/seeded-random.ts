/**
 * Deterministic pseudo-random number generator using xorshift128.
 * Same seed always produces the same sequence.
 */
export class SeededRandom {
  private state: [number, number, number, number]

  constructor(seed: number) {
    // Initialize state from seed using simple hash
    this.state = [seed >>> 0, (seed * 1103515245 + 12345) >>> 0, (seed * 1664525 + 1013904223) >>> 0, (seed * 6364136223846793005 + 1442695040888963407) >>> 0]
  }

  /** Returns a float in [0, 1) */
  next(): number {
    // xorshift128
    let t = this.state[3]
    t ^= t << 11
    t ^= t >>> 8
    this.state[3] = this.state[2]
    this.state[2] = this.state[1]
    this.state[1] = this.state[0]
    t ^= this.state[0]
    t ^= this.state[0] >>> 19
    this.state[0] = t
    return (t >>> 0) / 4294967296
  }

  /** Returns an integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  /** Returns a float in [min, max) */
  float(min: number, max: number): number {
    return this.next() * (max - min) + min
  }

  /** Returns true with the given probability [0, 1] */
  bool(probability: number = 0.5): boolean {
    return this.next() < probability
  }
}
