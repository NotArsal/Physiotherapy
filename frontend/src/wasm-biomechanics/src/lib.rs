use wasm_bindgen::prelude::*;
use std::f64::consts::PI;

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

// We use 33 landmarks * 4 (x, y, z, visibility) to match JS
pub const NUM_LANDMARKS: usize = 33;
pub const FLOATS_PER_LANDMARK: usize = 4;
pub const BUFFER_SIZE: usize = NUM_LANDMARKS * FLOATS_PER_LANDMARK;

static mut LANDMARK_BUFFER: [f32; BUFFER_SIZE] = [0.0; BUFFER_SIZE];

#[wasm_bindgen]
pub fn get_landmark_buffer_ptr() -> *const f32 {
    unsafe { LANDMARK_BUFFER.as_ptr() }
}

#[derive(Clone, Copy)]
struct Point {
    x: f32,
    y: f32,
    visibility: f32,
}

// 1 Euro Filter Implementation
pub struct OneEuroFilter {
    freq: f32,
    mincutoff: f32,
    beta: f32,
    dcutoff: f32,
    x_prev: f32,
    dx_prev: f32,
    first_time: bool,
}

impl OneEuroFilter {
    pub fn new(freq: f32, mincutoff: f32, beta: f32, dcutoff: f32) -> Self {
        Self {
            freq, mincutoff, beta, dcutoff,
            x_prev: 0.0, dx_prev: 0.0,
            first_time: true,
        }
    }
    
    fn alpha(&self, rate: f32, cutoff: f32) -> f32 {
        let tau = 1.0 / (2.0 * PI as f32 * cutoff);
        let te = 1.0 / rate;
        te / (te + tau)
    }
    
    fn filter_lowpass(&self, x: f32, x_prev: f32, alpha: f32) -> f32 {
        alpha * x + (1.0 - alpha) * x_prev
    }

    pub fn filter(&mut self, x: f32, rate: f32) -> f32 {
        if self.first_time {
            self.x_prev = x;
            self.dx_prev = 0.0;
            self.first_time = false;
            return x;
        }
        let dx = (x - self.x_prev) * rate;
        let edx = self.filter_lowpass(dx, self.dx_prev, self.alpha(rate, self.dcutoff));
        self.dx_prev = edx;
        let cutoff = self.mincutoff + self.beta * edx.abs();
        let filtered = self.filter_lowpass(x, self.x_prev, self.alpha(rate, cutoff));
        self.x_prev = filtered;
        filtered
    }
}

// We can hold filters globally to be applied across frames for the 9 joint angles
static mut FILTERS: Option<Vec<OneEuroFilter>> = None;

#[wasm_bindgen]
pub fn init_filters(rate: f32) {
    unsafe {
        let mut filters = Vec::with_capacity(9);
        for _ in 0..9 {
            // Default params for 1 Euro Filter
            filters.push(OneEuroFilter::new(rate, 1.0, 0.0, 1.0));
        }
        FILTERS = Some(filters);
    }
}

fn calc_angle_from_pts(p1: &Point, p2: &Point, p3: &Point) -> f32 {
    // If any point is occluded (visibility < 0.4), return NaN to signify invalid angle
    if p1.visibility < 0.4 || p2.visibility < 0.4 || p3.visibility < 0.4 {
        return f32::NAN;
    }

    let v1_x = p1.x - p2.x;
    let v1_y = p1.y - p2.y;
    
    let v2_x = p3.x - p2.x;
    let v2_y = p3.y - p2.y;
    
    let dot = v1_x * v2_x + v1_y * v2_y;
    let mag1 = (v1_x * v1_x + v1_y * v1_y).sqrt();
    let mag2 = (v2_x * v2_x + v2_y * v2_y).sqrt();
    
    if mag1 < 1e-6 || mag2 < 1e-6 {
        return f32::NAN;
    }
    
    let mut cos_angle = dot / (mag1 * mag2);
    if cos_angle > 1.0 { cos_angle = 1.0; }
    if cos_angle < -1.0 { cos_angle = -1.0; }
    
    let angle_rad = cos_angle.acos();
    angle_rad * 180.0 / (PI as f32)
}

static mut LAST_VALID_ANGLES: [f32; 9] = [0.0; 9];

#[wasm_bindgen]
pub fn process_current_frame(rate: f32) -> Vec<f32> {
    let get_pt = |idx: usize| -> Point {
        let base = idx * 4;
        unsafe {
            Point {
                x: LANDMARK_BUFFER[base],
                y: LANDMARK_BUFFER[base + 1],
                visibility: LANDMARK_BUFFER[base + 3],
            }
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

    let mut angles = vec![0.0; 9];
    angles[0] = calc_angle_from_pts(&l_hip, &l_shoulder, &l_elbow);
    angles[1] = calc_angle_from_pts(&r_hip, &r_shoulder, &r_elbow);
    angles[2] = calc_angle_from_pts(&l_shoulder, &l_elbow, &l_wrist);
    angles[3] = calc_angle_from_pts(&r_shoulder, &r_elbow, &r_wrist);
    angles[4] = calc_angle_from_pts(&l_shoulder, &l_hip, &l_knee);
    angles[5] = calc_angle_from_pts(&r_shoulder, &r_hip, &r_knee);
    angles[6] = calc_angle_from_pts(&l_hip, &l_knee, &l_ankle);
    angles[7] = calc_angle_from_pts(&r_hip, &r_knee, &r_ankle);

    let shoulder_mid = Point {
        x: (l_shoulder.x + r_shoulder.x) / 2.0,
        y: (l_shoulder.y + r_shoulder.y) / 2.0,
        visibility: f32::min(l_shoulder.visibility, r_shoulder.visibility),
    };
    let hip_mid = Point {
        x: (l_hip.x + r_hip.x) / 2.0,
        y: (l_hip.y + r_hip.y) / 2.0,
        visibility: f32::min(l_hip.visibility, r_hip.visibility),
    };
    let vertical_ref = Point {
        x: shoulder_mid.x,
        y: shoulder_mid.y - 1.0,
        visibility: shoulder_mid.visibility,
    };
    angles[8] = calc_angle_from_pts(&vertical_ref, &shoulder_mid, &hip_mid);

    unsafe {
        if let Some(ref mut filters) = FILTERS {
            for (i, angle) in angles.iter_mut().enumerate() {
                if !angle.is_nan() {
                    *angle = filters[i].filter(*angle, rate);
                    LAST_VALID_ANGLES[i] = *angle;
                } else {
                    *angle = LAST_VALID_ANGLES[i];
                }
            }
        }
    }

    angles
}

// Multi-Planar Compensations
#[wasm_bindgen]
pub fn compute_compensations() -> Vec<f32> {
    let get_pt = |idx: usize| -> Point {
        let base = idx * 4;
        unsafe {
            Point {
                x: LANDMARK_BUFFER[base],
                y: LANDMARK_BUFFER[base + 1],
                visibility: LANDMARK_BUFFER[base + 3],
            }
        }
    };
    
    let l_knee = get_pt(25);
    let r_knee = get_pt(26);
    let l_ankle = get_pt(27);
    let r_ankle = get_pt(28);

    // Lumbar Arching Index
    let l_shoulder = get_pt(11);
    let r_shoulder = get_pt(12);
    let l_hip = get_pt(23);
    let r_hip = get_pt(24);
    
    let shoulder_mid_x = (l_shoulder.x + r_shoulder.x) / 2.0;
    let hip_mid_x = (l_hip.x + r_hip.x) / 2.0;
    let lumbar_arching = (shoulder_mid_x - hip_mid_x).abs();

    // Frontal Knee Valgus / Varus Ratio
    let knee_dist = ((l_knee.x - r_knee.x).powi(2) + (l_knee.y - r_knee.y).powi(2)).sqrt();
    let ankle_dist = ((l_ankle.x - r_ankle.x).powi(2) + (l_ankle.y - r_ankle.y).powi(2)).sqrt();
    let valgus_ratio = if ankle_dist > 1e-6 { knee_dist / ankle_dist } else { 1.0 };

    vec![lumbar_arching, valgus_ratio]
}

// Ramer-Douglas-Peucker Trajectory Compression
fn rdp(points: &[(f32, f32)], epsilon: f32) -> Vec<(f32, f32)> {
    if points.len() < 3 {
        return points.to_vec();
    }
    
    let mut dmax = 0.0;
    let mut index = 0;
    let end = points.len() - 1;
    let (p1x, p1y) = points[0];
    let (p2x, p2y) = points[end];
    
    for i in 1..end {
        let (px, py) = points[i];
        let num = ((p2y - p1y)*px - (p2x - p1x)*py + p2x*p1y - p2y*p1x).abs();
        let den = ((p2y - p1y).powi(2) + (p2x - p1x).powi(2)).sqrt();
        let d = if den > 1e-6 { num / den } else { 0.0 };
        
        if d > dmax {
            index = i;
            dmax = d;
        }
    }
    
    if dmax > epsilon {
        let mut rec_results1 = rdp(&points[0..=index], epsilon);
        let mut rec_results2 = rdp(&points[index..end+1], epsilon);
        
        rec_results1.pop();
        rec_results1.append(&mut rec_results2);
        rec_results1
    } else {
        vec![points[0], points[end]]
    }
}

#[wasm_bindgen]
pub fn compress_trajectory(flat_points: &[f32], epsilon: f32) -> Vec<f32> {
    let mut pts = Vec::with_capacity(flat_points.len() / 2);
    for i in (0..flat_points.len()).step_by(2) {
        if i + 1 < flat_points.len() {
            pts.push((flat_points[i], flat_points[i+1]));
        }
    }
    let compressed = rdp(&pts, epsilon);
    let mut res = Vec::with_capacity(compressed.len() * 2);
    for (x, y) in compressed {
        res.push(x);
        res.push(y);
    }
    res
}
