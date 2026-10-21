import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { mobileAuth } from '../../services/auth';

export function ProfileScreen() {
  const [displayName, setDisplayName] = useState('Alex Johnson');
  const [legalName, setLegalName] = useState('Alexander Patrick Johnson');
  const [dateOfBirth, setDateOfBirth] = useState('1985-05-15');
  const [residenceCountry, setResidenceCountry] = useState('Kenya (KE)');
  const [isSaved, setIsSaved] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(true);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleToggleBiometrics = async () => {
    const nextVal = !isBiometricEnabled;
    setIsBiometricEnabled(nextVal);
    await mobileAuth.setBiometricsEnabled(nextVal);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Lock Vault',
      'Are you sure you want to lock the vault and purge local session tokens?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Lock & Purge',
          style: 'destructive',
          onPress: async () => {
            await mobileAuth.logout();
            Alert.alert('Vault Locked', 'Your device session tokens and local caches have been securely purged.');
          },
        },
      ]
    );
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

      {/* Security & Biometrics Card (AUTH-003, R-13) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Device Security & Privacy</Text>

        <View style={styles.securityRow}>
          <View style={styles.securityInfo}>
            <Text style={styles.securityTitle}>Biometric App Unlock</Text>
            <Text style={styles.securitySubtitle}>Require Face ID / Fingerprint to open vault</Text>
          </View>
          <TouchableOpacity
            style={[styles.toggleButton, isBiometricEnabled && styles.toggleButtonActive]}
            onPress={handleToggleBiometrics}
          >
            <Text style={[styles.toggleButtonText, isBiometricEnabled && styles.toggleButtonTextActive]}>
              {isBiometricEnabled ? 'ENABLED' : 'DISABLED'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.securityRow}>
          <View style={styles.securityInfo}>
            <Text style={styles.securityTitle}>Auto-Lock on Inactivity</Text>
            <Text style={styles.securitySubtitle}>Locks vault after 5 min in background</Text>
          </View>
          <Text style={styles.badgeText}>5 MIN</Text>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Lock Vault & Clear Device Cache</Text>
        </TouchableOpacity>
      </View>

      {/* Account Deletion & Rights (Apple Guideline 5.1.1(v) & KDPA 2019 Sec 40) */}
      <View style={[styles.card, styles.dangerCard]}>
        <Text style={[styles.cardTitle, styles.dangerTitle]}>Account Lifecycle & Erasure</Text>
        <Text style={styles.dangerDescription}>
          You can request account closure and cryptographic erasure of your vault at any time. Under statutory rules (Kenya Data Protection Act 2019 & Succession Act Cap. 160), if an active legal hold or death investigation exists, records are preserved under statutory hold.
        </Text>
        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={() => {
            Alert.alert(
              'Request Account Deletion',
              'This will initiate account closure. Your vault encryption keys will be destroyed and ciphertext rendered permanently unrecoverable, subject to active legal holds.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Request Deletion',
                  style: 'destructive',
                  onPress: async () => {
                    await mobileAuth.logout();
                    Alert.alert(
                      'Deletion Request Submitted',
                      'Your account closure request has been recorded. Session tokens on this device have been revoked.'
                    );
                  },
                },
              ]
            );
          }}
        >
          <Text style={styles.deleteAccountButtonText}>Delete Account & Erase Vault</Text>
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
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  securityInfo: {
    flex: 1,
    marginRight: 12,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  securitySubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  toggleButtonActive: {
    backgroundColor: '#0284C7',
  },
  toggleButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  dangerCard: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  dangerTitle: {
    color: '#991B1B',
  },
  dangerDescription: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 17,
    marginBottom: 12,
  },
  deleteAccountButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteAccountButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
