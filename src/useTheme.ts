import { useState, useEffect } from 'react';

const THEME_KEY = 'receipts_theme';

function getInitialTheme(): boolean {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored !== null) return stored === 'light';
  } catch {}
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return false;
  return true;
}

export function useTheme(): [boolean, () => void] {
  const [light, setLight] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('light', light);
    try { localStorage.setItem(THEME_KEY, light ? 'light' : 'dark'); } catch {}
  }, [light]);

  return [light, () => setLight((p) => !p)];
}
