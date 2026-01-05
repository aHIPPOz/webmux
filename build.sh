#!/bin/bash
# Wasmux Build System
# Compiles all packages to WASM and deploys to rootfs

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$PROJECT_ROOT/source"
ROOTFS_DIR="$PROJECT_ROOT/rootfs"
BIN_DIR="$PROJECT_ROOT/bin"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Wasmux Build System - WASM Compilation            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check for Rust and WASM target
echo "[Build] Checking Rust installation..."
if ! command -v rustup &> /dev/null; then
    echo -e "${RED}ERROR: Rust not installed${NC}"
    echo "Install from: https://rustup.rs/"
    exit 1
fi

echo "[Build] Checking wasm32-wasi target..."
if ! rustup target list | grep -q "wasm32-wasi (installed)"; then
    echo -e "${YELLOW}Installing wasm32-wasi target...${NC}"
    rustup target add wasm32-wasi
fi

# Create output directory
mkdir -p "$BIN_DIR"

# Build packages
echo ""
echo "[Build] Starting compilation..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to build package
build_package() {
    local package=$1
    local output=$2
    
    echo -e "${YELLOW}[Build]${NC} Building $package..."
    
    if [ -d "$SOURCE_DIR/$package" ]; then
        cd "$SOURCE_DIR/$package"
        
        RUSTFLAGS="-C opt-level=z -C lto" \
        cargo build --release --target wasm32-wasi 2>&1 | grep -E "(Compiling|Finished|error)" || true
        
        local wasm_file="target/wasm32-wasi/release/${output}.wasm"
        
        if [ -f "$wasm_file" ]; then
            cp "$wasm_file" "$BIN_DIR/${output}.wasm"
            echo -e "${GREEN}✓${NC} Built: $output.wasm"
        else
            echo -e "${RED}✗${NC} Failed to build $output"
        fi
    else
        echo -e "${RED}✗${NC} Package not found: $package"
    fi
    echo ""
}

# Build all packages
build_package "libc-wrapper" "libc"
build_package "init" "init"
build_package "sh" "sh"

# Build coreutils
cd "$SOURCE_DIR/coreutils"
echo -e "${YELLOW}[Build]${NC} Building coreutils..."
RUSTFLAGS="-C opt-level=z -C lto" \
cargo build --release --target wasm32-wasi 2>&1 | grep -E "(Compiling|Finished|error)" || true

for util in ls cat echo mkdir rm cp mv touch whoami pwd; do
    local wasm_file="target/wasm32-wasi/release/${util}.wasm"
    if [ -f "$wasm_file" ]; then
        cp "$wasm_file" "$BIN_DIR/${util}.wasm"
        echo -e "${GREEN}✓${NC} Built: $util.wasm"
    fi
done
echo ""

# Deploy to rootfs
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[Deploy] Moving binaries to rootfs..."
echo ""

# Deploy init
if [ -f "$BIN_DIR/init.wasm" ]; then
    cp "$BIN_DIR/init.wasm" "$ROOTFS_DIR/sbin/init.wasm"
    echo -e "${GREEN}✓${NC} Deployed: /sbin/init.wasm"
fi

# Deploy shell
if [ -f "$BIN_DIR/sh.wasm" ]; then
    cp "$BIN_DIR/sh.wasm" "$ROOTFS_DIR/bin/sh.wasm"
    echo -e "${GREEN}✓${NC} Deployed: /bin/sh.wasm"
fi

# Deploy coreutils
mkdir -p "$ROOTFS_DIR/usr/bin"
for util in ls cat echo mkdir rm cp mv touch whoami pwd; do
    if [ -f "$BIN_DIR/${util}.wasm" ]; then
        cp "$BIN_DIR/${util}.wasm" "$ROOTFS_DIR/usr/bin/${util}.wasm"
        echo -e "${GREEN}✓${NC} Deployed: /usr/bin/${util}.wasm"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}[Build]${NC} Compilation complete!"
echo ""
echo "WASM binaries location:"
echo "  Source: $BIN_DIR/"
echo "  Deployed: $ROOTFS_DIR/"
echo ""
echo "Ready to boot! Open index.html to start the system."
