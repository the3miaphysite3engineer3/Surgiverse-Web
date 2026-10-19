import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'sv-theme';

export const getInitialMode = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch (e) {
    // localStorage unavailable (private mode etc.) — fall through to system preference
  }
  if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

const ThemeModeContext = createContext({ mode: 'light', toggleTheme: () => {} });

export const ThemeModeProvider = ({ children }) => {
  const [mode, setMode] = useState(getInitialMode);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    root.style.colorScheme = mode;
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {
      // ignore persistence failures
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'dark' ? '#020617' : '#f0f2f5');
  }, [mode]);

  const value = useMemo(
    () => ({ mode, toggleTheme: () => setMode((m) => (m === 'light' ? 'dark' : 'light')) }),
    [mode]
  );

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
};

export const useThemeMode = () => useContext(ThemeModeContext);
