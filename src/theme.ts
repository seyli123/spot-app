import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Color tokens ────────────────────────────────────────────────────────────

export interface Colors {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  accent: string;
  accentLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  warning: string;
  tabBar: string;
}

export const darkColors: Colors = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceElevated: '#2A2A2A',
  border: '#2C2C2C',
  accent: '#FF6B6B',
  accentLight: '#FF8E8E',
  text: '#FFFFFF',
  textSecondary: '#AEAEB2',
  textMuted: '#888888',
  success: '#30D158',
  warning: '#FFD60A',
  tabBar: '#1E1E1E',
};

export const lightColors: Colors = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceElevated: '#F2F2F7',
  border: '#E5E5EA',
  accent: '#FF6B6B',
  accentLight: '#FF8E8E',
  text: '#000000',
  textSecondary: '#6C6C70',
  textMuted: '#8E8E93',
  success: '#34C759',
  warning: '#FF9F0A',
  tabBar: '#FFFFFF',
};

// ── Theme context ────────────────────────────────────────────────────────────

export type ThemeName = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeName;
  colors: Colors;
  setTheme: (t: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  colors: darkColors,
  setTheme: () => {},
});

const THEME_KEY = '@spot_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') setThemeState(saved);
    });
  }, []);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    AsyncStorage.setItem(THEME_KEY, t);
  }, []);

  const value = useMemo<ThemeContextType>(
    () => ({ theme, colors: theme === 'dark' ? darkColors : lightColors, setTheme }),
    [theme, setTheme]
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}

// ── Static constants (unchanged) ─────────────────────────────────────────────

export const COPENHAGEN = {
  latitude: 55.6761,
  longitude: 12.5683,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#64779e' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#334e87' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#023e58' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6f9ba5' }] },
  { featureType: 'poi', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#023e58' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3C7680' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c6675' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#255763' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b0d5ce' }] },
  { featureType: 'road.highway', elementType: 'labels.text.stroke', stylers: [{ color: '#023747' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
  { featureType: 'transit', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
  { featureType: 'transit.line', elementType: 'geometry.fill', stylers: [{ color: '#283d6a' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#3a4762' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d70' }] },
];

export const DURATION_LABELS = {
  '30min': '30 min',
  '1h': '1 hour',
  '2h': '2 hours',
  'all-day': 'All day',
} as const;

export const EMOJI_OPTIONS = [
  '☕', '🍺', '🍕', '🍜', '🍣', '🥗',
  '🎮', '🎵', '🎨', '📚', '🏃', '🛍️',
  '🌿', '🏖️', '🌙', '⭐', '🔥', '💎',
  '🦆', '🐟', '🌺', '🌊', '🏠', '🎭',
];
