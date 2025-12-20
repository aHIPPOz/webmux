export class Kernel {
    constructor(bootInfo) {
      this.processes = new Map();
      this.nextPid = 1;
      this.syscalls = {};
      this.bootInfo = bootInfo;
    }
  
    spawn(path, argv) {
      // charge un wasm depuis le VFS
    }
  
    run() {
      // boucle principale (coopérative au début)
    }
  }
  