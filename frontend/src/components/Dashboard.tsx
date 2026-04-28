import React, { useCallback, useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import TimerIcon from '@mui/icons-material/Timer';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { apiService, UserSessionsResponse, UserSession } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [sessionData, setSessionData] = useState<UserSessionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');

  const fetchUserSessions = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await apiService.getUserSessions(currentUser.uid);
      setSessionData(data);
    } catch (fetchError) {
      setError('Failed to load dashboard data. Please make sure the backend is running.');
      console.error('Error fetching user sessions:', fetchError);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchUserSessions();
  }, [fetchUserSessions]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const filterSessionsByPeriod = (sessions: UserSession[]) => {
    const now = new Date();
    const cutoff = new Date();

    switch (selectedPeriod) {
      case 'week':
        cutoff.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case 'all':
        return sessions;
      default:
        return sessions;
    }

    return sessions.filter((session) => new Date(session.timestamp) >= cutoff);
  };

  const getFilteredSummary = (sessions: UserSession[]) => {
    const exerciseBreakdown: UserSessionsResponse['summary']['exercise_breakdown'] = {};

    sessions.forEach((session) => {
      if (!exerciseBreakdown[session.exercise]) {
        exerciseBreakdown[session.exercise] = {
          sessions: 0,
          total_reps: 0,
          total_duration: 0
        };
      }
      exerciseBreakdown[session.exercise].sessions += 1;
      exerciseBreakdown[session.exercise].total_reps += session.total_reps;
      exerciseBreakdown[session.exercise].total_duration += session.duration;
    });

    return {
      total_sessions: sessions.length,
      total_reps: sessions.reduce((sum, session) => sum + session.total_reps, 0),
      total_duration: sessions.reduce((sum, session) => sum + session.duration, 0),
      exercise_breakdown: exerciseBreakdown
    };
  };

  const getChartData = () => {
    if (!sessionData) {
      return {
        filteredSessions: [],
        summary: null,
        dailyReps: [],
        exerciseBreakdown: [],
        progressData: []
      };
    }

    const filteredSessions = filterSessionsByPeriod(sessionData.sessions);
    const summary = getFilteredSummary(filteredSessions);

    const dailyRepsMap: { [date: string]: number } = {};
    filteredSessions.forEach((session) => {
      const date = new Date(session.timestamp).toLocaleDateString();
      dailyRepsMap[date] = (dailyRepsMap[date] || 0) + session.total_reps;
    });

    const dailyReps = Object.entries(dailyRepsMap)
      .map(([date, reps]) => ({ date, reps }))
      .slice(-7);

    const exerciseBreakdown = Object.entries(summary.exercise_breakdown).map(([exercise, data]) => ({
      name: exercise.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
      value: data.total_reps,
      sessions: data.sessions
    }));

    const progressData = filteredSessions
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((session, index) => ({
        session: index + 1,
        reps: session.total_reps,
        date: new Date(session.timestamp).toLocaleDateString(),
        exercise: session.exercise
      }));

    return { filteredSessions, summary, dailyReps, exerciseBreakdown, progressData };
  };

  const { filteredSessions, summary, dailyReps, exerciseBreakdown, progressData } = getChartData();
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading dashboard...
        </Typography>
      </Container>
    );
  }

  if (!sessionData) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Alert severity="info">
          Start exercising to see your progress data here!
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Your Progress Dashboard
        </Typography>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Period</InputLabel>
          <Select
            value={selectedPeriod}
            label="Period"
            onChange={(event) => setSelectedPeriod(event.target.value as 'week' | 'month' | 'all')}
          >
            <MenuItem value="week">Last Week</MenuItem>
            <MenuItem value="month">Last Month</MenuItem>
            <MenuItem value="all">All Time</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {summary && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <FitnessCenterIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4" color="primary">
                  {summary.total_sessions}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Sessions
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4" color="success.main">
                  {summary.total_reps}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Total Reps
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <TimerIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h4" color="info.main">
                  {formatDuration(summary.total_duration)}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Total Time
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <AssessmentIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h4" color="warning.main">
                  {Object.keys(summary.exercise_breakdown).length}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Exercises Done
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Daily Reps (Last 7 Days)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyReps}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="reps" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Exercise Breakdown
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={exerciseBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {exerciseBreakdown.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Progress Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="reps"
                    stroke="#1976d2"
                    strokeWidth={2}
                    dot={{ fill: '#1976d2' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Sessions
              </Typography>
              {filteredSessions.length === 0 ? (
                <Alert severity="info">No sessions found for the selected period.</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Exercise</TableCell>
                        <TableCell>Reps</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredSessions
                        .slice()
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .slice(0, 10)
                        .map((session, index) => (
                          <TableRow key={`${session.timestamp}-${index}`}>
                            <TableCell>{new Date(session.timestamp).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Chip
                                label={session.exercise.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{session.total_reps}</TableCell>
                            <TableCell>{formatDuration(session.duration)}</TableCell>
                            <TableCell>
                              <Chip label="Completed" size="small" color="success" />
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
