// kernel/scheduler/scheduler.js — Scheduler AMÉLIORÉ

export class Scheduler {
  constructor(kernel) {
    console.log('[Scheduler] Initializing...');
    this.kernel = kernel;
    this.runQueue = [];
    this.running = false;
    this.tickCount = 0;
    this.processedCount = 0;
  }

  addProcess(proc) {
    try {
      if (!proc || !proc.pid) {
        throw new Error('Invalid process object');
      }
      this.runQueue.push(proc);
      console.log(`[Scheduler] Process PID ${proc.pid} added to run queue (queue size: ${this.runQueue.length})`);
    } catch (e) {
      console.error('[Scheduler] addProcess error:', e.message);
    }
  }

  removeProcess(proc) {
    try {
      const idx = this.runQueue.indexOf(proc);
      if (idx >= 0) {
        this.runQueue.splice(idx, 1);
        console.log(`[Scheduler] Process PID ${proc.pid} removed from run queue`);
        return true;
      }
      return false;
    } catch (e) {
      console.error('[Scheduler] removeProcess error:', e.message);
      return false;
    }
  }

  schedule() {
    if (this.running) {
      console.warn('[Scheduler] Already running');
      return;
    }

    console.log('[Scheduler] Schedule START');
    this.running = true;

    const tick = () => {
      try {
        this.tickCount++;

        if (this.runQueue.length === 0) {
          console.log(`[Scheduler] No processes in queue — idle`);
          this.running = false;
          console.log(`[Scheduler] Schedule STOPPED (${this.tickCount} ticks, ${this.processedCount} processes)`);
          return;
        }

        // Get next process from queue
        const proc = this.runQueue.shift();

        if (!proc) {
          // Re-schedule if queue is empty
          setTimeout(tick, 0);
          return;
        }

        // Check process state
        if (proc.state === 'ZOMBIE') {
          console.log(`[Scheduler] Skipping zombie PID ${proc.pid}`);
          this.processedCount++;
          setTimeout(tick, 0);
          return;
        }

        // Run process
        if (proc.state !== 'RUNNING') {
          proc.state = 'RUNNING';
        }

        console.log(`[Scheduler] Running PID ${proc.pid} (queue: ${this.runQueue.length})`);
        this.processedCount++;

        // Re-queue if not done
        if (proc.alive && proc.state !== 'ZOMBIE') {
          this.runQueue.push(proc);
        }

        // Schedule next tick
        setTimeout(tick, 10); // Cooperative 10ms ticks

      } catch (e) {
        console.error('[Scheduler] tick error:', e.message);
        this.running = false;
      }
    };

    tick();
  }

  getStats() {
    return {
      running: this.running,
      queueLength: this.runQueue.length,
      tickCount: this.tickCount,
      processedCount: this.processedCount
    };
  }
}
