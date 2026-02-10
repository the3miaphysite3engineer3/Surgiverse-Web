import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Tabs,
  Tab,
  Grid,
  Icon
} from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'; // A suitable icon for a logo

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAuth = async () => {
    setError(''); // Reset error before attempting auth
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!firstName || !lastName) {
          setError('Please enter your first and last name.');
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        // Create a document in the 'users' collection
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          firstName,
          lastName,
          email,
          role: 'student', // Default role for new users
        });
      }
      navigate('/');
    } catch (error) {
      setError(error.message);
      console.error('Authentication error:', error);
    }
  };

  return (
    <Grid container component="main" sx={{ height: '100vh' }}>
      <Grid
        item
        xs={12}
        sm={4}
        md={7}
        sx={{
          background: 'linear-gradient(to right, #3f51b5, #f50057)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          textAlign: 'center',
          p: 4
        }}
      >
        <Icon sx={{ fontSize: 80, mb: 2 }}>
            <LocalHospitalIcon sx={{ fontSize: 80 }} />
        </Icon>
        <Typography component="h1" variant="h2" sx={{ fontWeight: 'bold' }}>
          SurgiVerse
        </Typography>
        <Typography variant="h5">
          The future of surgical and medical training
        </Typography>
      </Grid>
      <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
        <Box
          sx={{
            my: 8,
            mx: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component="h1" variant="h5">
            {isLogin ? 'Sign In' : 'Create an Account'}
          </Typography>
          <Tabs
            value={isLogin ? 0 : 1}
            onChange={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            indicatorColor="secondary"
            textColor="inherit"
            variant="fullWidth"
            aria-label="login switch"
            sx={{ my: 2, width: '100%' }}
          >
            <Tab label="Login" />
            <Tab label="Register" />
          </Tabs>
          {error && (
            <Typography color="error" sx={{ mt: 1, mb: 1, textAlign: 'center' }}>
              {error.replace('Firebase: ', '')}
            </Typography>
          )}
          <Box component="form" noValidate sx={{ mt: 1 }}>
            {!isLogin && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    autoComplete="given-name"
                    name="firstName"
                    required
                    fullWidth
                    id="firstName"
                    label="First Name"
                    autoFocus
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    id="lastName"
                    label="Last Name"
                    name="lastName"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </Grid>
              </Grid>
            )}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="button"
              fullWidth
              variant="contained"
              color="primary"
              sx={{ mt: 3, mb: 2 }}
              onClick={handleAuth}
            >
              {isLogin ? 'Sign In' : 'Sign Up'}
            </Button>
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
};

export default Auth;
