import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CircularProgress, Box } from '@mui/material';

const ProfessorRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const [isProfessor, setIsProfessor] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(true);

  React.useEffect(() => {
    const checkProfessorRole = async () => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().role === 'professor') {
          setIsProfessor(true);
        }
      }
      setIsChecking(false);
    };

    if (!loading) {
      checkProfessorRole();
    }
  }, [user, loading]);

  if (loading || isChecking) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  if (!user || !isProfessor) {
    return <Navigate to="/" />;
  }

  return children;
};

export default ProfessorRoute;
