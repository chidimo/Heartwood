import { useColorScheme } from 'react-native';

// Native navigation chrome (headers, tab bar) doesn't read NativeWind's dark: classes, so it follows
// the system colour scheme through these values instead.
const COLORS = {
  light: { background: '#ffffff', text: '#14211a', muted: '#6b7a71', accent: '#2c6340' },
  dark: { background: '#14211a', text: '#ffffff', muted: '#8a948d', accent: '#aed1b9' },
};

export const useNavColors = () => COLORS[useColorScheme() === 'dark' ? 'dark' : 'light'];
