import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useState, useEffect } from 'react';
import { CircularProgress, Box } from '@mui/material';

const TaProfessorRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserRole(userDocSnap.data().role);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      }
      setRoleLoading(false);
    };

    if (!loading) {
      fetchUserRole();
    }
  }, [user, loading]);

  if (loading || roleLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  if (userRole === 'professor' || userRole === 'TA') {
    return children;
  } else {
    return <Navigate to="/" />;
  }
};

export default TaProfessorRoute;
