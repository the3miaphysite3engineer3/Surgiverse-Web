import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { fetchUserProfile } from '../lib/db';

const AuthContext = createContext();

/**
 * Exposes the signed-in user in the shape the app has always used:
 *   user: { uid, email, displayName }   (uid = Supabase auth uuid)
 *   profile: the `users` row (firstName, lastName, email, role, lastLogin)
 * Role-based UI (route guards, navbars) reads profile.role — loaded once
 * per session here instead of re-fetched by every consumer.
 */
const AuthProvider = ({ children }) => {
  const [rawUser, setRawUser] = useState(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  // Profile state tracks WHICH uid it belongs to: `loading` must stay true
  // until the profile row for the CURRENT session user has loaded, or role
  // guards will decide on a missing role (and bounce professors to "/").
  const [profileState, setProfileState] = useState({ uid: null, profile: null, ready: true });

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) {
          setRawUser(data.session?.user ?? null);
          setSessionResolved(true);
        }
      })
      .catch((e) => {
        console.warn('Session restore failed:', e?.message || e);
        if (mounted) setSessionResolved(true);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setRawUser(session?.user ?? null);
      setSessionResolved(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const currentUid = rawUser?.id ?? null;

  useEffect(() => {
    let cancelled = false;

    if (!currentUid) {
      setProfileState({ uid: null, profile: null, ready: true });
      return;
    }

    setProfileState((prev) => ({ ...prev, ready: false }));
    fetchUserProfile(currentUid)
      .then((p) => {
        if (!cancelled) setProfileState({ uid: currentUid, profile: p, ready: true });
      })
      .catch((e) => {
        console.warn('Profile load failed:', e?.message || e);
        if (!cancelled) setProfileState({ uid: currentUid, profile: null, ready: true });
      });

    return () => {
      cancelled = true;
    };
  }, [currentUid]);

  const loading =
    !sessionResolved ||
    !profileState.ready ||
    profileState.uid !== currentUid;

  const profile = profileState.uid === currentUid ? profileState.profile : null;

  const displayName = profile
    ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
    : '';
  const user = rawUser
    ? {
        uid: rawUser.id,
        email: rawUser.email ?? profile?.email ?? '',
        displayName: displayName || rawUser.email || '',
      }
    : null;

  return (
    <AuthContext.Provider value={{ user, profile, loading, userEmail: user?.email }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
