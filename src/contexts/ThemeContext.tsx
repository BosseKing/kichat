import React, { createContext, useContext, useEffect, useState } from 'react';

type ColorTheme = 'blue' | 'red' | 'green' | 'orange' | 'pink';
type Mode = 'dark' | 'light';

interface ThemeContextType {
  color: ColorTheme;
  mode: Mode;
  setColor: (color: ColorTheme) => void;
  setMode: (mode: Mode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const colorThemes = {
  blue: {
    dark: {
      primary: '217 91% 60%',
      primaryForeground: '0 0% 100%',
      accent: '210 100% 55%',
    },
    light: {
      primary: '217 91% 45%',
      primaryForeground: '0 0% 100%',
      accent: '210 100% 40%',
    }
  },
  red: {
    dark: {
      primary: '0 84% 60%',
      primaryForeground: '0 0% 100%',
      accent: '355 90% 55%',
    },
    light: {
      primary: '0 84% 45%',
      primaryForeground: '0 0% 100%',
      accent: '355 90% 40%',
    }
  },
  green: {
    dark: {
      primary: '142 76% 50%',
      primaryForeground: '0 0% 100%',
      accent: '160 84% 45%',
    },
    light: {
      primary: '142 76% 36%',
      primaryForeground: '0 0% 100%',
      accent: '160 84% 30%',
    }
  },
  orange: {
    dark: {
      primary: '25 95% 53%',
      primaryForeground: '0 0% 100%',
      accent: '33 100% 50%',
    },
    light: {
      primary: '25 95% 40%',
      primaryForeground: '0 0% 100%',
      accent: '33 100% 35%',
    }
  },
  pink: {
    dark: {
      primary: '330 81% 60%',
      primaryForeground: '0 0% 100%',
      accent: '340 82% 52%',
    },
    light: {
      primary: '330 81% 45%',
      primaryForeground: '0 0% 100%',
      accent: '340 82% 37%',
    }
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [color, setColorState] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem('kichat-color');
    return (saved as ColorTheme) || 'blue';
  });

  const [mode, setModeState] = useState<Mode>(() => {
    const saved = localStorage.getItem('kichat-mode');
    return (saved as Mode) || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    const theme = colorThemes[color][mode];
    
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-foreground', theme.primaryForeground);
    root.style.setProperty('--accent', theme.accent);

    // Appliquer le mode
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [color, mode]);

  const setColor = (newColor: ColorTheme) => {
    setColorState(newColor);
    localStorage.setItem('kichat-color', newColor);
  };

  const setMode = (newMode: Mode) => {
    setModeState(newMode);
    localStorage.setItem('kichat-mode', newMode);
  };

  return (
    <ThemeContext.Provider value={{ color, mode, setColor, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
