import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { ServiceProviderCard } from '../components/ServiceProviderCard';
import { useServiceApplications } from '../hooks/useServiceApplications';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'ServiceApplications'>;

export function ServiceApplicationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { requestId, issueId } = route.params;
  const { applications, selectApplication, rejectApplication, loading } = useServiceApplications(requestId);

  const handleSelectProvider = (applicationId: string) => {
    Alert.alert(
      'Vybrat dodavatele',
      'Opravdu chcete vybrat tohoto dodavatele? Ostatní přihlášky budou zamítnuty.',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Vybrat',
          onPress: async () => {
            try {
              await selectApplication(applicationId);
              Alert.alert('Hotovo', 'Dodavatel vybrán!', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error: any) {
              Alert.alert('Chyba', error.message || 'Nepodařilo se vybrat dodavatele.');
            }
          },
        },
      ]
    );
  };

  const handleRejectProvider = (applicationId: string) => {
    Alert.alert(
      'Zamítnout přihlášku',
      'Opravdu chcete zamítnout tuto přihlášku?',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Zamítnout',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectApplication(applicationId);
            } catch (error: any) {
              Alert.alert('Chyba', error.message || 'Nepodařilo se zamítnout přihlášku.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ImageBackground
        source={require('../assets/background/theme_1.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
        imageStyle={styles.backgroundImageStyle}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text>Načítání...</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  const pendingApplications = applications.filter(a => a.status === 'pending');
  const selectedApplication = applications.find(a => a.status === 'selected');
  const rejectedApplications = applications.filter(a => a.status === 'rejected');

  return (
    <ImageBackground
      source={require('../assets/background/theme_1.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
      imageStyle={styles.backgroundImageStyle}
    >
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Přihlášky dodavatelů</Text>
            <Text style={styles.subtitle}>
              {pendingApplications.length} {pendingApplications.length === 1 ? 'přihláška' : 'přihlášky'}
            </Text>
          </View>

          {selectedApplication && (
            <View style={styles.selectedSection}>
              <Text style={styles.sectionTitle}>Vybraný dodavatel</Text>
              <ServiceProviderCard
                provider={selectedApplication.service_providers as any}
                showSelectButton={false}
                showContactButton={true}
              />
            </View>
          )}

          {pendingApplications.length > 0 && (
            <View style={styles.pendingSection}>
              <Text style={styles.sectionTitle}>Čekající přihlášky</Text>
              {pendingApplications.map((app: any) => (
                <View key={app.id} style={styles.applicationCard}>
                  <ServiceProviderCard
                    provider={app.service_providers as any}
                    showSelectButton={true}
                    showContactButton={true}
                    onSelect={() => handleSelectProvider(app.id)}
                    onContact={() => {}}
                  />
                  {app.message && (
                    <View style={styles.messageContainer}>
                      <Text style={styles.messageLabel}>Zpráva od dodavatele:</Text>
                      <Text style={styles.messageText}>{app.message}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {pendingApplications.length === 0 && !selectedApplication && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Zatím žádné přihlášky</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  backgroundImageStyle: {
    opacity: 0.3,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  selectedSection: {
    marginBottom: spacing.xl,
  },
  pendingSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  applicationCard: {
    marginBottom: spacing.md,
  },
  messageContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
  },
  messageLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  messageText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});

