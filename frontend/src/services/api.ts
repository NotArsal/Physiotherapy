import axios from 'axios';
import { auth } from '../firebase';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to attach Firebase auth token
api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error('Error fetching Firebase token:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface PredictionResponse {
  exercise: string;
  confidence: number;
  phase: string;
  rep_count: number;
  joint_angles: number[];
  timestamp: string;
  exercise_match?: boolean;
  selected_exercise?: string | null;
  success?: boolean;
  error?: string;
}

export interface SessionData {
  user_id: string;
  exercise: string;
  total_reps: number;
  duration: number;
  session_data?: any[];
}

export interface UserSession {
  user_id: string;
  exercise: string;
  total_reps: number;
  duration: number;
  timestamp: string;
  session_data: any[];
}

export interface SessionSummary {
  total_sessions: number;
  total_reps: number;
  total_duration: number;
  exercise_breakdown: {
    [exercise: string]: {
      sessions: number;
      total_reps: number;
      total_duration: number;
    };
  };
}

export interface UserSessionsResponse {
  user_id: string;
  sessions: UserSession[];
  summary: SessionSummary;
}

export interface ExerciseProtocol {
  user_id: string;
  exercise: string;
  target_reps: number;
  safe_spine_angle: number;
  safe_knee_angle: number;
  safety_sensitivity: string; // 'high' | 'medium' | 'low'
}

class ApiService {
  // Health check
  async healthCheck() {
    try {
      console.log(`Checking backend health at: ${api.defaults.baseURL}`);
      // Fast 3-second timeout to quickly fallback if primary backend is unreachable
      const response = await api.get('/health', { timeout: 3000 });
      console.log('Primary backend health check succeeded:', response.data);
      return response.data;
    } catch (error) {
      console.warn(`Health check failed at primary URL (${api.defaults.baseURL}):`, error);
      
      const fallbackUrl = 'http://localhost:5000';
      if (api.defaults.baseURL !== fallbackUrl) {
        console.warn(`Primary backend unresponsive. Attempting fallback to local backend at ${fallbackUrl}...`);
        try {
          // Perform a quick health check on the local backend (2 second timeout)
          const localResponse = await axios.get(`${fallbackUrl}/health`, { timeout: 2000 });
          if (localResponse.data && localResponse.data.status === 'healthy') {
            console.log(`Local backend is healthy! Dynamically switching api.defaults.baseURL to ${fallbackUrl}`);
            api.defaults.baseURL = fallbackUrl;
            return localResponse.data;
          }
        } catch (localError) {
          console.error(`Local backend fallback check failed at ${fallbackUrl}:`, localError);
        }
      }
      
      // If we already are on local fallback or local fallback failed, throw the original error
      throw error;
    }
  }

  // Get available exercises
  async getExercises(): Promise<string[]> {
    try {
      const response = await api.get('/exercises');
      return response.data.exercises;
    } catch (error) {
      console.error('Failed to get exercises:', error);
      throw error;
    }
  }

  // Log exercise session
  async logSession(sessionData: SessionData) {
    try {
      const response = await api.post('/log_session', sessionData);
      return response.data;
    } catch (error) {
      console.error('Failed to log session:', error);
      throw error;
    }
  }

  // Get user sessions
  async getUserSessions(userId: string): Promise<UserSessionsResponse> {
    try {
      const response = await api.get(`/sessions/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get user sessions:', error);
      throw error;
    }
  }

  // Get all sessions (for admin)
  async getAllSessions() {
    try {
      const response = await api.get('/sessions');
      return response.data;
    } catch (error) {
      console.error('Failed to get all sessions:', error);
      throw error;
    }
  }

  // Get default protocols
  async getDefaultProtocols(): Promise<ExerciseProtocol[]> {
    try {
      const response = await api.get('/protocols/default');
      return response.data.protocols;
    } catch (error) {
      console.error('Failed to get default protocols:', error);
      throw error;
    }
  }

  // Get user protocols (falls back to default inside backend)
  async getProtocol(userId: string): Promise<ExerciseProtocol[]> {
    try {
      const response = await api.get(`/protocols/${userId}`);
      return response.data.protocols;
    } catch (error) {
      console.error(`Failed to get protocols for user ${userId}:`, error);
      throw error;
    }
  }

  // Save or update user protocols
  async saveProtocol(protocol: ExerciseProtocol | ExerciseProtocol[]): Promise<any> {
    try {
      const response = await api.post('/protocols', protocol);
      return response.data;
    } catch (error) {
      console.error('Failed to save protocol:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService(); 
