// echo - Print text
fn main() {
    let args: Vec<String> = std::env::args().collect();
    
    if args.len() > 1 {
        println!("{}", args[1..].join(" "));
    }
}
