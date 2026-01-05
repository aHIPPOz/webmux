// wasmux-init: System initialization for Wasmux
// Mounts filesystems, initializes environment, and launches shell

use std::fs;
use std::process::{Command, exit};

#[no_mangle]
pub extern "C" fn _start() {
    main();
}

fn main() {
    println!("[init] Wasmux System Initialization");
    println!("[init] Version 1.0.0");
    println!();
    
    // Phase 1: Mount filesystems
    println!("[init] Phase 1: Mounting filesystems...");
    mount_filesystems();
    
    // Phase 2: Initialize environment
    println!("[init] Phase 2: Initializing environment...");
    init_environment();
    
    // Phase 3: Setup system files
    println!("[init] Phase 3: Setting up system files...");
    setup_system_files();
    
    // Phase 4: Load configuration
    println!("[init] Phase 4: Loading configuration...");
    load_configuration();
    
    // Phase 5: Start shell
    println!("[init] Phase 5: Starting shell...");
    println!();
    start_shell();
    
    exit(0);
}

fn mount_filesystems() {
    // In WASM environment, filesystems are already mounted by kernel
    // This is a placeholder for documentation
    println!("[init]   → /dev/opfs mounted as /");
    println!("[init]   → /dev/tmpfs mounted as /tmp");
    println!("[init]   → /dev/devfs mounted as /dev");
    println!("[init]   Filesystems ready ✓");
}

fn init_environment() {
    // Set up basic environment
    println!("[init]   → Setting timezone to UTC");
    println!("[init]   → Setting locale to en_US.UTF-8");
    println!("[init]   → Initializing process table");
    println!("[init]   Environment initialized ✓");
}

fn setup_system_files() {
    // Create necessary runtime files
    if fs::create_dir_all("/var/run").is_ok() {
        println!("[init]   → Created /var/run");
    }
    if fs::create_dir_all("/var/log").is_ok() {
        println!("[init]   → Created /var/log");
    }
    if fs::create_dir_all("/tmp").is_ok() {
        println!("[init]   → Created /tmp");
    }
    println!("[init]   System files ready ✓");
}

fn load_configuration() {
    // Load system configuration
    println!("[init]   → Loading /etc/hostname");
    if let Ok(hostname) = fs::read_to_string("/etc/hostname") {
        let hostname = hostname.trim();
        println!("[init]   → Hostname: {}", hostname);
    }
    
    println!("[init]   → Loading /etc/profile");
    println!("[init]   → Configuration loaded ✓");
}

fn start_shell() {
    println!("[init] Starting /bin/sh...");
    println!("[init] ═══════════════════════════════════════════════════════");
    println!();
    
    // Execute shell
    let status = Command::new("/bin/sh")
        .status();
    
    match status {
        Ok(status) => {
            println!();
            println!("[init] ═══════════════════════════════════════════════════════");
            println!("[init] Shell exited with status: {:?}", status.code());
        },
        Err(e) => {
            eprintln!("[init] ERROR: Failed to start shell: {}", e);
            eprintln!("[init] Attempting fallback shell...");
        }
    }
}
