// rm - Remove files
use std::fs;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    
    if args.len() < 2 {
        eprintln!("rm: Usage: rm FILE...");
        return;
    }
    
    for file in &args[1..] {
        match fs::remove_file(file) {
            Ok(_) => println!("rm: removed '{}'", file),
            Err(e) => eprintln!("rm: cannot remove '{}': {}", file, e),
        }
    }
}
