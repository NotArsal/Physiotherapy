import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  TextField,
  Divider,
  Link
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { signInWithGoogle, login, signUp, resetPassword } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setMessage('');
      setLoading(true);
      await signInWithGoogle();
    } catch (error) {
      setError('Failed to sign in with Google. Please try again.');
      console.error('Sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (isForgotPassword) {
      if (!email) return setError('Please enter your email');
      try {
        setLoading(true);
        await resetPassword(email);
        setMessage('Check your inbox for further instructions');
      } catch (err: any) {
        setError(err.message || 'Failed to reset password');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email || !password) return setError('Please fill in all fields');
    
    if (isSignUp) {
      if (password !== confirmPassword) return setError('Passwords do not match');
      if (!name) return setError('Please enter your name');
      try {
        setLoading(true);
        await signUp(email, password, name);
      } catch (err: any) {
        setError(err.message || 'Failed to create an account');
      } finally {
        setLoading(false);
      }
    } else {
      try {
        setLoading(true);
        await login(email, password);
      } catch (err: any) {
        setError(err.message || 'Failed to sign in');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mb: 8
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%', textAlign: 'center' }}>
          <Box sx={{ mb: 3 }}>
            <FitnessCenterIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography component="h1" variant="h4" gutterBottom>
              PhysioTracker
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {isForgotPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Sign In'}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {message && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {message}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            {isSignUp && !isForgotPassword && (
              <TextField
                margin="normal"
                required
                fullWidth
                label="Full Name"
                name="name"
                autoComplete="name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus={!isSignUp}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {!isForgotPassword && (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {isSignUp && (
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="confirmPassword"
                    label="Confirm Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                )}
              </>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : isForgotPassword ? 'Send Reset Link' : isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>

            {!isForgotPassword && (
              <Box sx={{ textAlign: 'right', mb: 2 }}>
                <Link component="button" variant="body2" onClick={() => setIsForgotPassword(true)}>
                  Forgot password?
                </Link>
              </Box>
            )}

            <Divider sx={{ my: 2 }}>OR</Divider>

            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleSignIn}
              disabled={loading}
              sx={{ 
                mb: 2, 
                py: 1.2,
                color: '#4285f4',
                borderColor: '#4285f4',
                '&:hover': {
                  borderColor: '#357ae8',
                  backgroundColor: 'rgba(66, 133, 244, 0.04)',
                }
              }}
            >
              Sign in with Google
            </Button>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                {isForgotPassword ? (
                  <Link component="button" onClick={() => setIsForgotPassword(false)}>
                    Back to Sign In
                  </Link>
                ) : isSignUp ? (
                  <>
                    Already have an account?{' '}
                    <Link component="button" onClick={() => setIsSignUp(false)}>
                      Sign In
                    </Link>
                  </>
                ) : (
                  <>
                    Don't have an account?{' '}
                    <Link component="button" onClick={() => setIsSignUp(true)}>
                      Sign Up
                    </Link>
                  </>
                )}
              </Typography>
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
            By signing in, you agree to our terms of service and privacy policy.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;