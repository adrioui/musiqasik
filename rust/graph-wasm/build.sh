#!/bin/bash
set -e

echo "Building graph-wasm..."
wasm-pack build --target web --out-dir ../../src/wasm/pkg

echo "Optimizing WASM binary..."
if command -v wasm-opt &> /dev/null; then
    wasm-opt -Oz -o ../../src/wasm/pkg/graph_wasm_bg_opt.wasm ../../src/wasm/pkg/graph_wasm_bg.wasm
    mv ../../src/wasm/pkg/graph_wasm_bg_opt.wasm ../../src/wasm/pkg/graph_wasm_bg.wasm
    echo "WASM optimized with wasm-opt"
else
    echo "wasm-opt not found, skipping optimization"
fi

echo "Build complete!"
ls -la ../../src/wasm/pkg/
