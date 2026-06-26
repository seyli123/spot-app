import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { User } from '../types';
import MapScreen from '../screens/MapScreen';
import FriendsScreen from '../screens/FriendsScreen';
import GroupsScreen from '../screens/GroupsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

interface Props {
  user: User;
  onUserUpdate: (updates: Partial<User>) => void;
  onLogout: () => void;
}

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 4 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
    </View>
  );
}

export default function AppNavigator({ user, onUserUpdate, onLogout }: Props) {
  const { colors, theme } = useTheme();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.border,
            borderTopWidth: theme === 'light' ? StyleSheet.hairlineWidth : 1,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        }}
      >
        <Tab.Screen
          name="Map"
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📍" focused={focused} /> }}
        >
          {() => <MapScreen user={user} />}
        </Tab.Screen>
        <Tab.Screen
          name="Friends"
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} /> }}
        >
          {() => <FriendsScreen user={user} onUserUpdate={onUserUpdate} />}
        </Tab.Screen>
        <Tab.Screen
          name="Groups"
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} /> }}
        >
          {() => <GroupsScreen user={user} />}
        </Tab.Screen>
        <Tab.Screen
          name="Profile"
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
        >
          {() => <ProfileScreen user={user} onUserUpdate={onUserUpdate} onLogout={onLogout} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
