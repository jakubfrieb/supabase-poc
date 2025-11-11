import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
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
      // 1) Validate invite
      const { data: invite, error: inviteErr } = await supabase
        .from('facility_invites')
        .select('facility_id, role, uses, max_uses, expires_at')
        .eq('code', inviteCode.trim())
        .single();
      if (inviteErr || !invite) throw new Error('Neplatný kód pozvánky');
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) throw new Error('Kód vypršel');
      if (invite.max_uses && invite.uses >= invite.max_uses) throw new Error('Kód již byl použit');

      // 2) Add current user as member
      const { error: addErr } = await supabase
        .from('facility_members')
        .insert([{ facility_id: invite.facility_id, role: invite.role }]);
      if (addErr) throw addErr;

      // 3) Increment usage (will require admin/owner – can be done by owner later; ignore error)
      await supabase
        .from('facility_invites')
        .update({ uses: (invite.uses ?? 0) + 1 })
        .eq('code', inviteCode.trim());

      Alert.alert('Hotovo', 'Byli jste přidáni do nemovitosti.');
    } catch (e: any) {
      Alert.alert('Chyba', e.message ?? 'Nepodařilo se připojit k nemovitosti.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Připojit se k nemovitosti</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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


