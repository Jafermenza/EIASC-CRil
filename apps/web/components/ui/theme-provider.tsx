'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'system' | 'dark';
type ThemeContextValue = { theme: Theme; resolvedTheme: 'light' | 'dark'; setTheme: (theme: Theme) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'eiasc-theme';

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial = saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
    setThemeState(initial);
    setResolvedTheme(resolveTheme(initial));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolvedTheme(media.matches ? 'dark' : 'light');
    onChange();
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    resolvedTheme,
    setTheme: (next: Theme) => {
      setThemeState(next);
      setResolvedTheme(resolveTheme(next));
      window.localStorage.setItem(STORAGE_KEY, next);
    },
  }), [theme, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}

export function ThemeControls() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="theme-controls" role="group" aria-label="Appearance">
      <button type="button" aria-pressed={theme === 'light'} onClick={() => setTheme('light')} title="Light">☀</button>
      <button type="button" aria-pressed={theme === 'system'} onClick={() => setTheme('system')} title="System">◐</button>
      <button type="button" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')} title="Dark">☾</button>
    </div>
  );
}
