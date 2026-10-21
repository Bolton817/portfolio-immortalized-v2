import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';

export function WillSummaryScreen() {
  const [custodyType, setCustodyType] = useState('SAFE_DEPOSIT_BOX');
  const [institutionName, setInstitutionName] = useState('Standard Chartered Bank Kenya');
  const [boxNumber, setBoxNumber] = useState('Box #402, Chiromo Branch');
  const [advocateName, setAdvocateName] = useState('Hamilton Harrison & Mathews Advocates');
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveCustody = () => {
    setIsSaved(true);
    Alert.alert(
      'Physical Custody Logged',
      'The physical holding repository for your original signed will has been securely recorded.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Will & Physical Custody</Text>
        <Text style={styles.subtitle}>
          Track your statutory will status and register where the signed paper original is physically stored.
        </Text>
      </View>

      {/* Will Status Badge */}
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <Text style={styles.cardTitle}>Statutory Will Status</Text>
          <View style={styles.validBadge}>
            <Text style={styles.validBadgeText}>READY FOR SIGNING</Text>
          </View>
        </View>
        <Text style={styles.statutoryRef}>Governed by Kenya Law of Succession Act (Cap. 160)</Text>
        
        <View style={styles.checklist}>
          <Text style={styles.checkItem}>✓ Testator particulars validated</Text>
          <Text style={styles.checkItem}>✓ Primary Executor nominated (Faith Wanjiku Mutua)</Text>
          <Text style={styles.checkItem}>✓ 2 Independent non-beneficiary witnesses designated</Text>
          <Text style={styles.checkItem}>✓ Section 13 forfeiture conflict check passed</Text>
        </View>
      </View>

      {/* Physical Custody Repository Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Physical Document Custody Register</Text>
        <Text style={styles.subText}>
          Under Kenyan probate law, the original physical paper will must be presented to the High Court. Where is your signed copy kept?
        </Text>

        <Text style={styles.inputLabel}>Custody Type</Text>
        <TextInput
          style={styles.input}
          value={custodyType}
          onChangeText={setCustodyType}
          placeholder="SAFE_DEPOSIT_BOX, ADVOCATE_OFFICE"
        />

        <Text style={styles.inputLabel}>Bank / Institution / Advocate Firm</Text>
        <TextInput
          style={styles.input}
          value={institutionName}
          onChangeText={setInstitutionName}
        />

        <Text style={styles.inputLabel}>Box / Reference Number</Text>
        <TextInput
          style={styles.input}
          value={boxNumber}
          onChangeText={setBoxNumber}
        />

        <Text style={styles.inputLabel}>Holding Advocate Contact</Text>
        <TextInput
          style={styles.input}
          value={advocateName}
          onChangeText={setAdvocateName}
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveCustody}>
          <Text style={styles.saveButtonText}>{isSaved ? 'Custody Registered ✓' : 'Save Physical Custody Details'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  validBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  validBadgeText: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: 'bold',
  },
  statutoryRef: {
    fontSize: 12,
    color: '#0284C7',
    marginBottom: 12,
  },
  checklist: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  checkItem: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 4,
  },
  subText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    backgroundColor: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
