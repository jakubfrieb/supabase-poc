import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useServices } from '../hooks/useServices';
import { useServiceRequests } from '../hooks/useServiceRequests';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'ServiceRequest'>;

export function ServiceRequestScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { issueId } = route.params;
  const { services, loading: servicesLoading } = useServices();
  const { createRequest, loading } = useServiceRequests(issueId);

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const handleCreateRequest = async () => {
    if (!selectedServiceId) {
      Alert.alert('Chyba', 'Vyberte typ služby.');
      return;
    }

    try {
      await createRequest({
        issue_id: issueId,
        service_id: selectedServiceId,
      });
      Alert.alert('Hotovo', 'Poptávka vytvořena! Dodavatelé budou notifikováni.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Chyba', error.message || 'Nepodařilo se vytvořit poptávku.');
    }
  };

  if (servicesLoading) {
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
            <Text style={styles.title}>Poptávka dodavatele</Text>
            <Text style={styles.subtitle}>Vyberte typ služby, kterou potřebujete</Text>
          </View>

          <Card>
            <Text style={styles.sectionTitle}>Vyberte službu</Text>
            <View style={styles.servicesList}>
              {services.map((service) => {
                const isSelected = selectedServiceId === service.id;
                return (
                  <TouchableOpacity
                    key={service.id}
                    style={[styles.serviceOption, isSelected && styles.serviceOptionSelected]}
                    onPress={() => setSelectedServiceId(service.id)}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={24}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                    <View style={styles.serviceOptionContent}>
                      <Text style={[styles.serviceOptionName, isSelected && styles.serviceOptionNameSelected]}>
                        {service.name}
                      </Text>
                      {service.description && (
                        <Text style={styles.serviceOptionDescription}>{service.description}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          <Button
            title="Vytvořit poptávku"
            onPress={handleCreateRequest}
            loading={loading}
            disabled={!selectedServiceId}
            style={styles.button}
          />
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
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  servicesList: {
    gap: spacing.md,
  },
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.backgroundDark,
  },
  serviceOptionContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  serviceOptionName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  serviceOptionNameSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  serviceOptionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  button: {
    marginTop: spacing.md,
  },
});

