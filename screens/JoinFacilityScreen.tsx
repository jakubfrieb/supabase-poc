import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme/colors';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { CameraView, Camera } from 'expo-camera';

export function JoinFacilityScreen() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const previousCodeRef = useRef('');

  useEffect(() => {
    if (scanning) {
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      })();
    }
  }, [scanning]);

  const formatCode = (text: string): string => {
    // Remove all non-alphanumeric characters and convert to uppercase
    const cleaned = text.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // Limit to 6 characters
    const limited = cleaned.slice(0, 6);
    
    // Add dash after 3 characters if we have 3 or more characters
    if (limited.length >= 3) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    }
    
    return limited;
  };

  const handleCodeChange = (text: string) => {
    // Check if user is deleting
    const isDeleting = text.length < previousCodeRef.current.length;
    
    // Remove all non-alphanumeric characters and convert to uppercase
    const cleaned = text.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // Limit to 6 characters
    const limited = cleaned.slice(0, 6);
    
    // Format: add dash after 3 characters if we have 3 or more characters
    // Exception: if deleting and we have exactly 3 characters (user deleted the dash),
    // keep it without dash
    let formatted: string;
    if (limited.length >= 3) {
      // If deleting and we had "ABC-" (4 chars) and now have "ABC" (3 chars), keep without dash
      if (isDeleting && limited.length === 3 && previousCodeRef.current.length === 4 && previousCodeRef.current.endsWith('-')) {
        formatted = limited;
      } else {
        formatted = `${limited.slice(0, 3)}-${limited.slice(3)}`;
      }
    } else {
      formatted = limited;
    }
    
    previousCodeRef.current = formatted;
    setCode(formatted);
  };

  const handleJoin = async (inviteCode: string) => {
    try {
      // Remove dash before sending to API
      const codeWithoutDash = inviteCode.replace(/-/g, '').trim();
      
      // Use SECURITY DEFINER function to join facility by invite code
      // This bypasses RLS policies that would prevent the user from inserting themselves
      const { data, error } = await supabase.rpc('join_facility_by_invite', {
        invite_code: codeWithoutDash
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error('Nepodařilo se připojit k nemovitosti.');

      Alert.alert('Hotovo', 'Byli jste přidáni do nemovitosti.');
      setCode(''); // Clear input after successful join
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
        style={[
          styles.input,
          isInputFocused && styles.inputFocused
        ]}
        placeholder="XXX-XXX"
        placeholderTextColor={colors.placeholder}
        autoCapitalize="characters"
        value={code}
        onChangeText={handleCodeChange}
        onFocus={() => setIsInputFocused(true)}
        onBlur={() => setIsInputFocused(false)}
        maxLength={7}
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
                const formattedCode = formatCode(String(data));
                setCode(formattedCode);
                handleJoin(formattedCode);
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
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderColor: colors.border,
    borderWidth: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  info: {
    color: colors.textSecondary,
  },
});


