import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';

export function SubscriptionScreen() {
  const [phoneNumber, setPhoneNumber] = useState('0712345678');
  const [selectedTier, setSelectedTier] = useState<'HERITAGE' | 'DYNASTY'>('HERITAGE');
  const [loading, setLoading] = useState(false);

  const handleMpesaPay = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid Safaricom mobile number.');
      return;
    }

    setLoading(true);
    try {
      const amount = selectedTier === 'HERITAGE' ? 'KES 4,999' : 'KES 19,999';
      Alert.alert(
        'M-Pesa STK Push Initiated',
        `An STK push for ${amount} has been dispatched to ${phoneNumber}. Please enter your M-Pesa PIN on your phone to activate ${selectedTier} tier.`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vault Subscription & Quotas</Text>
        <Text style={styles.subtitle}>
          Expand your encrypted storage, add more trustees, and unlock the interactive statutory will builder.
        </Text>
      </View>

      {/* Current Tier Badge */}
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <Text style={styles.cardTitle}>Current Plan</Text>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>STARTER (FREE)</Text>
          </View>
        </View>
        <Text style={styles.quotaText}>1 GB Encrypted Vault • 2 Trustees Max</Text>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: '15%' }]} />
        </View>
        <Text style={styles.progressLabel}>150 MB of 1 GB used</Text>
      </View>

      {/* Tier Selection */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upgrade Your Estate Protection</Text>
      </View>

      <TouchableOpacity
        style={[styles.tierCard, selectedTier === 'HERITAGE' && styles.selectedTierCard]}
        onPress={() => setSelectedTier('HERITAGE')}
      >
        <View style={styles.tierHeader}>
          <Text style={styles.tierName}>Heritage Plan (Family Estate)</Text>
          <Text style={styles.tierPrice}>KES 4,999 / yr</Text>
        </View>
        <Text style={styles.tierDesc}>
          • 25 GB Encrypted Vault Storage{'\n'}
          • 5 Verified Trustees & Unlimited Beneficiaries{'\n'}
          • Audio & Video Legacy Memos{'\n'}
          • Interactive Statutory Will Builder (Cap. 160)
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tierCard, selectedTier === 'DYNASTY' && styles.selectedTierCard]}
        onPress={() => setSelectedTier('DYNASTY')}
      >
        <View style={styles.tierHeader}>
          <Text style={styles.tierName}>Dynasty Plan (Generational)</Text>
          <Text style={styles.tierPrice}>KES 19,999 / lifetime</Text>
        </View>
        <Text style={styles.tierDesc}>
          • 100 GB Encrypted Vault Storage{'\n'}
          • Unlimited Trustees & Beneficiaries{'\n'}
          • Concierge Legal & Advocate Onboarding Support{'\n'}
          • Physical Will Custody Registry
        </Text>
      </TouchableOpacity>

      {/* M-Pesa Phone Input & Action */}
      <View style={styles.card}>
        <Text style={styles.inputLabel}>Safaricom M-Pesa Mobile Number</Text>
        <TextInput
          style={styles.input}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          placeholder="07XXXXXXXX"
        />
        <TouchableOpacity
          style={styles.payButton}
          onPress={handleMpesaPay}
          disabled={loading}
        >
          <Text style={styles.payButtonText}>
            {loading ? 'Processing...' : `Pay with M-Pesa (${selectedTier === 'HERITAGE' ? 'KES 4,999' : 'KES 19,999'})`}
          </Text>
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
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: 'bold',
  },
  quotaText: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 8,
  },
  progressBg: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0F172A',
  },
  progressLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  tierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  selectedTierCard: {
    borderColor: '#0F172A',
    borderWidth: 2,
    backgroundColor: '#F8FAFC',
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tierName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  tierPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
  },
  tierDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  payButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
