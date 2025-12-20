// kernel/devices/gpu.js


export class GPUDevice {
    constructor(framebuffer) {
    this.name = 'gpu';
    this.path = '/dev/gpu0';
    this.fb = framebuffer;
    this.adapter = null;
    this.device = null;
    }
    
    
    async init() {
    if (!navigator.gpu) {
    console.warn('WebGPU not available');
    return;
    }
    this.adapter = await navigator.gpu.requestAdapter();
    this.device = await this.adapter.requestDevice();
    console.log('GPU ready');
    }
    
    
    getInfo() {
    return {
    api: 'webgpu',
    limits: this.device?.limits || null
    };
    }
    }