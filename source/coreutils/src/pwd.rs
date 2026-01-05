// pwd - Print working directory
use std::env;

fn main() {
    match env::current_dir() {
        Ok(dir) => println!("{}", dir.display()),
        Err(e) => eprintln!("pwd: {}", e),
    }
}
