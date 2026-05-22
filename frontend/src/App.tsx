import React, { useState, useEffect, useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  Typography,
  Button,
  Box,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BugReportIcon from '@mui/icons-material/BugReport';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import ExerciseSelector from './components/ExerciseSelector';
import ExerciseMonitor from './components/ExerciseMonitor';
import Dashboard from './components/Dashboard';
import MediaPipeDebug from './components/MediaPipeDebug';
import { TherapistPortal } from './components/TherapistPortal';
import NavHeader, { NavItem } from './components/ui/nav-header';
import { PremiumToggle } from './components/ui/bouncy-toggle';

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

interface AppContentProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

// ── Main App Content ──────────────────────────────────────────────────────────
const AppContent: React.FC<AppContentProps> = ({ darkMode, toggleDarkMode }) => {
  const { currentUser, logout } = useAuth();
  
  const [role, setRole] = useState<'patient' | 'therapist'>(() => {
    const saved = localStorage.getItem('physio_role');
    return (saved === 'patient' || saved === 'therapist') ? saved : 'therapist';
  });

  const [currentView, setCurrentView] = useState<AppView>(() => {
    const savedRole = localStorage.getItem('physio_role');
    const savedView = localStorage.getItem('physio_current_view');
    const initialRole = (savedRole === 'patient' || savedRole === 'therapist') ? savedRole : 'therapist';
    if (savedView) {
      if (initialRole === 'therapist' && savedView === 'therapist') return 'therapist';
      if (initialRole === 'patient' && ['exercises', 'monitor', 'dashboard', 'debug'].includes(savedView)) return savedView as AppView;
    }
    return initialRole === 'therapist' ? 'therapist' : 'exercises';
  });

  const [selectedExercise, setSelectedExercise] = useState<string>(() => {
    return localStorage.getItem('physio_selected_exercise') || '';
  });

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // ── Auto-enroll dynamic active patient and clear mock patients ──────────────
  useEffect(() => {
    if (currentUser) {
      const saved = localStorage.getItem('physio_patients');
      let patientsList: any[] = [];
      if (saved) {
        try {
          patientsList = JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse saved patients from localStorage", e);
        }
      }

      // Completely remove mock accounts
      const mockIds = ['patient_123', 'jane_smith', 'robert_johnson', 'default'];
      patientsList = patientsList.filter(p => !mockIds.includes(p.id));

      const patientId = currentUser.uid || currentUser.email?.toLowerCase() || 'current_user';
      const exists = patientsList.some(p => p.id === patientId);

      if (!exists) {
        const newPatient = {
          id: patientId,
          name: currentUser.displayName || currentUser.email || 'Active Patient',
          age: 32, // baseline profile details
          condition: 'Active Movement Assessment',
          riskProfile: 'Medium'
        };
        patientsList.unshift(newPatient);
      }

      localStorage.setItem('physio_patients', JSON.stringify(patientsList));
    }
  }, [currentUser]);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    try { await logout(); handleClose(); }
    catch (error) { console.error('Logout error:', error); }
  };

  const handleExerciseSelect = (exercise: string) => {
    setSelectedExercise(exercise);
    setCurrentView('monitor');
    localStorage.setItem('physio_current_view', 'monitor');
    localStorage.setItem('physio_selected_exercise', exercise);
  };

  const handleBackToExercises = () => {
    setCurrentView('exercises');
    setSelectedExercise('');
    localStorage.setItem('physio_current_view', 'exercises');
    localStorage.removeItem('physio_selected_exercise');
  };

  const handleRoleToggle = (checked: boolean) => {
    const nextRole = checked ? 'therapist' : 'patient';
    setRole(nextRole);
    const nextView = nextRole === 'therapist' ? 'therapist' : 'exercises';
    setCurrentView(nextView);
    localStorage.setItem('physio_role', nextRole);
    localStorage.setItem('physio_current_view', nextView);
  };

  const navItems = role === 'patient' ? PATIENT_NAV : THERAPIST_NAV;
  const activeNavValue = currentView === 'monitor' ? 'exercises' : currentView;

  if (!currentUser) return <Login />;

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default', transition: 'background-color 0.2s' }}>
      {/* ── Custom Navbar ───────────────────────────────────────────────────── */}
      <nav
        style={{
          background: darkMode ? '#181715' : '#faf9f5',
          borderBottom: `1px solid ${darkMode ? '#32302b' : '#e6dfd8'}`,
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          transition: 'all 0.2s'
        }}
      >
        <div className="flex items-center justify-between w-full px-6 py-3 gap-3">
          {/* Left Column (Logo) ─────────────────────────────────────────────── */}
          <div className="flex-1 md:w-1/3 md:flex-initial flex justify-start items-center gap-2 shrink-0">
            <span className="text-[#cc785c] text-xl font-serif leading-none" style={{ userSelect: 'none' }}>✦</span>
            <Typography
              variant="h6"
              component="span"
              sx={{ 
                color: darkMode ? '#faf9f5' : '#141413', 
                fontWeight: 500, 
                letterSpacing: '-0.02em', 
                whiteSpace: 'nowrap', 
                display: { xs: 'none', md: 'block' },
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: '1.25rem'
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
              onItemClick={(value) => {
                const nextView = value as AppView;
                setCurrentView(nextView);
                localStorage.setItem('physio_current_view', nextView);
              }}
            />
          </div>

          {/* Right Column (Controls) ────────────────────────────────────────── */}
          <div className="flex-1 md:w-1/3 md:flex-initial flex justify-end gap-3 items-center">
            {/* Dark/Light mode switcher ──────────────────────────────────────── */}
            <IconButton 
              onClick={toggleDarkMode} 
              sx={{ 
                color: '#cc785c',
                bgcolor: darkMode ? 'rgba(204,120,92,0.1)' : 'rgba(20,20,19,0.02)',
                '&:hover': {
                  bgcolor: darkMode ? 'rgba(204,120,92,0.2)' : 'rgba(20,20,19,0.05)'
                }
              }}
              size="small"
            >
              {darkMode ? <LightModeIcon sx={{ fontSize: 18 }} /> : <DarkModeIcon sx={{ fontSize: 18 }} />}
            </IconButton>

            {/* Role toggle ───────────────────────────────────────────────────── */}
            <div
              className="flex items-center gap-2 rounded-full px-3 py-1 shrink-0"
              style={{ 
                background: darkMode ? '#22211e' : '#efe9de', 
                border: `1px solid ${darkMode ? '#32302b' : '#e6dfd8'}`,
                transition: 'all 0.2s'
              }}
            >
              <Typography 
                variant="caption" 
                sx={{ 
                  color: darkMode ? '#faf9f5' : '#141413', 
                  fontWeight: 600, 
                  letterSpacing: 0.5, 
                  textTransform: 'uppercase', 
                  fontSize: '0.65rem',
                  fontFamily: '"Inter", sans-serif'
                }}
              >
                {role === 'therapist' ? 'Therapist' : 'Patient'}
              </Typography>
              <PremiumToggle
                defaultChecked={role === 'therapist'}
                onChange={handleRoleToggle}
              />
            </div>

            {/* User menu ─────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 shrink-0">
              <Typography 
                variant="body2" 
                sx={{ 
                  color: darkMode ? '#a9a69e' : '#6c6a64', 
                  display: { xs: 'none', lg: 'block' }, 
                  maxWidth: 120, 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  fontFamily: '"Inter", sans-serif',
                  fontWeight: 500,
                  fontSize: '0.85rem'
                }}
              >
                {currentUser.displayName || currentUser.email}
              </Typography>
              <Button onClick={handleMenu} sx={{ p: 0, minWidth: 0 }}>
                <Avatar
                  src={currentUser.photoURL || undefined}
                  sx={{ 
                    width: 32, 
                    height: 32, 
                    border: '1px solid #cc785c', 
                    fontSize: '0.85rem',
                    bgcolor: darkMode ? '#22211e' : '#efe9de',
                    color: '#cc785c',
                    fontFamily: '"Inter", sans-serif',
                    fontWeight: 600
                  }}
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
                PaperProps={{
                  sx: {
                    bgcolor: darkMode ? '#22211e' : '#efe9de',
                    border: `1px solid ${darkMode ? '#32302b' : '#e6dfd8'}`,
                    backgroundImage: 'none',
                    '& .MuiMenuItem-root': {
                      fontFamily: '"Inter", sans-serif',
                      color: darkMode ? '#faf9f5' : '#141413',
                      fontSize: '0.85rem',
                      '&:hover': {
                        bgcolor: darkMode ? '#181715' : '#faf9f5',
                      }
                    }
                  }
                }}
              >
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon sx={{ mr: 1, fontSize: 18, color: '#cc785c' }} /> Logout
                </MenuItem>
              </Menu>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Page content ────────────────────────────────────────────────────── */}
      <Box component="main" sx={{ py: 1 }}>
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

// ── App root with dynamic theme ───────────────────────────────────────────────
const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('physio_dark_mode');
    return saved === 'true';
  });

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('physio_dark_mode', String(next));
      return next;
    });
  };

  const currentTheme = useMemo(() => {
    const canvasColor = darkMode ? '#181715' : '#faf9f5';
    const paperColor = darkMode ? '#22211e' : '#efe9de';
    const textColor = darkMode ? '#faf9f5' : '#141413';
    const textSecondary = darkMode ? '#a9a69e' : '#6c6a64';
    const borderHairline = darkMode ? '#32302b' : '#e6dfd8';

    return createTheme({
      palette: {
        mode: darkMode ? 'dark' : 'light',
        primary: { 
          main: '#cc785c', // Signature Anthropic Coral
          dark: '#a9583e', // Coral active / pressed state
          contrastText: '#ffffff'
        },
        secondary: { 
          main: paperColor, 
          contrastText: textColor
        },
        background: {
          default: canvasColor,
          paper: paperColor,
        },
        text: {
          primary: textColor,
          secondary: textSecondary,
        }
      },
      typography: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        h1: { fontFamily: '"Cormorant Garamond", "EB Garamond", serif', fontWeight: 500, letterSpacing: '-0.03em', color: textColor },
        h2: { fontFamily: '"Cormorant Garamond", "EB Garamond", serif', fontWeight: 500, letterSpacing: '-0.02em', color: textColor },
        h3: { fontFamily: '"Cormorant Garamond", "EB Garamond", serif', fontWeight: 500, letterSpacing: '-0.02em', color: textColor },
        h4: { fontFamily: '"Cormorant Garamond", "EB Garamond", serif', fontWeight: 500, letterSpacing: '-0.01em', color: textColor },
        h5: { fontFamily: '"Cormorant Garamond", "EB Garamond", serif', fontWeight: 500, letterSpacing: '-0.01em', color: textColor },
        h6: { fontFamily: '"Cormorant Garamond", "EB Garamond", serif', fontWeight: 500, letterSpacing: '0', color: textColor },
        body1: { fontFamily: '"Inter", sans-serif', fontWeight: 400, color: darkMode ? '#eae8e1' : '#252523' },
        body2: { fontFamily: '"Inter", sans-serif', fontWeight: 400, color: darkMode ? '#d1cec5' : '#3d3d3a' },
        button: { fontFamily: '"Inter", sans-serif', fontWeight: 500, textTransform: 'none' },
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: '8px',
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': {
                boxShadow: 'none',
              }
            }
          }
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: '12px',
              boxShadow: 'none',
              border: `1px solid ${borderHairline}`,
              backgroundImage: 'none'
            }
          }
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: '12px',
              boxShadow: 'none',
              border: `1px solid ${borderHairline}`,
              backgroundColor: paperColor,
              backgroundImage: 'none'
            }
          }
        }
      }
    });
  }, [darkMode]);

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
