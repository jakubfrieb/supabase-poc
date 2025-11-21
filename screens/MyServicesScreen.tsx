import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useServiceProvider } from '../hooks/useServiceProvider';
import { useServiceRegistrations } from '../hooks/useServiceRegistrations';
import { useProviderIssues } from '../hooks/useProviderIssues';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const serviceIcons: Record<string, string> = {
  'Instalatérství': 'water-outline',
  'Elektrikář': 'flash-outline',
  'Zedník': 'hammer-outline',
  'Malíř': 'brush-outline',
  'Truhlář': 'cube-outline',
  'Sklenář': 'albums-outline',
  'Zámečník': 'lock-closed-outline',
  'Obkladač': 'grid-outline',
  'Podlahář': 'layers-outline',
  'Topenář': 'flame-outline',
  'Klimatizace': 'snow-outline',
  'Revize elektro': 'checkmark-circle-outline',
  'Revize plyn': 'checkmark-circle-outline',
  'Tesař': 'home-outline',
  'Klempíř': 'construct-outline',
  'Zahradník': 'leaf-outline',
  'Úklid': 'sparkles-outline',
  'Skládka': 'trash-outline',
};

export function MyServicesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { provider, loading: providerLoading, refetch: refetchProvider } = useServiceProvider();
  const { registrations, loading: registrationsLoading, refetch: refetchRegistrations } = useServiceRegistrations();
  const { issues: providerIssues, loading: providerIssuesLoading } = useProviderIssues();

  // Refetch when the screen gains focus so newly registered services appear immediately
  useFocusEffect(
    useCallback(() => {
      refetchRegistrations();
      refetchProvider();
    }, [refetchRegistrations, refetchProvider])
  );

  const getIcon = (serviceName: string) => {
    return serviceIcons[serviceName] || 'build-outline';
  };

  const getStatusColor = (status: string, paidUntil: string | null) => {
    if (status === 'active' && paidUntil && new Date(paidUntil) > new Date()) {
      return colors.success;
    }
    if (status === 'pending') {
      return colors.warning;
    }
    return colors.error;
  };

  const getStatusLabel = (status: string, paidUntil: string | null) => {
    if (status === 'active' && paidUntil) {
      const daysUntil = Math.ceil((new Date(paidUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil > 0) {
        return `Aktivní (vyprší za ${daysUntil} dní)`;
      }
      return 'Vypršela';
    }
    if (status === 'pending') {
      return 'Čeká na platbu';
    }
    return 'Vypršela';
  };

  if (providerLoading || registrationsLoading) {
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

  if (!provider) {
    return (
      <ImageBackground
        source={require('../assets/background/theme_1.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
        imageStyle={styles.backgroundImageStyle}
      >
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <Card>
            <Text style={styles.emptyTitle}>Ještě nejste registrovaný dodavatel</Text>
            <Text style={styles.emptyDescription}>
              Pro registraci služeb je třeba nejprve vytvořit profil dodavatele.
            </Text>
            <Button
              title="Registrovat služby"
              onPress={() => navigation.navigate('ServiceRegistration')}
              style={styles.button}
            />
          </Card>
        </SafeAreaView>
      </ImageBackground>
    );
  }

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
            <Text style={styles.title}>Moje služby</Text>
            <Text style={styles.subtitle}>{provider.company_name}</Text>
          </View>

          {registrations.length === 0 ? (
            <Card>
              <Text style={styles.emptyTitle}>Zatím žádné registrované služby</Text>
              <Text style={styles.emptyDescription}>
                Přidejte služby, které chcete nabízet.
              </Text>
              <Button
                title="Přidat službu"
                onPress={() => navigation.navigate('ServiceRegistration')}
                style={styles.button}
              />
            </Card>
          ) : (
            <>
              {registrations.map((reg: any) => {
                const service = reg.services;
                const serviceName = service?.name || 'Neznámá služba';
                const statusColor = getStatusColor(reg.status, reg.paid_until);
                const statusLabel = getStatusLabel(reg.status, reg.paid_until);
                const iconName = getIcon(serviceName);

                return (
                  <Card key={reg.id} style={styles.serviceCard}>
                    <View style={styles.serviceHeader}>
                      <View style={styles.serviceIcon}>
                        <Ionicons name={iconName as any} size={32} color={colors.primary} />
                      </View>
                      <View style={styles.serviceInfo}>
                        <Text style={styles.serviceName}>{serviceName}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                          <Text style={styles.statusText}>{statusLabel}</Text>
                        </View>
                      </View>
                    </View>
                    {reg.paid_until && (
                      <Text style={styles.validUntil}>
                        Platná do: {new Date(reg.paid_until).toLocaleDateString('cs-CZ')}
                      </Text>
                    )}
                  </Card>
                );
              })}

              <Button
                title="Přidat další službu"
                onPress={() => navigation.navigate('ServiceRegistration')}
                variant="outline"
                style={styles.button}
              />
            </>
          )}


          {providerIssues.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Vysoutěžené závady</Text>
                <Text style={styles.sectionSubtitle}>
                  {providerIssues.length} {providerIssues.length === 1 ? 'závada' : providerIssues.length < 5 ? 'závady' : 'závad'}
                </Text>
              </View>
              {providerIssues.map((issue) => (
                <Card key={issue.id} style={styles.issueCard}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('IssueDetail', {
                      issueId: issue.id,
                      facilityId: issue.facility_id,
                    })}
                  >
                    <View style={styles.issueHeader}>
                      <Text style={styles.issueTitle}>{issue.title}</Text>
                      <View style={[
                        styles.issueStatusBadge,
                        { backgroundColor: issue.status === 'open' ? colors.statusOpen : 
                                         issue.status === 'in_progress' ? colors.statusInProgress :
                                         issue.status === 'resolved' ? colors.statusResolved :
                                         colors.statusClosed }
                      ]}>
                        <Text style={styles.issueStatusText}>
                          {issue.status === 'open' ? 'Otevřeno' :
                           issue.status === 'in_progress' ? 'V řešení' :
                           issue.status === 'resolved' ? 'Vyřešeno' : 'Zavřeno'}
                        </Text>
                      </View>
                    </View>
                    {issue.description && (
                      <Text style={styles.issueDescription} numberOfLines={2}>
                        {issue.description}
                      </Text>
                    )}
                    <Text style={styles.issueDate}>
                      Vytvořeno: {new Date(issue.created_at).toLocaleDateString('cs-CZ')}
                    </Text>
                  </TouchableOpacity>
                </Card>
              ))}
            </>
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
  serviceCard: {
    marginBottom: spacing.md,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  validUntil: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  issueCard: {
    marginBottom: spacing.md,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  issueTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  issueStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  issueStatusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  issueDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  issueDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  requestCard: {
    marginBottom: spacing.md,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  requestDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});

