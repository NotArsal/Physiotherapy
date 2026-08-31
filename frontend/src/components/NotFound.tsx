import React, { useEffect } from 'react';
import { Container, Box, Typography, Button, Paper } from '@mui/material';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import DashboardIcon from '@mui/icons-material/Dashboard';

interface NotFoundProps {
  onNavigate?: (view: string) => void;
}

const NotFound: React.FC<NotFoundProps> = ({ onNavigate }) => {
  useEffect(() => {
    document.title = '404 - Page Not Found | PhysioTracker';
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 10, textAlign: 'center' }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 4, md: 8 },
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Typography
          variant="h1"
          component="h1"
          sx={{
            fontFamily: '"Cormorant Garamond", serif',
            fontWeight: 700,
            fontSize: { xs: '5rem', md: '8rem' },
            color: 'primary.main',
            lineHeight: 1,
            mb: 1
          }}
        >
          404
        </Typography>

        <Typography
          variant="h4"
          component="h2"
          sx={{
            fontFamily: '"Cormorant Garamond", serif',
            fontWeight: 600,
            mb: 2,
            color: 'text.primary'
          }}
        >
          Page Not Found
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            fontFamily: '"Inter", sans-serif',
            maxWidth: 480,
            mb: 4,
            lineHeight: 1.6
          }}
        >
          The biomechanical monitoring view or route you requested could not be located. It may have been moved, deleted, or does not exist.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            variant="contained"
            startIcon={<FitnessCenterIcon />}
            onClick={() => onNavigate ? onNavigate('exercises') : window.location.href = '/'}
            sx={{
              bgcolor: 'primary.main',
              color: '#ffffff',
              px: 3,
              py: 1.2,
              fontFamily: '"Inter", sans-serif',
              fontWeight: 600,
              '&:hover': { bgcolor: 'primary.dark' }
            }}
          >
            Go to Exercises
          </Button>

          <Button
            variant="outlined"
            startIcon={<DashboardIcon />}
            onClick={() => onNavigate ? onNavigate('dashboard') : window.location.href = '/'}
            sx={{
              borderColor: 'divider',
              color: 'text.primary',
              px: 3,
              py: 1.2,
              fontFamily: '"Inter", sans-serif',
              fontWeight: 500,
              '&:hover': { borderColor: 'primary.main', bgcolor: 'transparent' }
            }}
          >
            View Dashboard
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default NotFound;
