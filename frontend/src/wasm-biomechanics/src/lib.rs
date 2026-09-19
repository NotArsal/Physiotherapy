use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use std::f64::consts::PI;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator to keep the Wasm footprint extremely small.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[derive(Serialize, Deserialize, Debug)]
pub struct Landmark {
    pub x: f64,
    pub y: f64,
    pub z: Option<f64>,
    pub visibility: Option<f64>,
}

/// A simple struct to represent 2D points for math
struct Point {
    x: f64,
    y: f64,
}

impl Point {
    fn from_landmark(lm: &Landmark) -> Self {
        Point { x: lm.x, y: lm.y }
    }
}

/// Set up the panic hook so errors bubble up to JS console beautifully
#[wasm_bindgen(start)]
pub fn main_js() -> Result<(), JsValue> {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
    Ok(())
}

/// Calculate the angle between three points (vertex is p2)
#[wasm_bindgen]
pub fn calculate_angle_wasm(
    p1_x: f64, p1_y: f64, 
    p2_x: f64, p2_y: f64, 
    p3_x: f64, p3_y: f64
) -> f64 {
    let v1_x = p1_x - p2_x;
    let v1_y = p1_y - p2_y;
    
    let v2_x = p3_x - p2_x;
    let v2_y = p3_y - p2_y;
    
    let dot = v1_x * v2_x + v1_y * v2_y;
    let mag1 = (v1_x * v1_x + v1_y * v1_y).sqrt();
    let mag2 = (v2_x * v2_x + v2_y * v2_y).sqrt();
    
    if mag1 == 0.0 || mag2 == 0.0 {
        return 0.0;
    }
    
    let mut cos_angle = dot / (mag1 * mag2);
    // Clamp to prevent NaN due to floating point inaccuracies
    if cos_angle > 1.0 { cos_angle = 1.0; }
    if cos_angle < -1.0 { cos_angle = -1.0; }
    
    let angle_rad = cos_angle.acos();
    angle_rad * 180.0 / PI
}

fn calc_angle_from_pts(p1: &Point, p2: &Point, p3: &Point) -> f64 {
    calculate_angle_wasm(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y)
}

/// Extracts the 9 critical joint angles from a 33-point MediaPipe array.
/// Passing JSON overhead is minimized by using serde_wasm_bindgen.
#[wasm_bindgen]
pub fn extract_joint_angles_wasm(flat_landmarks: &[f32]) -> Result<Vec<f64>, JsValue> {
    if flat_landmarks.len() < 33 * 4 {
        return Ok(vec![0.0; 9]);
    }
    
    let get_pt = |idx: usize| -> Point {
        let base = idx * 4;
        Point {
            x: *flat_landmarks.get(base).unwrap_or(&0.0) as f64,
            y: *flat_landmarks.get(base + 1).unwrap_or(&0.0) as f64,
        }
    };

    let l_shoulder = get_pt(11);
    let r_shoulder = get_pt(12);
    let l_elbow = get_pt(13);
    let r_elbow = get_pt(14);
    let l_wrist = get_pt(15);
    let r_wrist = get_pt(16);
    let l_hip = get_pt(23);
    let r_hip = get_pt(24);
    let l_knee = get_pt(25);
    let r_knee = get_pt(26);
    let l_ankle = get_pt(27);
    let r_ankle = get_pt(28);
    
    let mut angles = Vec::with_capacity(9);
    
    // 0: Left shoulder (hip-shoulder-elbow)
    angles.push(calc_angle_from_pts(&l_hip, &l_shoulder, &l_elbow));
    // 1: Right shoulder (hip-shoulder-elbow)
    angles.push(calc_angle_from_pts(&r_hip, &r_shoulder, &r_elbow));
    
    // 2: Left elbow (shoulder-elbow-wrist)
    angles.push(calc_angle_from_pts(&l_shoulder, &l_elbow, &l_wrist));
    // 3: Right elbow (shoulder-elbow-wrist)
    angles.push(calc_angle_from_pts(&r_shoulder, &r_elbow, &r_wrist));
    
    // 4: Left hip (shoulder-hip-knee)
    angles.push(calc_angle_from_pts(&l_shoulder, &l_hip, &l_knee));
    // 5: Right hip (shoulder-hip-knee)
    angles.push(calc_angle_from_pts(&r_shoulder, &r_hip, &r_knee));
    
    // 6: Left knee (hip-knee-ankle)
    angles.push(calc_angle_from_pts(&l_hip, &l_knee, &l_ankle));
    // 7: Right knee (hip-knee-ankle)
    angles.push(calc_angle_from_pts(&r_hip, &r_knee, &r_ankle));
    
    // 8: Spine angle (approximation)
    let shoulder_mid_x = (l_shoulder.x + r_shoulder.x) / 2.0;
    let shoulder_mid_y = (l_shoulder.y + r_shoulder.y) / 2.0;
    let hip_mid_x = (l_hip.x + r_hip.x) / 2.0;
    let hip_mid_y = (l_hip.y + r_hip.y) / 2.0;
    
    let shoulder_mid = Point { x: shoulder_mid_x, y: shoulder_mid_y };
    let hip_mid = Point { x: hip_mid_x, y: hip_mid_y };
    let vertical_ref = Point { x: shoulder_mid_x, y: shoulder_mid_y - 1.0 };
    
    angles.push(calc_angle_from_pts(&vertical_ref, &shoulder_mid, &hip_mid));
    
    Ok(angles)
}
