import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { colors, spacing, fontSize, fontWeight } from '../theme/colors';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { CameraView, Camera } from 'expo-camera';

export function JoinFacilityScreen() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (scanning) {
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      })();
    }
  }, [scanning]);

  const handleJoin = async (inviteCode: string) => {
    try {
      // Use SECURITY DEFINER function to join facility by invite code
      // This bypasses RLS policies that would prevent the user from inserting themselves
      const { data, error } = await supabase.rpc('join_facility_by_invite', {
        invite_code: inviteCode.trim()
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error('Nepodařilo se připojit k nemovitosti.');

      Alert.alert('Hotovo', 'Byli jste přidáni do nemovitosti.');
    } catch (e: any) {
      Alert.alert('Chyba', e.message ?? 'Nepodařilo se připojit k nemovitosti.');
    }
  };

  return (
    <ImageBackground 
      source={require('../assets/background/theme_1.png')} 
      style={styles.backgroundImage}
      resizeMode="cover"
      imageStyle={styles.backgroundImageStyle}
    >
      <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Připojit se k existující nemovitosti</Text>
      <TextInput
        style={styles.input}
        placeholder="xxx-xxx"
        autoCapitalize="characters"
        value={code}
        onChangeText={setCode}
      />
      <Button title="Připojit se" onPress={() => handleJoin(code)} />

      <>
        <View style={{ height: spacing.xl }} />
        {!scanning ? (
          <Button title="Naskenovat QR kód" variant="outline" onPress={() => setScanning(true)} />
        ) : hasPermission === false ? (
          <Text style={styles.info}>Přístup ke kameře byl zamítnut.</Text>
        ) : (
          <View style={{ height: 300, overflow: 'hidden', borderRadius: 12 }}>
            <CameraView
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }: { data: string }) => {
                setScanning(false);
                handleJoin(String(data));
              }}
              style={{ width: '100%', height: '100%' }}
            />
          </View>
        )}
      </>
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
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderColor: colors.border,
    borderWidth: 1,
  },
  info: {
    color: colors.textSecondary,
  },
});


