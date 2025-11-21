import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ServiceSelector } from '../components/ServiceSelector';
import { useServices } from '../hooks/useServices';
import { useServiceProvider } from '../hooks/useServiceProvider';
import { useServiceRegistrations } from '../hooks/useServiceRegistrations';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function ServiceRegistrationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { services, loading: servicesLoading } = useServices();
  const { provider, createOrUpdateProvider, loading: providerLoading } = useServiceProvider();
  const { registrations, createRegistrations, activateWithVoucher, activateWelcomePackage, createPayment, loading: registrationsLoading } = useServiceRegistrations();

  // Pokud už existuje provider, začneme rovnou výběrem služeb
  const [step, setStep] = useState<'profile' | 'services' | 'payment'>('profile');
  const [companyName, setCompanyName] = useState('');
  const [ico, setIco] = useState('');
  const [dic, setDic] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [voucherCode, setVoucherCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'voucher' | 'payment' | 'welcome' | null>(null);
  const [loading, setLoading] = useState(false);

  // Načíst údaje z providera, pokud existuje, a přeskočit krok s profilem
  useEffect(() => {
    if (provider && !providerLoading) {
      setCompanyName(provider.company_name || '');
      setIco(provider.ico || '');
      setDic(provider.dic || '');
      setAddress(provider.address || '');
      setPhone(provider.phone || '');
      setBillingEmail(provider.billing_email || '');
      // Pokud už existuje provider, přeskočit krok s profilem
      setStep('services');
    } else if (!provider && !providerLoading) {
      // Pokud provider neexistuje, začít krokem s profilem
      setStep('profile');
    }
  }, [provider, providerLoading]);

  const totalPrice = selectedServiceIds.length * 20;

  // Získat seznam aktivních služeb (status = 'active' a paid_until > NOW())
  const activeServiceIds = useMemo(() => {
    const now = new Date();
    return registrations
      .filter(reg => {
        const isActive = reg.status === 'active';
        const isPaid = reg.paid_until && new Date(reg.paid_until) > now;
        return isActive && isPaid;
      })
      .map(reg => reg.service_id);
  }, [registrations]);

  const handleToggleService = (serviceId: string) => {
    // Neumožnit výběr aktivních služeb
    if (activeServiceIds.includes(serviceId)) {
      return;
    }
    setSelectedServiceIds(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSaveProfile = async () => {
    if (!companyName.trim() || !phone.trim() || !billingEmail.trim()) {
      Alert.alert('Chyba', 'Vyplňte prosím všechny povinné údaje (název firmy, telefon, email).');
      return;
    }

    try {
      setLoading(true);
      await createOrUpdateProvider({
        company_name: companyName.trim(),
        ico: ico.trim() || undefined,
        dic: dic.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim(),
        billing_email: billingEmail.trim(),
      });
      setStep('services');
    } catch (error: any) {
      Alert.alert('Chyba', error.message || 'Nepodařilo se uložit profil.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectServices = () => {
    if (selectedServiceIds.length === 0) {
      Alert.alert('Chyba', 'Vyberte alespoň jednu službu.');
      return;
    }
    setStep('payment');
  };

  const handleActivateVoucher = async () => {
    if (!voucherCode.trim()) {
      Alert.alert('Chyba', 'Zadejte kód voucheru.');
      return;
    }

    try {
      setLoading(true);
      await createRegistrations(selectedServiceIds);
      await activateWithVoucher(voucherCode.trim());
      Alert.alert('Hotovo', 'Voucher byl úspěšně aktivován! Vaše služby jsou aktivní na 3 měsíce.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Chyba', error.message || 'Nepodařilo se aktivovat voucher.');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateWelcomePackage = async () => {
    try {
      setLoading(true);
      await activateWelcomePackage(selectedServiceIds);
      Alert.alert(
        'Hotovo',
        'Uvítací balíček byl úspěšně aktivován! Vaše vybrané služby jsou aktivní na 3 měsíce zdarma.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Chyba', error.message || 'Nepodařilo se aktivovat uvítací balíček.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async () => {
    try {
      setLoading(true);
      const registrations = await createRegistrations(selectedServiceIds);
      
      // Create payment for each registration
      for (const reg of registrations || []) {
        await createPayment(reg.id, 20);
      }

      // Použít email z providera, pokud existuje
      const email = provider?.billing_email || billingEmail;

      Alert.alert(
        'Registrace dokončena',
        `Registrace služeb byla vytvořena. Celková částka: ${totalPrice} Kč.\n\nPlatební instrukce budou zaslány na email ${email}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Chyba', error.message || 'Nepodařilo se vytvořit registraci.');
    } finally {
      setLoading(false);
    }
  };

  if (servicesLoading || providerLoading || registrationsLoading) {
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Registrace služeb</Text>
              <Text style={styles.subtitle}>
                {step === 'profile' && 'Vyplňte fakturační údaje'}
                {step === 'services' && 'Vyberte služby, které chcete nabízet'}
                {step === 'payment' && 'Aktivujte služby voucherem nebo zaplaťte'}
              </Text>
            </View>

            {step === 'profile' && (
              <Card>
                <Text style={styles.sectionTitle}>Fakturační údaje</Text>
                <Input
                  label="Název firmy *"
                  placeholder="Název firmy"
                  value={companyName}
                  onChangeText={setCompanyName}
                />
                <Input
                  label="IČO"
                  placeholder="IČO (volitelné)"
                  value={ico}
                  onChangeText={setIco}
                />
                <Input
                  label="DIČ"
                  placeholder="DIČ (volitelné)"
                  value={dic}
                  onChangeText={setDic}
                />
                <Input
                  label="Adresa"
                  placeholder="Adresa (volitelné)"
                  value={address}
                  onChangeText={setAddress}
                  multiline
                />
                <Input
                  label="Telefon *"
                  placeholder="Telefon"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
                <Input
                  label="Fakturační email *"
                  placeholder="email@example.com"
                  value={billingEmail}
                  onChangeText={setBillingEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Button
                  title="Pokračovat"
                  onPress={handleSaveProfile}
                  loading={loading}
                  style={styles.button}
                />
              </Card>
            )}

            {step === 'services' && (
              <>
                {provider && (
                  <Card style={styles.providerInfoCard}>
                    <Text style={styles.providerInfoTitle}>Firemní údaje</Text>
                    <Text style={styles.providerInfoText}>{provider.company_name}</Text>
                    {provider.ico && <Text style={styles.providerInfoText}>IČO: {provider.ico}</Text>}
                    {provider.dic && <Text style={styles.providerInfoText}>DIČ: {provider.dic}</Text>}
                  </Card>
                )}
                <Card>
                  <Text style={styles.sectionTitle}>Vyberte služby</Text>
                  <Text style={styles.sectionDescription}>
                    Vyberte služby, které chcete nabízet. Za každou službu se platí 20 Kč/rok.
                  </Text>
                </Card>
                <View style={styles.serviceSelectorWrapper}>
                  <ServiceSelector
                    services={services}
                    selectedServiceIds={selectedServiceIds}
                    onToggle={handleToggleService}
                    disabledServiceIds={activeServiceIds}
                  />
                </View>
                <Card style={styles.priceCard}>
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Celková cena:</Text>
                    <Text style={styles.priceValue}>{totalPrice} Kč/rok</Text>
                  </View>
                  <Button
                    title="Pokračovat k platbě"
                    onPress={handleSelectServices}
                    disabled={selectedServiceIds.length === 0}
                    style={styles.button}
                  />
                </Card>
              </>
            )}

            {step === 'payment' && (
              <Card>
                <Text style={styles.sectionTitle}>Aktivace služeb</Text>
                <Text style={styles.sectionDescription}>
                  Vyberte způsob aktivace služeb. Můžete použít uvítací balíček (3 měsíce zdarma), voucher nebo zaplatit bankovním převodem.
                </Text>

                <View style={styles.paymentOptions}>
                  {/* Uvítací balíček */}
                  <TouchableOpacity
                    style={[styles.paymentOption, paymentMethod === 'welcome' && styles.paymentOptionActive]}
                    onPress={() => setPaymentMethod(paymentMethod === 'welcome' ? null : 'welcome')}
                  >
                    <Ionicons
                      name={paymentMethod === 'welcome' ? 'radio-button-on' : 'radio-button-off'}
                      size={24}
                      color={paymentMethod === 'welcome' ? colors.primary : colors.textSecondary}
                    />
                    <View style={styles.paymentOptionContent}>
                      <Text style={styles.paymentOptionText}>Uvítací balíček</Text>
                      <Text style={styles.paymentOptionSubtext}>3 měsíce zdarma (lze použít vícekrát)</Text>
                    </View>
                  </TouchableOpacity>

                  {paymentMethod === 'welcome' && (
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentInfoText}>
                        Uvítací balíček aktivuje vybrané služby na 3 měsíce zdarma. Můžete ho použít postupně na různé služby.
                      </Text>
                      <Button
                        title="Aktivovat uvítací balíček"
                        onPress={handleActivateWelcomePackage}
                        loading={loading}
                        style={styles.button}
                      />
                    </View>
                  )}

                  {/* Voucher */}
                  <TouchableOpacity
                    style={[styles.paymentOption, paymentMethod === 'voucher' && styles.paymentOptionActive]}
                    onPress={() => setPaymentMethod(paymentMethod === 'voucher' ? null : 'voucher')}
                  >
                    <Ionicons
                      name={paymentMethod === 'voucher' ? 'radio-button-on' : 'radio-button-off'}
                      size={24}
                      color={paymentMethod === 'voucher' ? colors.primary : colors.textSecondary}
                    />
                    <View style={styles.paymentOptionContent}>
                      <Text style={styles.paymentOptionText}>Aktivovat voucherem</Text>
                      <Text style={styles.paymentOptionSubtext}>Zadejte kód voucheru</Text>
                    </View>
                  </TouchableOpacity>

                  {paymentMethod === 'voucher' && (
                    <View style={styles.voucherInputContainer}>
                      <Input
                        label="Kód voucheru"
                        placeholder="ABC123"
                        value={voucherCode}
                        onChangeText={setVoucherCode}
                        autoCapitalize="characters"
                      />
                      <Button
                        title="Aktivovat voucher"
                        onPress={handleActivateVoucher}
                        loading={loading}
                        variant="outline"
                        style={styles.button}
                      />
                    </View>
                  )}

                  {/* Bankovní převod */}
                  <TouchableOpacity
                    style={[styles.paymentOption, paymentMethod === 'payment' && styles.paymentOptionActive]}
                    onPress={() => setPaymentMethod(paymentMethod === 'payment' ? null : 'payment')}
                  >
                    <Ionicons
                      name={paymentMethod === 'payment' ? 'radio-button-on' : 'radio-button-off'}
                      size={24}
                      color={paymentMethod === 'payment' ? colors.primary : colors.textSecondary}
                    />
                    <View style={styles.paymentOptionContent}>
                      <Text style={styles.paymentOptionText}>Zaplatit bankovním převodem</Text>
                      <Text style={styles.paymentOptionSubtext}>Celková částka: {totalPrice} Kč</Text>
                    </View>
                  </TouchableOpacity>

                  {paymentMethod === 'payment' && (
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentInfoText}>
                        Celková částka: <Text style={styles.paymentInfoBold}>{totalPrice} Kč</Text>
                      </Text>
                      <Text style={styles.paymentInfoText}>
                        Platební instrukce budou zaslány na email {provider?.billing_email || billingEmail} po vytvoření registrace.
                      </Text>
                      <Button
                        title="Vytvořit registraci a zaplatit"
                        onPress={handleCreatePayment}
                        loading={loading}
                        style={styles.button}
                      />
                    </View>
                  )}
                </View>
              </Card>
            )}

            {step !== 'profile' && (
              <Button
                title="Zpět"
                onPress={() => {
                  if (step === 'payment') {
                    setStep('services');
                  } else if (step === 'services' && provider) {
                    // Pokud existuje provider, nemůžeme jít zpět na profil
                    // Místo toho jdeme zpět na předchozí obrazovku
                    navigation.goBack();
                  } else {
                    setStep('profile');
                  }
                }}
                variant="outline"
                style={styles.button}
              />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 120,
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
  sectionDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  button: {
    marginTop: spacing.md,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
  },
  priceLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  priceValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  paymentOptions: {
    marginTop: spacing.md,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  paymentOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.backgroundDark,
  },
  paymentOptionContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  paymentOptionText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  paymentOptionSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  voucherInputContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
  },
  paymentInfo: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
  },
  paymentInfoText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  paymentInfoBold: {
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  serviceSelectorWrapper: {
    marginTop: spacing.md,
  },
  priceCard: {
    marginTop: spacing.md,
  },
  providerInfoCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.backgroundDark,
  },
  providerInfoTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  providerInfoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
});

