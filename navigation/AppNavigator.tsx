import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from './types';
import { colors } from '../theme/colors';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { FacilitiesScreen } from '../screens/FacilitiesScreen';
import { CreateFacilityScreen } from '../screens/CreateFacilityScreen';
import { FacilityDetailScreen } from '../screens/FacilityDetailScreen';
import { CreateIssueScreen } from '../screens/CreateIssueScreen';
import { IssueDetailScreen } from '../screens/IssueDetailScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { JoinFacilityScreen } from '../screens/JoinFacilityScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ServiceRegistrationScreen } from '../screens/ServiceRegistrationScreen';
import { MyServicesScreen } from '../screens/MyServicesScreen';
import { ServiceCatalogScreen } from '../screens/ServiceCatalogScreen';
import { ServiceRequestScreen } from '../screens/ServiceRequestScreen';
import { ServiceApplicationsScreen } from '../screens/ServiceApplicationsScreen';
import { AppointmentSelectionScreen } from '../screens/AppointmentSelectionScreen';

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
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerShadowVisible: false,
        }}
      >
        {!user ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{
                headerShown: true,
                title: 'Reset Password',
                presentation: 'modal',
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Facilities"
              component={FacilitiesScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: 'Profil' }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ title: 'Notifikace' }}
            />
            <Stack.Screen
              name="JoinFacility"
              component={JoinFacilityScreen}
              options={{ title: 'Připojit se k existující nemovitosti', presentation: 'modal' }}
            />
            <Stack.Screen
              name="CreateFacility"
              component={CreateFacilityScreen}
              options={{
                title: 'Nová nemovitost',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="FacilityDetail"
              component={FacilityDetailScreen}
              options={{
                title: 'Detail nemovitosti',
              }}
            />
            <Stack.Screen
              name="CreateIssue"
              component={CreateIssueScreen}
              options={{
                title: 'Nová závada',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="IssueDetail"
              component={IssueDetailScreen}
              options={{
                title: 'Detail závady',
              }}
            />
            <Stack.Screen
              name="ServiceRegistration"
              component={ServiceRegistrationScreen}
              options={{
                title: 'Registrace služeb',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="MyServices"
              component={MyServicesScreen}
              options={{
                title: 'Moje služby',
              }}
            />
            <Stack.Screen
              name="ServiceCatalog"
              component={ServiceCatalogScreen}
              options={{
                title: 'Katalog služeb',
              }}
            />
            <Stack.Screen
              name="ServiceRequest"
              component={ServiceRequestScreen}
              options={{
                title: 'Poptávka dodavatele',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="ServiceApplications"
              component={ServiceApplicationsScreen}
              options={{
                title: 'Přihlášky dodavatelů',
              }}
            />
            <Stack.Screen
              name="AppointmentSelection"
              component={AppointmentSelectionScreen}
              options={{
                title: 'Termíny',
                presentation: 'modal',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
