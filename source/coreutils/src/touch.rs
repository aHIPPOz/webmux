// touch - Create or update file timestamps
use std::fs::File;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    
    if args.len() < 2 {
        eprintln!("touch: Usage: touch FILE...");
        return;
    }
    
    for file in &args[1..] {
        match File::create(file) {
            Ok(_) => println!("touch: created '{}'", file),
            Err(e) => eprintln!("touch: cannot create '{}': {}", file, e),
        }
    }
}
