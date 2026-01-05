// kernel/devices/framebuffer.js — Framebuffer Device AMÉLIORÉ

export class FramebufferDevice {
  constructor(bootInfo = {}) {
    console.log('[FramebufferDevice] Initializing...');
    this.name = 'framebuffer';
    this.path = '/dev/fb0';
    
    try {
      this.canvas = document.getElementById(bootInfo.canvasId || 'screen');
      if (!this.canvas) {
        throw new Error('Canvas element not found');
      }
      
      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) {
        throw new Error('2D context not available');
      }
      
      console.log(`[FramebufferDevice] Canvas ${this.canvas.width}x${this.canvas.height} ✓`);
    } catch (e) {
      console.error('[FramebufferDevice] Init error:', e.message);
      this.canvas = null;
      this.ctx = null;
    }
  }

  write(buffer) {
    try {
      if (!this.ctx || !this.canvas) {
        console.warn('[FramebufferDevice] Canvas context not available');
        return;
      }

      // Convert buffer to ImageData
      if (buffer instanceof Uint8ClampedArray || buffer instanceof Uint8Array) {
        const img = new ImageData(buffer, this.canvas.width, this.canvas.height);
        this.ctx.putImageData(img, 0, 0);
        console.log('[FramebufferDevice] Rendered frame');
      } else {
        console.warn('[FramebufferDevice] Invalid buffer format');
      }
    } catch (e) {
      console.error('[FramebufferDevice] Write error:', e.message);
    }
  }

  clear() {
    try {
      if (this.ctx && this.canvas) {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        console.log('[FramebufferDevice] Screen cleared');
      }
    } catch (e) {
      console.error('[FramebufferDevice] Clear error:', e.message);
    }
  }

  drawText(text, x = 10, y = 20, color = '#fff') {
    try {
      if (this.ctx) {
        this.ctx.fillStyle = color;
        this.ctx.font = '14px monospace';
        this.ctx.fillText(text, x, y);
        console.log(`[FramebufferDevice] Drew text at (${x}, ${y})`);
      }
    } catch (e) {
      console.error('[FramebufferDevice] drawText error:', e.message);
    }
  }
}
