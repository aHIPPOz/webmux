// kernel/devices/audio.js — Audio Device AMÉLIORÉ

export class AudioDevice {
  constructor() {
    console.log('[AudioDevice] Initializing...');
    this.name = 'audio';
    this.path = '/dev/audio';
    
    // Initialize audio context
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = AudioContextClass ? new AudioContextClass() : null;
    
    if (this.ctx) {
      console.log('[AudioDevice] AudioContext initialized ✓');
    } else {
      console.warn('[AudioDevice] Web Audio API not available');
    }

    this.tonesPlayed = 0;
  }

  playTone(freq = 440, duration = 0.2, volume = 0.3) {
    try {
      if (!this.ctx) {
        console.warn('[AudioDevice] AudioContext not available');
        return false;
      }

      // Validate parameters
      if (typeof freq !== 'number' || freq < 20 || freq > 20000) {
        console.warn(`[AudioDevice] Invalid frequency: ${freq}, using 440Hz`);
        freq = 440;
      }

      if (typeof duration !== 'number' || duration < 0 || duration > 30) {
        console.warn(`[AudioDevice] Invalid duration: ${duration}, using 0.2s`);
        duration = 0.2;
      }

      if (typeof volume !== 'number' || volume < 0 || volume > 1) {
        volume = Math.max(0, Math.min(1, volume));
      }

      console.log(`[AudioDevice] Playing tone: ${freq}Hz, ${duration}s, vol=${volume}`);

      // Create oscillator and gain node
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;
      
      gain.gain.value = volume;
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

      // Connect nodes
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      // Play
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + duration);

      this.tonesPlayed++;
      return true;

    } catch (e) {
      console.error('[AudioDevice] playTone error:', e.message);
      return false;
    }
  }

  write(data) {
    try {
      if (!data) {
        console.warn('[AudioDevice] No data to write');
        return;
      }

      // Support multiple input formats
      if (typeof data === 'object' && 'freq' in data) {
        // Object format: { freq, duration, volume }
        this.playTone(data.freq, data.duration || 0.2, data.volume || 0.3);
      } else if (typeof data === 'number') {
        // Number format: frequency in Hz
        this.playTone(data, 0.2, 0.3);
      } else {
        console.warn('[AudioDevice] Invalid data format');
      }
    } catch (e) {
      console.error('[AudioDevice] Write error:', e.message);
    }
  }

  getStats() {
    return {
      available: !!this.ctx,
      tonesPlayed: this.tonesPlayed,
      audioContext: this.ctx ? 'available' : 'not available'
    };
  }
}
