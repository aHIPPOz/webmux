// kernel/devices/input.js — Input Device AMÉLIORÉ

export class InputDevice {
  constructor() {
    console.log('[InputDevice] Initializing...');
    this.name = 'input';
    this.path = '/dev/input0';
    this.queue = [];
    this.maxQueueSize = 100;
    this.eventCount = 0;
  }

  init() {
    try {
      console.log('[InputDevice] Setting up keyboard listener...');

      window.addEventListener('keydown', (e) => {
        try {
          const event = {
            type: 'keydown',
            key: e.key,
            code: e.code,
            timestamp: performance.now()
          };
          this.queue.push(event);
          this.eventCount++;

          // Keep queue size bounded
          if (this.queue.length > this.maxQueueSize) {
            this.queue.shift();
          }

          console.log(`[InputDevice] Keydown: ${e.key} (${e.code})`);
        } catch (err) {
          console.error('[InputDevice] Keydown handler error:', err.message);
        }
      });

      window.addEventListener('keyup', (e) => {
        try {
          const event = {
            type: 'keyup',
            key: e.key,
            code: e.code,
            timestamp: performance.now()
          };
          this.queue.push(event);
          this.eventCount++;

          if (this.queue.length > this.maxQueueSize) {
            this.queue.shift();
          }

          console.log(`[InputDevice] Keyup: ${e.key}`);
        } catch (err) {
          console.error('[InputDevice] Keyup handler error:', err.message);
        }
      });

      console.log('[InputDevice] Keyboard listeners installed ✓');
    } catch (e) {
      console.error('[InputDevice] Init error:', e.message);
    }
  }

  read() {
    try {
      const event = this.queue.shift();
      if (event) {
        console.log(`[InputDevice] Read event: ${event.type} ${event.key}`);
      }
      return event || null;
    } catch (e) {
      console.error('[InputDevice] Read error:', e.message);
      return null;
    }
  }

  getQueueSize() {
    return this.queue.length;
  }

  getStats() {
    return {
      queueSize: this.queue.length,
      totalEvents: this.eventCount,
      maxQueueSize: this.maxQueueSize
    };
  }

  clearQueue() {
    const size = this.queue.length;
    this.queue = [];
    console.log(`[InputDevice] Queue cleared (${size} events removed)`);
  }
}
