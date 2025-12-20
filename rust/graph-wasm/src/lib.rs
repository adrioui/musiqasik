use wasm_bindgen::prelude::*;

// When the `small` feature is enabled, use `talc` as the global allocator.
// talc is a modern WASM allocator that replaces the deprecated wee_alloc.
// It provides better performance (~6.7 actions/µs vs 5.9 for dlmalloc) with
// smaller binary size (14KB vs 17KB).
#[cfg(feature = "small")]
#[global_allocator]
static ALLOC: talc::Talck<talc::locking::AssumeUnlockable, talc::ClaimOnOom> = {
    static mut ARENA: [u8; 1024 * 1024] = [0; 1024 * 1024]; // 1MB arena
    let span = talc::Span::from_array(unsafe { &mut ARENA });
    talc::Talc::new(talc::ClaimOnOom::new(span)).lock()
};

// Initialize panic hook for better error messages in console
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Returns the WASM module version for verification
#[wasm_bindgen]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Simple health check function to verify WASM is loaded and working
#[wasm_bindgen]
pub fn health_check() -> bool {
    true
}

/// Benchmark function: sum numbers 0 to n
/// Used to compare JS vs WASM performance
#[wasm_bindgen]
pub fn benchmark_sum(n: u32) -> u64 {
    (0..=n as u64).sum()
}

/// Benchmark function: string operations
/// Simulates the .toLowerCase() normalization we'll need
#[wasm_bindgen]
pub fn benchmark_normalize(input: &str) -> String {
    input.to_lowercase()
}

/// Benchmark function: batch normalize strings
#[wasm_bindgen]
pub fn benchmark_batch_normalize(inputs: Vec<JsValue>) -> Vec<JsValue> {
    inputs
        .into_iter()
        .filter_map(|v| v.as_string())
        .map(|s| JsValue::from_str(&s.to_lowercase()))
        .collect()
}
