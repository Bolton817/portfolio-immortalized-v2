import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView } from 'react-native';

export function ProfileScreen() {
  const [displayName, setDisplayName] = useState('Alex Johnson');
  const [legalName, setLegalName] = useState('Alexander Patrick Johnson');
  const [dateOfBirth, setDateOfBirth] = useState('1985-05-15');
  const [residenceCountry, setResidenceCountry] = useState('Kenya (KE)');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Readiness Meter */}
      <View style={styles.card}>
        <View style={styles.readinessRow}>
          <Text style={styles.cardTitle}>Profile Readiness</Text>
          <Text style={styles.readinessPercent}>80%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '80%' }]} />
        </View>
        <Text style={styles.subText}>
          Add your remaining legal details to ensure complete identity validation.
        </Text>
      </View>

      {/* Form Fields */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Legal Identity Fields</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Legal Name (as on ID / Passport)</Text>
          <TextInput
            style={styles.input}
            value={legalName}
            onChangeText={setLegalName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Country of Residence</Text>
          <TextInput
            style={styles.input}
            value={residenceCountry}
            onChangeText={setResidenceCountry}
          />
        </View>

        {isSaved && (
          <Text style={styles.savedMessage}>✓ Profile updated successfully</Text>
        )}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  readinessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  readinessPercent: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 4,
  },
  subText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  savedMessage: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
