import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFacilities } from '../hooks/useFacilities';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function CreateFacilityScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { createFacility } = useFacilities();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a facility name');
      return;
    }

    try {
      setLoading(true);
      await createFacility({
        name: name.trim(),
        description: description.trim() || undefined,
        address: address.trim() || undefined,
      });
      Alert.alert('Success', 'Facility created successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to create facility. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create Facility</Text>
            <Text style={styles.subtitle}>
              Add a new facility to manage and track issues
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Facility Name *"
              placeholder="e.g., Main Office Building"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Input
              label="Description"
              placeholder="Brief description of the facility"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              style={styles.textArea}
            />

            <Input
              label="Address"
              placeholder="Full address of the facility"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              style={styles.textArea}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Cancel"
            onPress={() => navigation.goBack()}
            variant="outline"
            style={styles.cancelButton}
          />
          <Button
            title="Create Facility"
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  form: {
    gap: 4,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});
