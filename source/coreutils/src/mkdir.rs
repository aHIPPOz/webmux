// mkdir - Create directories
use std::fs;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    
    if args.len() < 2 {
        eprintln!("mkdir: Usage: mkdir DIR...");
        return;
    }
    
    for dir in &args[1..] {
        match fs::create_dir(dir) {
            Ok(_) => println!("mkdir: created directory '{}'", dir),
            Err(e) => eprintln!("mkdir: cannot create '{}': {}", dir, e),
        }
    }
}
