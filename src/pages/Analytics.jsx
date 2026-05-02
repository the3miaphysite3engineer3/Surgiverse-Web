import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import MarketingNavbar from '../components/MarketingNavbar';
import MarketingFooter from '../components/MarketingFooter';
import { Box, Typography, Container, Paper, CircularProgress } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Analytics = () => {
  const [attempts, setAttempts] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const usersCollection = await getDocs(collection(db, 'users'));
        const usersData = {};
        usersCollection.forEach(doc => {
          usersData[doc.id] = doc.data();
        });
        setUsers(usersData);

        const attemptsCollection = await getDocs(collection(db, 'attempts'));
        const attemptsData = attemptsCollection.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAttempts(attemptsData);
      } catch (err) {
        setError('Failed to fetch data.');
        console.error(err);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const getChartData = () => {
    const studentData = {};
    attempts.forEach(attempt => {
      const studentName = `${users[attempt.uid]?.firstName || 'N/A'} ${users[attempt.uid]?.lastName || ''}`;
      if (!studentData[studentName]) {
        studentData[studentName] = {
          name: studentName,
          attempts: 0,
          totalScore: 0,
          totalTime: 0,
        };
      }
      studentData[studentName].attempts += 1;
      studentData[studentName].totalScore += attempt.score || 0;
      studentData[studentName].totalTime += attempt.completionTimeSeconds || 0;
    });

    return Object.values(studentData).map(student => ({
      name: student.name,
      averageScore: student.attempts > 0 ? student.totalScore / student.attempts : 0,
      averageTime: student.attempts > 0 ? student.totalTime / student.attempts : 0,
    }));
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Typography color="error">{error}</Typography></Box>;
  }

  const chartData = getChartData();
  return (
    <Box sx={{ flexGrow: 1, backgroundColor: 'background.default', minHeight: '100vh', width: "100%", pt: '80px' }}>
      <MarketingNavbar />
      <Container className="page-container">
        <Paper className="page-paper">
          <Typography variant="h4" component="h1" sx={{ mb: 4 }}>
            Student Analytics
          </Typography>
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Average Score per Student</Typography>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="averageScore" fill="#8884d8" name="Average Score" />
            </BarChart>
          </ResponsiveContainer>

          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Average Time per Student (seconds)</Typography>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="averageTime" fill="#82ca9d" name="Average Time (s)" />
            </BarChart>
          </ResponsiveContainer>

        </Paper>
      </Container>
      <MarketingFooter />
    </Box>
  );
};

export default Analytics;
