// mv - Move/rename files
use std::fs;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    
    if args.len() < 3 {
        eprintln!("mv: Usage: mv SRC DST");
        return;
    }
    
    let src = &args[1];
    let dst = &args[2];
    
    match fs::rename(src, dst) {
        Ok(_) => println!("mv: moved '{}' to '{}'", src, dst),
        Err(e) => eprintln!("mv: cannot move '{}' to '{}': {}", src, dst, e),
    }
}
