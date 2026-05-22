import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  Typography,
  Button,
  Box,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BugReportIcon from '@mui/icons-material/BugReport';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import ExerciseSelector from './components/ExerciseSelector';
import ExerciseMonitor from './components/ExerciseMonitor';
import Dashboard from './components/Dashboard';
import MediaPipeDebug from './components/MediaPipeDebug';
import { TherapistPortal } from './components/TherapistPortal';
import NavHeader, { NavItem } from './components/ui/nav-header';
import { PremiumToggle } from './components/ui/bouncy-toggle';

// ── MUI theme (used for all page components beneath the navbar) ───────────────
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
  typography: {
    fontFamily: '"Open Sauce Sans", "Open Sauce One", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontFamily: '"Peace Sans", sans-serif' },
    h2: { fontFamily: '"Peace Sans", sans-serif' },
    h3: { fontFamily: '"Peace Sans", sans-serif' },
    h4: { fontFamily: '"Peace Sans", sans-serif', fontWeight: 600 },
    h5: { fontFamily: '"Peace Sans", sans-serif' },
    h6: { fontFamily: '"Peace Sans", sans-serif', fontWeight: 600 },
  },
});

type AppView = 'exercises' | 'monitor' | 'dashboard' | 'debug' | 'therapist';

// ── Nav items per role ────────────────────────────────────────────────────────
const PATIENT_NAV: NavItem[] = [
  { label: 'Exercises', value: 'exercises', icon: <PlayArrowIcon style={{ fontSize: 14 }} /> },
  { label: 'Dashboard', value: 'dashboard', icon: <DashboardIcon style={{ fontSize: 14 }} /> },
  { label: 'Debug', value: 'debug', icon: <BugReportIcon style={{ fontSize: 14 }} /> },
];

const THERAPIST_NAV: NavItem[] = [
  { label: 'Therapist Portal', value: 'therapist', icon: <SupervisorAccountIcon style={{ fontSize: 14 }} /> },
];


// ── Main App Content ──────────────────────────────────────────────────────────
const AppContent: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('therapist');
  const [role, setRole] = useState<'patient' | 'therapist'>('therapist');
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    try { await logout(); handleClose(); }
    catch (error) { console.error('Logout error:', error); }
  };

  const handleExerciseSelect = (exercise: string) => {
    setSelectedExercise(exercise);
    setCurrentView('monitor');
  };

  const handleBackToExercises = () => {
    setCurrentView('exercises');
    setSelectedExercise('');
  };

  const handleRoleToggle = (checked: boolean) => {
    const nextRole = checked ? 'therapist' : 'patient';
    setRole(nextRole);
    setCurrentView(nextRole === 'therapist' ? 'therapist' : 'exercises');
  };

  const navItems = role === 'patient' ? PATIENT_NAV : THERAPIST_NAV;
  const activeNavValue = currentView === 'monitor' ? 'exercises' : currentView;

  if (!currentUser) return <Login />;

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* ── Custom Navbar ───────────────────────────────────────────────────── */}
      <nav
        style={{
          background: 'linear-gradient(90deg, #1565c0 0%, #1976d2 60%, #1e88e5 100%)',
          boxShadow: '0 2px 12px rgba(21,101,192,0.4)',
          position: 'sticky',
          top: 0,
          zIndex: 1100,
        }}
      >
        <div className="flex items-center justify-between w-full px-4 py-2 gap-3">
          {/* Left Column (Logo) ─────────────────────────────────────────────── */}
          <div className="flex-1 md:w-1/3 md:flex-initial flex justify-start items-center gap-2 shrink-0">
            <FitnessCenterIcon style={{ color: 'white', fontSize: 26 }} />
            <Typography
              variant="subtitle1"
              component="span"
              sx={{ 
                color: 'white', 
                fontWeight: 700, 
                letterSpacing: 0.3, 
                whiteSpace: 'nowrap', 
                display: { xs: 'none', md: 'block' },
                fontFamily: '"Peace Sans", sans-serif'
              }}
            >
              PhysioTracker
            </Typography>
          </div>

          {/* Middle Column (Sliding pill NavHeader) ─────────────────────────── */}
          <div className="flex-shrink-0 md:w-1/3 md:flex-initial flex justify-center">
            <NavHeader
              items={navItems}
              activeValue={activeNavValue}
              onItemClick={(value) => setCurrentView(value as AppView)}
            />
          </div>

          {/* Right Column (Controls) ────────────────────────────────────────── */}
          <div className="flex-1 md:w-1/3 md:flex-initial flex justify-end gap-3 items-center">
            {/* Role toggle ───────────────────────────────────────────────────── */}
            <div
              className="flex items-center gap-2 rounded-full px-3 py-1 shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                {role === 'therapist' ? 'Therapist' : 'Patient'}
              </Typography>
              <PremiumToggle
                defaultChecked={role === 'therapist'}
                onChange={handleRoleToggle}
              />
            </div>

            {/* User menu ─────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 shrink-0">
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', display: { xs: 'none', lg: 'block' }, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser.displayName || currentUser.email}
              </Typography>
              <Button onClick={handleMenu} sx={{ p: 0, minWidth: 0 }}>
                <Avatar
                  src={currentUser.photoURL || undefined}
                  sx={{ width: 34, height: 34, border: '2px solid rgba(255,255,255,0.6)', fontSize: '0.9rem' }}
                >
                  {currentUser.displayName?.[0] || currentUser.email?.[0]}
                </Avatar>
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon sx={{ mr: 1, fontSize: 18 }} /> Logout
                </MenuItem>
              </Menu>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Page content ────────────────────────────────────────────────────── */}
      <Box component="main">
        {currentView === 'exercises' && (
          <ExerciseSelector onExerciseSelect={handleExerciseSelect} />
        )}
        {currentView === 'monitor' && selectedExercise && (
          <ExerciseMonitor
            selectedExercise={selectedExercise}
            onBack={handleBackToExercises}
          />
        )}
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'debug' && <MediaPipeDebug />}
        {currentView === 'therapist' && <TherapistPortal />}
      </Box>
    </Box>
  );
};

// ── App root ──────────────────────────────────────────────────────────────────
const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </ThemeProvider>
);

export default App;
