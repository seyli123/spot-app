import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from './src/theme';
import { useUser } from './src/hooks/useUser';
import { registerForPushNotifications } from './src/services/notifications';
import AppNavigator from './src/navigation';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';

function AppInner() {
  const { colors, theme } = useTheme();
  const { user, loading, signUp, login, updateUser, logout, resetPassword } = useUser();
  const [authScreen, setAuthScreen] = useState<'login' | 'signup'>('login');

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
          authScreen === 'login' ? (
            <LoginScreen
              onLogin={login}
              onResetPassword={resetPassword}
              onGoToSignUp={() => setAuthScreen('signup')}
            />
          ) : (
            <SignUpScreen
              onSignUp={signUp}
              onGoToLogin={() => setAuthScreen('login')}
            />
          )
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
