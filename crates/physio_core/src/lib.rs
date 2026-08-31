use wasm_bindgen::prelude::*;

#[derive(Debug, Clone, Copy)]
#[repr(C)]
pub struct Point3D {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub visibility: f32,
}

/// Calculates the 2D joint angle (in degrees) between three points: p1, p2 (vertex), and p3.
#[wasm_bindgen]
pub fn calculate_joint_angle(x1: f32, y1: f32, x2: f32, y2: f32, x3: f32, y3: f32) -> f32 {
    let u_x = x1 - x2;
    let u_y = y1 - y2;
    let v_x = x3 - x2;
    let v_y = y3 - y2;

    let dot_product = u_x * v_x + u_y * v_y;
    let mag1 = (u_x * u_x + u_y * u_y).sqrt();
    let mag2 = (v_x * v_x + v_y * v_y).sqrt();

    if mag1 == 0.0 || mag2 == 0.0 {
        return 0.0;
    }

    let cos_angle = (dot_product / (mag1 * mag2)).clamp(-1.0, 1.0);
    cos_angle.acos().to_degrees()
}

/// Processes raw MediaPipe landmark buffer (132 floats = 33 landmarks * [x, y, z, v])
/// Performs bi-acromial distance scaling and lower-body landmark imputation.
/// Returns a 99-element Float32Array ready for the TF.js BiLSTM input tensor (33 landmarks * [x, y, v]).
#[wasm_bindgen]
pub fn process_landmarks_and_impute(input_buffer: &[f32]) -> Vec<f32> {
    if input_buffer.len() < 132 {
        return vec![0.0; 99];
    }

    let mut points: Vec<Point3D> = input_buffer
        .chunks_exact(4)
        .map(|chunk| Point3D {
            x: chunk[0],
            y: chunk[1],
            z: chunk[2],
            visibility: chunk[3],
        })
        .collect();

    if points.len() < 33 {
        return vec![0.0; 99];
    }

    let ls = points[11];
    let rs = points[12];

    let shoulder_width = if ls.visibility > 0.5 && rs.visibility > 0.5 {
        ((rs.x - ls.x).powi(2) + (rs.y - ls.y).powi(2)).sqrt()
    } else {
        0.20
    };

    // Check lower extremity visibility (Hips 23/24, Knees 25/26, Ankles 27/28)
    let low_vis_count = [23, 24, 25, 26, 27, 28]
        .iter()
        .filter(|&&idx| points[idx].visibility < 0.5)
        .count();

    // Reconstruct missing lower extremity coordinates if occluded
    if low_vis_count >= 2 {
        let max_shoulder_y = ls.y.max(rs.y);
        let hip_y = max_shoulder_y + 1.2 * shoulder_width;
        let knee_y = hip_y + 1.5 * shoulder_width;
        let ankle_y = knee_y + 1.5 * shoulder_width;
        let heel_y = ankle_y + 0.1 * shoulder_width;
        let toe_y = ankle_y + 0.2 * shoulder_width;

        points[23] = Point3D { x: ls.x, y: hip_y, z: 0.0, visibility: 1.0 };
        points[24] = Point3D { x: rs.x, y: hip_y, z: 0.0, visibility: 1.0 };
        points[25] = Point3D { x: ls.x, y: knee_y, z: 0.0, visibility: 1.0 };
        points[26] = Point3D { x: rs.x, y: knee_y, z: 0.0, visibility: 1.0 };
        points[27] = Point3D { x: ls.x, y: ankle_y, z: 0.0, visibility: 1.0 };
        points[28] = Point3D { x: rs.x, y: ankle_y, z: 0.0, visibility: 1.0 };
        points[29] = Point3D { x: ls.x, y: heel_y, z: 0.0, visibility: 1.0 };
        points[30] = Point3D { x: rs.x, y: heel_y, z: 0.0, visibility: 1.0 };
        points[31] = Point3D { x: ls.x, y: toe_y, z: 0.0, visibility: 1.0 };
        points[32] = Point3D { x: rs.x, y: toe_y, z: 0.0, visibility: 1.0 };
    }

    // Flatten to 99-element vector [x, y, v] per landmark
    let mut output = Vec::with_capacity(99);
    for pt in points.iter().take(33) {
        output.push(pt.x);
        output.push(pt.y);
        output.push(pt.visibility);
    }
    output
}

/// Evaluates head drop velocity (dy/dt) and floor proximity aspect ratio collapse for optical fall detection.
#[wasm_bindgen]
pub fn detect_fall_emergency_wasm(
    nose_y: f32,
    prev_nose_y: f32,
    delta_time: f32,
    left_ankle_y: f32,
    right_ankle_y: f32,
    ankle_visibility: f32,
) -> bool {
    if delta_time <= 0.0 {
        return false;
    }

    let dy = nose_y - prev_nose_y;
    let head_drop_velocity = dy / delta_time.max(0.01);

    let head_near_floor = if ankle_visibility > 0.5 {
        let avg_ankle_y = (left_ankle_y + right_ankle_y) / 2.0;
        (nose_y - avg_ankle_y).abs() < 0.20
    } else {
        false
    };

    head_drop_velocity > 3.0 && head_near_floor
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_joint_angle_right_angle() {
        let angle = calculate_joint_angle(0.0, 1.0, 0.0, 0.0, 1.0, 0.0);
        assert!((angle - 90.0).abs() < 1e-4);
    }

    #[test]
    fn test_process_landmarks_and_impute_length() {
        let raw_buffer = vec![0.5; 132];
        let result = process_landmarks_and_impute(&raw_buffer);
        assert_eq!(result.len(), 99);
    }
}
