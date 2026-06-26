import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { ActivityIndicator, View, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from './src/theme';
import { useUser } from './src/hooks/useUser';
import { registerForPushNotifications } from './src/services/notifications';
import AppNavigator from './src/navigation';
import OnboardingScreen from './src/screens/OnboardingScreen';

function AppInner() {
  const { colors, theme } = useTheme();
  const { user, loading, saveUser, updateUser, loginWithUsername, logout } = useUser();

  useEffect(() => {
    if (user) {
      registerForPushNotifications(user.id).then((token) => {
        if (token && token !== user.pushToken) updateUser({ pushToken: token });
      });
    }
  }, [user?.id]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        {!user ? (
          <OnboardingScreen onComplete={saveUser} onLogin={loginWithUsername} />
        ) : (
          <AppNavigator user={user} onUserUpdate={updateUser} onLogout={logout} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
