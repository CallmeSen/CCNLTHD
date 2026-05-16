import { useEffect, useState } from 'react';

const THEME_KEY = 'theme';

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
}

function readInitialTheme() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(THEME_KEY) === 'dark';
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState(readInitialTheme);

  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  const setTheme = (nextDark: boolean) => {
    localStorage.setItem(THEME_KEY, nextDark ? 'dark' : 'light');
    setIsDark(nextDark);
    applyTheme(nextDark);
  };

  const toggle = () => setTheme(!isDark);

  return { isDark, toggle, setTheme };
}

