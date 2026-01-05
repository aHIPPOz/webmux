// cat - Concatenate and print files
use std::fs;
use std::io::{self, Read};

fn main() {
    let args: Vec<String> = std::env::args().collect();
    
    if args.len() < 2 {
        eprintln!("cat: Usage: cat FILE...");
        return;
    }
    
    for filename in &args[1..] {
        match fs::File::open(filename) {
            Ok(mut file) => {
                let mut contents = String::new();
                if file.read_to_string(&mut contents).is_ok() {
                    print!("{}", contents);
                } else {
                    eprintln!("cat: cannot read: {}", filename);
                }
            }
            Err(e) => eprintln!("cat: cannot open '{}': {}", filename, e),
        }
    }
}
