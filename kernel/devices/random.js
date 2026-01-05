// kernel/devices/random.js — Random Device AMÉLIORÉ

export class RandomDevice {
  constructor() {
    console.log('[RandomDevice] Initializing...');
    this.name = 'random';
    this.path = '/dev/random';
    this.bytesGenerated = 0;
  }

  read(n = 32) {
    try {
      if (n < 0 || n > 65536) {
        console.warn(`[RandomDevice] Invalid size ${n}, clamping to [1, 65536]`);
        n = Math.min(65536, Math.max(1, n));
      }

      const buf = new Uint8Array(n);
      
      // Use crypto.getRandomValues if available
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(buf);
        this.bytesGenerated += n;
        console.log(`[RandomDevice] Generated ${n} random bytes`);
        return buf;
      }

      // Fallback: use Math.random (weaker)
      console.warn('[RandomDevice] crypto.getRandomValues not available, using Math.random fallback');
      for (let i = 0; i < n; i++) {
        buf[i] = Math.floor(Math.random() * 256);
      }
      this.bytesGenerated += n;
      return buf;

    } catch (e) {
      console.error('[RandomDevice] Read error:', e.message);
      // Return zeros as fallback
      return new Uint8Array(n);
    }
  }

  getStats() {
    return {
      bytesGenerated: this.bytesGenerated,
      available: typeof crypto !== 'undefined' && crypto.getRandomValues ? 'crypto' : 'math.random'
    };
  }
}
