// kernel/devices/gpu.js — GPU Device AMÉLIORÉ

export class GPUDevice {
  constructor(framebuffer) {
    console.log('[GPUDevice] Initializing...');
    this.name = 'gpu';
    this.path = '/dev/gpu0';
    this.fb = framebuffer;
    this.adapter = null;
    this.device = null;
    this.supported = typeof navigator !== 'undefined' && !!navigator.gpu;
  }

  async init() {
    try {
      if (!this.supported) {
        console.warn('[GPUDevice] WebGPU not available on this browser');
        return false;
      }

      console.log('[GPUDevice] Requesting GPU adapter...');
      this.adapter = await navigator.gpu.requestAdapter();

      if (!this.adapter) {
        console.warn('[GPUDevice] No GPU adapter available');
        return false;
      }

      console.log('[GPUDevice] Requesting GPU device...');
      this.device = await this.adapter.requestDevice();

      console.log('[GPUDevice] GPU device initialized ✓');
      return true;

    } catch (e) {
      console.error('[GPUDevice] Init error:', e.message);
      this.device = null;
      this.adapter = null;
      return false;
    }
  }

  getInfo() {
    try {
      return {
        supported: this.supported,
        initialized: !!this.device,
        adapter: this.adapter ? 'available' : 'not available',
        limits: this.device?.limits || null
      };
    } catch (e) {
      console.error('[GPUDevice] getInfo error:', e.message);
      return { supported: false, error: e.message };
    }
  }

  isAvailable() {
    return !!this.device;
  }
}
