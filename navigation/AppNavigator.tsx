import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from './types';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { FacilitiesScreen } from '../screens/FacilitiesScreen';
import { CreateFacilityScreen } from '../screens/CreateFacilityScreen';
import { FacilityDetailScreen } from '../screens/FacilityDetailScreen';
import { CreateIssueScreen } from '../screens/CreateIssueScreen';
import { IssueDetailScreen } from '../screens/IssueDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#007AFF',
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerShadowVisible: false,
        }}
      >
        {!user ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Facilities"
              component={FacilitiesScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreateFacility"
              component={CreateFacilityScreen}
              options={{
                title: 'New Facility',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="FacilityDetail"
              component={FacilityDetailScreen}
              options={{
                title: 'Facility Details',
              }}
            />
            <Stack.Screen
              name="CreateIssue"
              component={CreateIssueScreen}
              options={{
                title: 'New Issue',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="IssueDetail"
              component={IssueDetailScreen}
              options={{
                title: 'Issue Details',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
