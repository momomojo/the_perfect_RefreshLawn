import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../global.css';
import { Platform } from 'react-native';
import { AuthProvider } from '../lib/auth';
import { ConfirmationModalProvider } from '../lib/confirmation'; // Restore the provider
import { StripeProviderWrapper } from '../lib/stripe-provider';
import Toast from 'react-native-toast-message';
import { validateClientEnvironment } from '../lib/env-validation';
import { initializeSentry } from '../lib/sentry';

// Initialize Sentry for crash reporting and performance monitoring
// Must be called before any other app initialization
initializeSentry();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Validate environment variables at app startup (runtime validation)
// This catches missing variables that might have been set at build time but are missing at runtime
try {
  validateClientEnvironment();
} catch (error) {
  console.error('[App] Environment validation failed:', error);
  // Let the app continue but log the error prominently
  // The individual components will fail gracefully with better error messages
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_TEMPO && Platform.OS === 'web') {
      const { TempoDevtools } = require('tempo-devtools');
      TempoDevtools.init();
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <StripeProviderWrapper>
        <ConfirmationModalProvider>
          <ThemeProvider value={DefaultTheme}>
            <Stack
              screenOptions={({ route }) => ({
                headerShown: !route.name.startsWith('tempobook'),
              })}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(admin)" options={{ headerShown: false }} />
              <Stack.Screen
                name="(admin_stack)"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="(customer)"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="(technician)"
                options={{ headerShown: false }}
              />
            </Stack>
            <StatusBar style="auto" />
            <Toast />
          </ThemeProvider>
        </ConfirmationModalProvider>
      </StripeProviderWrapper>
    </AuthProvider>
  );
}
