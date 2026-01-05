// cp - Copy files
use std::fs;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    
    if args.len() < 3 {
        eprintln!("cp: Usage: cp SRC DST");
        return;
    }
    
    let src = &args[1];
    let dst = &args[2];
    
    match fs::copy(src, dst) {
        Ok(_) => println!("cp: copied '{}' to '{}'", src, dst),
        Err(e) => eprintln!("cp: cannot copy '{}' to '{}': {}", src, dst, e),
    }
}
