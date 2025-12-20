// kernel/devices/framebuffer.js


export class FramebufferDevice {
    constructor(bootInfo) {
    this.name = 'framebuffer';
    this.path = '/dev/fb0';
    this.canvas = document.getElementById(bootInfo.canvasId);
    this.ctx = this.canvas.getContext('2d');
    }
    
    
    write(buffer) {
    const img = new ImageData(buffer, this.canvas.width, this.canvas.height);
    this.ctx.putImageData(img, 0, 0);
    }
    }