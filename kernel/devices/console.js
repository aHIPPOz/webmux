// kernel/devices/console.js — Console Device AMÉLIORÉ

export class ConsoleDevice {
  constructor() {
    console.log('[ConsoleDevice] Initializing...');
    this.name = 'console';
    this.path = '/dev/console';
    this.outputBuffer = [];
    this.maxBufferSize = 1000;
  }

  write(str) {
    try {
      const message = String(str).trim();
      if (!message) return;
      
      // Log to browser console
      console.log('[ConsoleDevice:write]', message);
      
      // Store in buffer
      this.outputBuffer.push({
        timestamp: new Date().toISOString(),
        text: message
      });
      
      // Keep buffer size reasonable
      if (this.outputBuffer.length > this.maxBufferSize) {
        this.outputBuffer.shift();
      }
    } catch (e) {
      console.error('[ConsoleDevice] Write error:', e.message);
    }
  }

  read() {
    // Console read always returns null (input not supported)
    return null;
  }

  getBuffer() {
    return this.outputBuffer.slice();
  }

  clearBuffer() {
    this.outputBuffer = [];
    console.log('[ConsoleDevice] Buffer cleared');
  }
}
