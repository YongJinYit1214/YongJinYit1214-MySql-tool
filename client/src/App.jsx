import { useState, useMemo, useEffect } from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import MainPage from './pages/MainPage';
import './App.css';

// Create theme settings for both light and dark modes
const getThemeSettings = (mode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // Light mode colors
          primary: {
            main: '#2563eb', // Modern blue
            light: '#60a5fa',
            dark: '#1d4ed8',
            contrastText: '#ffffff',
            lighter: '#eff6ff',
          },
          secondary: {
            main: '#7c3aed', // Purple
            light: '#a78bfa',
            dark: '#5b21b6',
            contrastText: '#ffffff',
          },
          error: {
            main: '#ef4444', // Red
            light: '#f87171',
            dark: '#b91c1c',
          },
          warning: {
            main: '#f59e0b', // Amber
            light: '#fbbf24',
            dark: '#d97706',
          },
          info: {
            main: '#0ea5e9', // Sky blue
            light: '#38bdf8',
            dark: '#0284c7',
          },
          success: {
            main: '#10b981', // Emerald
            light: '#34d399',
            dark: '#059669',
          },
          background: {
            default: '#f8fafc',
            paper: '#ffffff',
            lighter: '#f1f5f9',
          },
          text: {
            primary: '#1e293b',
            secondary: '#64748b',
            disabled: '#94a3b8',
          },
          divider: 'rgba(0, 0, 0, 0.08)',
        }
      : {
          // Dark mode colors
          primary: {
            main: '#3b82f6', // Brighter blue for dark mode
            light: '#60a5fa',
            dark: '#1d4ed8',
            contrastText: '#ffffff',
            lighter: '#1e293b',
          },
          secondary: {
            main: '#8b5cf6', // Brighter purple for dark mode
            light: '#a78bfa',
            dark: '#5b21b6',
            contrastText: '#ffffff',
          },
          error: {
            main: '#f87171', // Brighter red for dark mode
            light: '#fca5a5',
            dark: '#b91c1c',
          },
          warning: {
            main: '#fbbf24', // Brighter amber for dark mode
            light: '#fcd34d',
            dark: '#d97706',
          },
          info: {
            main: '#38bdf8', // Brighter sky blue for dark mode
            light: '#7dd3fc',
            dark: '#0284c7',
          },
          success: {
            main: '#34d399', // Brighter emerald for dark mode
            light: '#6ee7b7',
            dark: '#059669',
          },
          background: {
            default: '#0f172a', // Dark blue
            paper: '#1e293b', // Slightly lighter blue
            lighter: '#334155', // Even lighter for hover states
          },
          text: {
            primary: '#f1f5f9',
            secondary: '#cbd5e1',
            disabled: '#64748b',
          },
          divider: 'rgba(255, 255, 255, 0.08)',
        }),
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
    subtitle2: {
      fontWeight: 500,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0px 1px 2px rgba(0, 0, 0, 0.05)',
    '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
    '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)',
    '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.05)',
    '0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
          '&:hover': {
            boxShadow: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
        },
        elevation1: {
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
        },
        elevation2: {
          boxShadow: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
        elevation3: {
          boxShadow: '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        elevation4: {
          boxShadow: '0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          boxShadow: '0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)',
          borderRadius: 12,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: mode => mode === 'light' ? '#f8fafc' : '#1e293b',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease-in-out',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: mode => mode === 'light' ? 'rgba(37, 99, 235, 0.5)' : 'rgba(59, 130, 246, 0.5)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: 2,
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          borderRadius: 8,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          margin: '2px 4px',
          '&:hover': {
            backgroundColor: mode => mode === 'light' ? 'rgba(37, 99, 235, 0.08)' : 'rgba(59, 130, 246, 0.15)',
          },
          '&.Mui-selected': {
            backgroundColor: mode => mode === 'light' ? 'rgba(37, 99, 235, 0.12)' : 'rgba(59, 130, 246, 0.2)',
            '&:hover': {
              backgroundColor: mode => mode === 'light' ? 'rgba(37, 99, 235, 0.18)' : 'rgba(59, 130, 246, 0.25)',
            },
          },
        },
      },
    },
  },
});

function App() {
  // State for theme mode (light/dark)
  const [mode, setMode] = useState(() => {
    // Try to get the theme mode from localStorage
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || 'light';
  });

  // Save theme mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  // Create a theme object with the current mode
  const theme = useMemo(() => createTheme(getThemeSettings(mode)), [mode]);

  // Function to toggle between light and dark mode
  const toggleColorMode = () => {
    setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MainPage toggleColorMode={toggleColorMode} mode={mode} />
    </ThemeProvider>
  );
}

export default App;
