// kernel/scheduler/scheduler.js


export class Scheduler {
    constructor(kernel) {
    this.kernel = kernel;
    this.runQueue = [];
    this.running = false;
    }
    
    
    addProcess(proc) {
    this.runQueue.push(proc);
    }
    
    
    schedule() {
    if (this.running) return;
    this.running = true;
    
    
    const tick = () => {
    if (this.runQueue.length === 0) {
    this.running = false;
    return;
    }
    
    
    const proc = this.runQueue.shift();
    if (proc.state === 'READY') {
    proc.state = 'RUNNING';
    this.kernel.runProcess(proc);
    }
    
    
    if (proc.state === 'READY' || proc.state === 'BLOCKED') {
    this.runQueue.push(proc);
    }
    
    
    setTimeout(tick, 0);
    };
    
    
    tick();
    }
    }