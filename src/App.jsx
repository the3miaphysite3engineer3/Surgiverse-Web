import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import ProfessorRoute from './components/ProfessorRoute';
import TaProfessorRoute from './components/TaProfessorRoute';
import SurgeryDetails from './pages/SurgeryDetails';
import Profile from './pages/Profile';
import AddSurgery from './pages/AddSurgery';
import GradeStudents from './pages/GradeStudents';
import AddResources from './pages/AddResources';
import VisualResources from './pages/VisualResources';
import Analytics from './pages/Analytics';
import ManageUsers from './pages/ManageUsers';
import GameSettings from './pages/GameSettings';
import Login from './pages/Login';
import Landing from './pages/Landing';
import About from './pages/About';
import Contact from './pages/Contact';
import './App.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5', // Professional Blue
    },
    secondary: {
      main: '#f50057', // Vibrant Pink
    },
    background: {
      default: '#f0f2f5', // Light Grey
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/surgery/:id"
            element={
              <ProtectedRoute>
                <SurgeryDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-surgery"
            element={
              <ProfessorRoute>
                <AddSurgery />
              </ProfessorRoute>
            }
          />
          <Route
            path="/grade-students"
            element={
              <TaProfessorRoute>
                <GradeStudents />
              </TaProfessorRoute>
            }
          />
          <Route
            path="/add-resources"
            element={
              <ProfessorRoute>
                <AddResources />
              </ProfessorRoute>
            }
          />
          <Route
            path="/visual-resources"
            element={
              <ProfessorRoute>
                <VisualResources />
              </ProfessorRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <TaProfessorRoute>
                <Analytics />
              </TaProfessorRoute>
            }
          />
          <Route
            path="/manage-users"
            element={
              <ProfessorRoute>
                <ManageUsers />
              </ProfessorRoute>
            }
          />
          <Route
            path="/game-settings"
            element={
              <ProfessorRoute>
                <GameSettings />
              </ProfessorRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
