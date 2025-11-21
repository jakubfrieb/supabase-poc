import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { useServices } from '../hooks/useServices';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme/colors';

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

export function ServiceCatalogScreen() {
  const { services, loading } = useServices();

  const getIcon = (serviceName: string) => {
    return serviceIcons[serviceName] || 'build-outline';
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
            <Text style={styles.title}>Katalog služeb</Text>
            <Text style={styles.subtitle}>Vyberte služby, které chcete nabízet</Text>
          </View>

          <View style={styles.grid}>
            {services.map((service) => (
              <Card key={service.id} style={styles.serviceCard}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={getIcon(service.name) as any}
                    size={40}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.serviceName}>{service.name}</Text>
                {service.description && (
                  <Text style={styles.serviceDescription}>{service.description}</Text>
                )}
                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>Cena:</Text>
                  <Text style={styles.priceValue}>{service.default_price} Kč/rok</Text>
                </View>
              </Card>
            ))}
          </View>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  serviceCard: {
    width: '47%',
    alignItems: 'center',
    minHeight: 180,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  serviceName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  serviceDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    flex: 1,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    width: '100%',
    justifyContent: 'center',
  },
  priceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  priceValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
});

