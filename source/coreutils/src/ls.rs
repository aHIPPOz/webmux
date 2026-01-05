// ls - List directory contents
use std::fs;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let dir = if args.len() > 1 { &args[1] } else { "." };
    
    match fs::read_dir(dir) {
        Ok(entries) => {
            for entry in entries.flatten() {
                if let Some(name) = entry.file_name().into_string().ok() {
                    println!("{}", name);
                }
            }
        }
        Err(e) => eprintln!("ls: cannot open '{}': {}", dir, e),
    }
}
