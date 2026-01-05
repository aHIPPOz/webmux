// kernel/scheduler/process.js — Process AMÉLIORÉ

export class Process {
  constructor({ pid, wasmInstance, memory, argv = [], env = {} }) {
    console.log(`[Process] Creating PID ${pid}`);
    
    this.pid = pid;
    this.instance = wasmInstance;
    this.memory = memory;

    this.argv = Array.isArray(argv) ? argv : [];
    this.env = typeof env === 'object' ? env : {};

    // Process state: READY | RUNNING | BLOCKED | ZOMBIE
    this.state = 'READY';
    this.exitCode = null;
    this.alive = true;

    // File descriptors
    this.fdTable = new Map();
    this.nextFd = 3; // 0=stdin, 1=stdout, 2=stderr reserved

    // Signals
    this.pendingSignals = [];

    // Timestamps
    this.createdAt = performance.now();
    this.startedAt = null;
    this.endedAt = null;

    console.log(`[Process] PID ${pid} created (state: ${this.state})`);
  }

  // Get process runtime in milliseconds
  getRuntime() {
    if (!this.startedAt) return 0;
    const endTime = this.endedAt || performance.now();
    return endTime - this.startedAt;
  }

  // Mark process as started
  start() {
    if (!this.startedAt) {
      this.startedAt = performance.now();
      this.state = 'RUNNING';
      console.log(`[Process] PID ${this.pid} started`);
    }
  }

  // Mark process as ended
  end(exitCode = 0) {
    try {
      if (!this.endedAt) {
        this.endedAt = performance.now();
        this.exitCode = exitCode;
        this.state = 'ZOMBIE';
        this.alive = false;
        const runtime = this.getRuntime().toFixed(2);
        console.log(`[Process] PID ${this.pid} ended (code: ${exitCode}, runtime: ${runtime}ms)`);
      }
    } catch (e) {
      console.error(`[Process] end error:`, e.message);
    }
  }

  // Open file descriptor
  openFd(kind, metadata) {
    try {
      const fd = this.nextFd++;
      this.fdTable.set(fd, { kind, ...metadata });
      console.log(`[Process] PID ${this.pid} opened FD ${fd} (kind: ${kind})`);
      return fd;
    } catch (e) {
      console.error(`[Process] openFd error:`, e.message);
      return -1;
    }
  }

  // Close file descriptor
  closeFd(fd) {
    try {
      if (this.fdTable.has(fd)) {
        const entry = this.fdTable.get(fd);
        this.fdTable.delete(fd);
        console.log(`[Process] PID ${this.pid} closed FD ${fd}`);
        return 0;
      }
      console.warn(`[Process] PID ${this.pid} FD ${fd} not found`);
      return -1;
    } catch (e) {
      console.error(`[Process] closeFd error:`, e.message);
      return -1;
    }
  }

  // Get file descriptor entry
  getFd(fd) {
    return this.fdTable.get(fd) || null;
  }

  // Queue a signal
  queueSignal(sig) {
    try {
      if (!Array.isArray(this.pendingSignals)) {
        this.pendingSignals = [];
      }
      this.pendingSignals.push(sig);
      console.log(`[Process] PID ${this.pid} signal ${sig} queued`);
      return true;
    } catch (e) {
      console.error(`[Process] queueSignal error:`, e.message);
      return false;
    }
  }

  // Get next pending signal
  dequeueSignal() {
    if (!Array.isArray(this.pendingSignals) || this.pendingSignals.length === 0) {
      return null;
    }
    return this.pendingSignals.shift();
  }

  // Get process stats
  getStats() {
    return {
      pid: this.pid,
      state: this.state,
      alive: this.alive,
      exitCode: this.exitCode,
      runtime: this.getRuntime(),
      fdCount: this.fdTable.size,
      pendingSignals: this.pendingSignals.length,
      argv: this.argv,
      envKeys: Object.keys(this.env)
    };
  }

  toString() {
    return `Process(pid=${this.pid}, state=${this.state}, runtime=${this.getRuntime().toFixed(2)}ms)`;
  }
}
