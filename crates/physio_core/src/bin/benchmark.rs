use physio_core::process_landmarks_and_impute;
use std::time::Instant;

fn main() {
    let mut dummy_buffer = vec![0.0f32; 132];
    for i in 0..33 {
        dummy_buffer[i * 4] = i as f32 * 0.1;
        dummy_buffer[i * 4 + 1] = i as f32 * 0.1;
        dummy_buffer[i * 4 + 2] = 0.0;
        if i >= 23 && i <= 28 {
            dummy_buffer[i * 4 + 3] = 0.1;
        } else {
            dummy_buffer[i * 4 + 3] = 0.9;
        }
    }
    for _ in 0..10_000 {
        let _ = process_landmarks_and_impute(&dummy_buffer);
    }
    let iterations = 1_000_000;
    let start = Instant::now();
    for _ in 0..iterations {
        let _ = process_landmarks_and_impute(&dummy_buffer);
    }
    let duration = start.elapsed();
    let total_us = duration.as_micros() as f64;
    let avg_us = total_us / (iterations as f64);
    println!("Rust Average time per frame: {:.4} microseconds", avg_us);
}
