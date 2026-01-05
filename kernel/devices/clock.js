// kernel/devices/clock.js — Clock Device AMÉLIORÉ

export class ClockDevice {
  constructor() {
    console.log('[ClockDevice] Initializing...');
    this.name = 'clock';
    this.path = '/dev/clock';
    this.startTime = performance.now();
    this.startDate = new Date();
  }

  now() {
    try {
      const elapsed = performance.now();
      return elapsed;
    } catch (e) {
      console.error('[ClockDevice] now() error:', e.message);
      return 0;
    }
  }

  nowNs() {
    try {
      // Return nanoseconds (as BigInt to avoid precision loss)
      const ms = performance.now();
      return BigInt(Math.floor(ms * 1e6));
    } catch (e) {
      console.error('[ClockDevice] nowNs() error:', e.message);
      return BigInt(0);
    }
  }

  uptime() {
    try {
      return performance.now() - this.startTime;
    } catch (e) {
      console.error('[ClockDevice] uptime() error:', e.message);
      return 0;
    }
  }

  getDate() {
    try {
      return new Date();
    } catch (e) {
      console.error('[ClockDevice] getDate() error:', e.message);
      return this.startDate;
    }
  }
}
