import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ImageBackground,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { AppointmentCard } from '../components/AppointmentCard';
import { useAppointments } from '../hooks/useAppointments';
import { useIssues } from '../hooks/useIssues';
import { useFacilityRole } from '../hooks/useFacilityRole';
import { Input } from '../components/Input';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { Issue } from '../types/database';
import { useServiceProvider } from '../hooks/useServiceProvider';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'AppointmentSelection'>;

export function AppointmentSelectionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { issueId, providerId: routeProviderId } = route.params;
  const { user } = useAuth();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loadingIssue, setLoadingIssue] = useState(true);
  const { provider: currentProvider } = useServiceProvider();
  
  // Get providerId from route params, or from current user (if provider), or from issue assigned_provider_id
  const providerId = routeProviderId || (currentProvider ? user?.id : undefined) || issue?.assigned_provider_id || undefined;
  
  const { role, isAdminOrOwner } = useFacilityRole(issue?.facility_id || null);
  const { appointments, proposeAppointment, confirmAppointment, rejectAppointment, loading } = useAppointments(issueId);

  // Fetch issue directly
  useEffect(() => {
    const fetchIssue = async () => {
      try {
        setLoadingIssue(true);
        // First try normal access
        let { data, error } = await supabase
          .from('issues')
          .select('*')
          .eq('id', issueId)
          .single();

        // If that fails (e.g., due to RLS for providers), try RPC function
        if (error && (error.code === 'PGRST116' || error.code === 'PGRST301' || error.code === '42501')) {
          console.log('Normal access failed, trying RPC function for provider access');
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('get_issue_for_provider', { issue_uuid: issueId });

          if (rpcError) {
            console.error('RPC error:', rpcError);
            throw rpcError;
          }
          
          if (rpcData && rpcData.length > 0) {
            data = rpcData[0];
            error = null;
          } else {
            console.log('RPC returned no data');
            throw new Error('Issue not found or access denied');
          }
        }

        if (error) throw error;
        setIssue(data);
      } catch (error) {
        console.error('Error fetching issue:', error);
        Alert.alert('Chyba', 'Nepodařilo se načíst závadu.');
        navigation.goBack();
      } finally {
        setLoadingIssue(false);
      }
    };

    if (issueId) {
      fetchIssue();
    }
  }, [issueId, navigation]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [proposing, setProposing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const canConfirm = issue && (
    (issue.requires_cooperation && issue.cooperation_user_id === user?.id) ||
    (!issue.requires_cooperation && isAdminOrOwner)
  );

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTime = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      // Show time picker after date is selected (on Android)
      if (Platform.OS === 'android') {
        setShowTimePicker(true);
      }
    }
    // On iOS, date picker stays open until user dismisses it
    if (Platform.OS === 'ios' && event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  const handleTimeChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (date) {
      setSelectedTime(date);
    }
    // On iOS, time picker stays open until user dismisses it
    if (Platform.OS === 'ios' && event.type === 'dismissed') {
      setShowTimePicker(false);
    }
  };

  const handleProposeAppointment = async () => {
    if (!providerId) {
      Alert.alert('Chyba', 'Není k dispozici informace o dodavateli. Zkuste to prosím znovu.');
      return;
    }
    if (!issue) {
      Alert.alert('Chyba', 'Nepodařilo se načíst závadu. Zkuste to prosím znovu.');
      return;
    }

    try {
      setProposing(true);
      if (!selectedDate || !selectedTime) {
        Alert.alert('Chyba', 'Vyberte datum a čas.');
        return;
      }

      await proposeAppointment({
        issue_id: issueId,
        provider_id: providerId,
        proposed_date: formatDate(selectedDate),
        proposed_time: formatTime(selectedTime),
        notes: notes.trim() || undefined,
      });
      
      // Reset form and close modal
      setSelectedDate(null);
      setSelectedTime(null);
      setNotes('');
      setShowAddModal(false);
    } catch (error: any) {
      Alert.alert('Chyba', error.message || 'Nepodařilo se navrhnout termín.');
    } finally {
      setProposing(false);
    }
  };

  const handleConfirmAppointment = async (appointmentId: string) => {
    try {
      await confirmAppointment(appointmentId);
      Alert.alert('Hotovo', 'Termín potvrzen!');
    } catch (error: any) {
      Alert.alert('Chyba', error.message || 'Nepodařilo se potvrdit termín.');
    }
  };

  const handleRejectAppointment = (appointmentId: string) => {
    Alert.alert(
      'Zamítnout termín',
      'Opravdu chcete zamítnout tento termín?',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Zamítnout',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectAppointment(appointmentId);
            } catch (error: any) {
              Alert.alert('Chyba', error.message || 'Nepodařilo se zamítnout termín.');
            }
          },
        },
      ]
    );
  };

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
            <Text style={styles.title}>Termíny</Text>
            <Text style={styles.subtitle}>
              {appointments.length} {appointments.length === 1 ? 'termín' : 'termínů'}
            </Text>
          </View>

          {appointments.length > 0 && (
            <View style={styles.appointmentsList}>
              {appointments.map((appointment) => (
                <TouchableOpacity
                  key={appointment.id}
                  onPress={() => {
                    // If appointment is proposed and user can confirm, confirm it on click
                    if (appointment.status === 'proposed' && canConfirm) {
                      handleConfirmAppointment(appointment.id);
                    }
                  }}
                  disabled={appointment.status !== 'proposed' || !canConfirm}
                >
                  <AppointmentCard
                    appointment={appointment}
                    proposedByName="Uživatel"
                    confirmedByName={appointment.confirmed_by ? "Uživatel" : undefined}
                    canConfirm={false}
                    canReject={false}
                    onConfirm={() => {}}
                    onReject={() => {}}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Add new appointment button - show if providerId is available or if user is assigned provider */}
          {(providerId || (issue && issue.assigned_provider_id === user?.id) || currentProvider) && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add-circle" size={24} color={colors.primary} />
              <Text style={styles.addButtonText}>Přidat termín</Text>
            </TouchableOpacity>
          )}

          {/* Date picker - show in modal on iOS, inline on Android */}
          {showDatePicker && Platform.OS === 'ios' && (
            <Modal
              visible={showDatePicker}
              transparent
              animationType="slide"
              onRequestClose={() => setShowDatePicker(false)}
            >
              <View style={styles.pickerModalOverlay}>
                <View style={styles.pickerModalContent}>
                  <View style={styles.pickerModalHeader}>
                    <Text style={styles.pickerModalTitle}>Vyberte datum</Text>
                    <TouchableOpacity onPress={() => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        setShowTimePicker(true);
                      }
                    }}>
                      <Ionicons name="checkmark" size={24} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={selectedDate || new Date()}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                    style={styles.picker}
                  />
                </View>
              </View>
            </Modal>
          )}
          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {/* Time picker - show in modal on iOS, inline on Android */}
          {showTimePicker && Platform.OS === 'ios' && (
            <Modal
              visible={showTimePicker}
              transparent
              animationType="slide"
              onRequestClose={() => setShowTimePicker(false)}
            >
              <View style={styles.pickerModalOverlay}>
                <View style={styles.pickerModalContent}>
                  <View style={styles.pickerModalHeader}>
                    <Text style={styles.pickerModalTitle}>Vyberte čas</Text>
                    <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                      <Ionicons name="checkmark" size={24} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={selectedTime || new Date()}
                    mode="time"
                    display="spinner"
                    onChange={handleTimeChange}
                    style={styles.picker}
                  />
                </View>
              </View>
            </Modal>
          )}
          {showTimePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={selectedTime || new Date()}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}

          {/* Add appointment modal */}
          <Modal
            visible={showAddModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowAddModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Přidat termín</Text>
                  <TouchableOpacity onPress={() => {
                    setShowAddModal(false);
                    setSelectedDate(null);
                    setSelectedTime(null);
                    setNotes('');
                  }}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                    <Text style={styles.dateTimeButtonText}>
                      {selectedDate ? formatDate(selectedDate) : 'Vyberte datum'}
                    </Text>
                  </TouchableOpacity>

                  {selectedDate && (
                    <TouchableOpacity
                      style={styles.dateTimeButton}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Ionicons name="time-outline" size={20} color={colors.primary} />
                      <Text style={styles.dateTimeButtonText}>
                        {selectedTime ? formatTime(selectedTime) : 'Vyberte čas'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TextInput
                    style={styles.notesInput}
                    placeholder="Poznámka (volitelné)"
                    placeholderTextColor={colors.textSecondary}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />

                  <View style={styles.modalButtons}>
                    <Button
                      title="Přidat"
                      onPress={handleProposeAppointment}
                      loading={proposing}
                      disabled={!selectedDate || !selectedTime}
                    />
                    <Button
                      title="Zrušit"
                      variant="outline"
                      onPress={() => {
                        setShowAddModal(false);
                        setSelectedDate(null);
                        setSelectedTime(null);
                        setNotes('');
                      }}
                      style={styles.modalCancelButton}
                    />
                  </View>
                </View>
              </View>
            </View>
          </Modal>
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
  appointmentsList: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  button: {
    marginTop: spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  addButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalBody: {
    gap: spacing.md,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  dateTimeButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  notesInput: {
    padding: spacing.md,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 80,
  },
  modalButtons: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalCancelButton: {
    marginTop: 0,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  pickerModalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  picker: {
    height: 200,
  },
});

