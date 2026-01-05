// kernel/syscalls/signal_extended.js — Extended Signal Syscalls (COMPLET)

export function registerSignalExtendedSyscalls(kernel) {
  console.log('[Syscalls:signal_extended] Registering extended signal syscalls...');
  kernel.syscalls = kernel.syscalls || {};

  // signal: set signal handler (simplified)
  kernel.syscalls.signal = (proc, sig, handler) => {
    try {
      console.log(`[Syscall:signal] PID ${proc.pid} signal(${sig}, handler)`);

      if (typeof sig !== 'number' || sig < 0 || sig > 64) {
        throw new Error('EINVAL: invalid signal');
      }

      if (!proc.sighandlers) proc.sighandlers = {};
      
      // Store handler (could be function or SIG_DFL, SIG_IGN)
      proc.sighandlers[sig] = handler;
      console.log(`[Syscall:signal] Handler set for signal ${sig} ✓`);
      return handler;

    } catch (e) {
      console.error('[Syscall:signal] Error:', e.message);
      return -1;
    }
  };

  // sigaction: advanced signal handling
  kernel.syscalls.sigaction = (proc, sig, act, oldact) => {
    try {
      console.log(`[Syscall:sigaction] PID ${proc.pid} sigaction(${sig})`);

      if (typeof sig !== 'number' || sig < 0 || sig > 64) {
        throw new Error('EINVAL: invalid signal');
      }

      if (!proc.sigactions) proc.sigactions = {};

      // Get old action
      if (oldact) {
        oldact = proc.sigactions[sig] || { handler: null, mask: 0, flags: 0 };
      }

      // Set new action
      if (act) {
        proc.sigactions[sig] = {
          handler: act.handler || null,
          mask: act.mask || 0,
          flags: act.flags || 0
        };
      }

      console.log(`[Syscall:sigaction] Action set for signal ${sig} ✓`);
      return 0;

    } catch (e) {
      console.error('[Syscall:sigaction] Error:', e.message);
      return -1;
    }
  };

  // sigprocmask: manipulate signal mask
  kernel.syscalls.sigprocmask = (proc, how, set, oldset) => {
    try {
      console.log(`[Syscall:sigprocmask] PID ${proc.pid} sigprocmask(how=${how})`);

      if (!proc.sigmask) {
        proc.sigmask = 0;
      }

      // SIG_BLOCK=0, SIG_UNBLOCK=1, SIG_SETMASK=2
      if (oldset !== undefined) {
        oldset = proc.sigmask;
      }

      if (set !== undefined && typeof set === 'number') {
        switch (how) {
          case 0: // SIG_BLOCK
            proc.sigmask |= set;
            break;
          case 1: // SIG_UNBLOCK
            proc.sigmask &= ~set;
            break;
          case 2: // SIG_SETMASK
            proc.sigmask = set;
            break;
          default:
            throw new Error('EINVAL: invalid how');
        }
      }

      console.log(`[Syscall:sigprocmask] Mask set to 0x${proc.sigmask.toString(16)} ✓`);
      return 0;

    } catch (e) {
      console.error('[Syscall:sigprocmask] Error:', e.message);
      return -1;
    }
  };

  // sigpending: get pending signals
  kernel.syscalls.sigpending = (proc) => {
    try {
      console.log(`[Syscall:sigpending] PID ${proc.pid} sigpending()`);

      const pending = proc.pendingSignals || [];
      console.log(`[Syscall:sigpending] ${pending.length} signals pending`);
      return pending.slice();

    } catch (e) {
      console.error('[Syscall:sigpending] Error:', e.message);
      return [];
    }
  };

  // sigsuspend: atomically set mask and wait for signal
  kernel.syscalls.sigsuspend = async (proc, mask) => {
    try {
      console.log(`[Syscall:sigsuspend] PID ${proc.pid} sigsuspend(mask=0x${mask.toString(16)})`);

      if (!proc.sigmask) proc.sigmask = 0;
      const oldmask = proc.sigmask;
      proc.sigmask = mask;

      // Wait for signal (simplified: wait for any)
      let attempts = 0;
      while (attempts < 100) {
        if (proc.pendingSignals && proc.pendingSignals.length > 0) {
          const sig = proc.pendingSignals[0];
          proc.sigmask = oldmask;
          console.log(`[Syscall:sigsuspend] Interrupted by signal ${sig}`);
          return -1; // EINTR
        }
        await new Promise(r => setTimeout(r, 10));
        attempts++;
      }

      proc.sigmask = oldmask;
      console.log(`[Syscall:sigsuspend] Timeout`);
      return 0;

    } catch (e) {
      console.error('[Syscall:sigsuspend] Error:', e.message);
      return -1;
    }
  };

  console.log('[Syscalls:signal_extended] Registered ✓');
}
