// WASI/Wasmux libc wrapper
// Provides standard library bindings for WASM programs

pub fn hello() -> &'static str {
    "Wasmux libc wrapper v1.0.0"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hello() {
        assert_eq!(hello(), "Wasmux libc wrapper v1.0.0");
    }
}
