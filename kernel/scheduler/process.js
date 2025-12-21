// kernel/scheduler/process.js


export class Process {
    constructor({ pid, wasmInstance, memory, argv = [], env = {} }) {
    this.pid = pid;
    this.instance = wasmInstance;
    this.memory = memory;
    
    
    this.argv = argv;
    this.env = env;
    
    
    this.state = 'READY'; // READY | RUNNING | BLOCKED | ZOMBIE
    this.exitCode = null;
    
    
    // file descriptors
    this.fdTable = new Map();
    this.nextFd = 3; // 0,1,2 reserved
    
    
    // signals
    this.pendingSignals = [];
    }
    }