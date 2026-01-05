// wasmux-sh: POSIX shell for Wasmux
// Interactive shell with command execution and environment support

use std::io::{self, BufRead, Write};
use std::process::{Command, Stdio};
use std::path::Path;

#[no_mangle]
pub extern "C" fn _start() {
    main();
}

fn main() {
    print_banner();
    println!();
    
    let mut shell = Shell::new();
    shell.run();
}

fn print_banner() {
    println!("╔═══════════════════════════════════════════════════════════╗");
    println!("║                                                           ║");
    println!("║           Wasmux Shell v1.0.0 - POSIX Compatible         ║");
    println!("║                                                           ║");
    println!("║  Type 'help' for commands, 'exit' to quit                ║");
    println!("║                                                           ║");
    println!("╚═══════════════════════════════════════════════════════════╝");
}

struct Shell {
    current_dir: String,
    username: String,
}

impl Shell {
    fn new() -> Self {
        Shell {
            current_dir: "/home/guest".to_string(),
            username: "guest".to_string(),
        }
    }
    
    fn run(&mut self) {
        let stdin = io::stdin();
        let mut stdout = io::stdout();
        let reader = stdin.lock();
        let mut lines = reader.lines();
        
        loop {
            print!("{}$ ", self.username);
            stdout.flush().unwrap();
            
            match lines.next() {
                Some(Ok(line)) => {
                    let trimmed = line.trim();
                    
                    if trimmed.is_empty() {
                        continue;
                    }
                    
                    if !self.handle_command(trimmed) {
                        break; // exit command
                    }
                }
                Some(Err(_)) | None => {
                    break;
                }
            }
        }
        
        println!("[sh] Exiting shell...");
    }
    
    fn handle_command(&mut self, input: &str) -> bool {
        let parts: Vec<&str> = input.split_whitespace().collect();
        
        if parts.is_empty() {
            return true;
        }
        
        match parts[0] {
            "exit" | "quit" => return false,
            "help" => self.cmd_help(),
            "echo" => self.cmd_echo(&parts[1..]),
            "pwd" => self.cmd_pwd(),
            "cd" => self.cmd_cd(&parts[1..]),
            "ls" => self.cmd_ls(&parts[1..]),
            "clear" => self.cmd_clear(),
            "whoami" => self.cmd_whoami(),
            "uname" => self.cmd_uname(),
            "date" => self.cmd_date(),
            _ => self.cmd_external(&parts),
        }
        
        true
    }
    
    fn cmd_help(&self) {
        println!("Available commands:");
        println!("  help          - Show this help message");
        println!("  echo [text]   - Print text");
        println!("  pwd           - Print working directory");
        println!("  cd [dir]      - Change directory");
        println!("  ls [dir]      - List directory");
        println!("  whoami        - Print current user");
        println!("  uname         - Print system information");
        println!("  date          - Print current date/time");
        println!("  clear         - Clear screen");
        println!("  exit/quit     - Exit shell");
    }
    
    fn cmd_echo(&self, args: &[&str]) {
        if !args.is_empty() {
            println!("{}", args.join(" "));
        }
    }
    
    fn cmd_pwd(&self) {
        println!("{}", self.current_dir);
    }
    
    fn cmd_cd(&mut self, args: &[&str]) {
        if args.is_empty() {
            self.current_dir = "/home/guest".to_string();
        } else {
            let new_dir = args[0];
            if Path::new(new_dir).exists() {
                self.current_dir = new_dir.to_string();
            } else {
                println!("[sh] cd: {}: No such file or directory", new_dir);
            }
        }
    }
    
    fn cmd_ls(&self, args: &[&str]) {
        let dir = if args.is_empty() { &self.current_dir } else { args[0] };
        
        match std::fs::read_dir(dir) {
            Ok(entries) => {
                for entry in entries.flatten() {
                    if let Some(name) = entry.file_name().into_string().ok() {
                        print!("{}  ", name);
                    }
                }
                println!();
            }
            Err(e) => println!("[sh] ls: cannot open {}: {}", dir, e),
        }
    }
    
    fn cmd_whoami(&self) {
        println!("{}", self.username);
    }
    
    fn cmd_uname(&self) {
        println!("Wasmux 1.0.0 wasmux wasm32 wasmux-wasi");
    }
    
    fn cmd_date(&self) {
        // Placeholder - would use system time
        println!("[sh] 2026-01-05 00:00:00 UTC");
    }
    
    fn cmd_clear(&self) {
        // Clear terminal
        print!("\x1B[2J\x1B[1;1H");
    }
    
    fn cmd_external(&self, parts: &[&str]) {
        // Try to execute external command
        let cmd = parts[0];
        let args = &parts[1..];
        
        match Command::new(cmd)
            .args(args)
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .status()
        {
            Ok(status) => {
                if !status.success() {
                    println!("[sh] command exited with status: {:?}", status.code());
                }
            }
            Err(_) => {
                println!("[sh] command not found: {}", cmd);
            }
        }
    }
}
