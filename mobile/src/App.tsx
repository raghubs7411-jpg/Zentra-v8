/**
 * Mobile App — App Entry Point (React Native)
 *
 * Bottom tab navigation: Home (Dashboard) | New Sale | Customers | Khata | More
 * Reuses the same Supabase backend and TypeScript domain types as the web app.
 * Push notifications via FCM for payment overdue, low stock, and daily summary alerts.
 */
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView, Text, View, ActivityIndicator } from 'react-native';
import { useAuth } from './hooks/useAuth';
import { pushService } from './services/pushNotifications';
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { NewSaleScreen, CustomersScreen, KhataScreen, MoreScreen } from './screens/PlaceholderScreens';

const Tab = createBottomTabNavigator();

export default function App() {
  const { session, loading, user } = useAuth();

  // Initialize push notifications when user logs in
  useEffect(() => {
    if (session?.user) {
      pushService.initialize(session.user.id);
      const unsubscribe = pushService.subscribeToNotifications(session.user.id);
      return unsubscribe;
    }
  }, [session]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#ffffff' },
          headerTintColor: '#0f172a',
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarStyle: { paddingBottom: 4, paddingTop: 4 },
        }}
      >
        <Tab.Screen name="home" component={HomeScreen} options={{ title: 'Home' }} />
        <Tab.Screen name="new-sale" component={NewSaleScreen} options={{ title: 'New Sale' }} />
        <Tab.Screen name="customers" component={CustomersScreen} options={{ title: 'Customers' }} />
        <Tab.Screen name="khata" component={KhataScreen} options={{ title: 'Khata' }} />
        <Tab.Screen name="more" component={MoreScreen} options={{ title: 'More' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
