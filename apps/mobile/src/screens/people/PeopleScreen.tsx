import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';

export function PeopleScreen() {
  const [activeTab, setActiveTab] = useState<'trustees' | 'beneficiaries'>('trustees');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Segmented Control */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segmentButton, activeTab === 'trustees' && styles.segmentButtonActive]}
          onPress={() => setActiveTab('trustees')}
        >
          <Text style={[styles.segmentText, activeTab === 'trustees' && styles.segmentTextActive]}>
            Trustees (1)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, activeTab === 'beneficiaries' && styles.segmentButtonActive]}
          onPress={() => setActiveTab('beneficiaries')}
        >
          <Text style={[styles.segmentText, activeTab === 'beneficiaries' && styles.segmentTextActive]}>
            Beneficiaries (1)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quorum Warning */}
      <View style={styles.warningCard}>
        <Text style={styles.warningTitle}>⚠️ Quorum Incomplete (1 of 2)</Text>
        <Text style={styles.warningBody}>
          Appoint a second trustee to satisfy independent dual-verification for future releases.
        </Text>
      </View>

      {/* People List */}
      {activeTab === 'trustees' ? (
        <View style={styles.card}>
          <View style={styles.personHeader}>
            <View>
              <Text style={styles.personName}>Sarah Mwangi</Text>
              <Text style={styles.personRole}>PROFESSIONAL • sarah@example.com</Text>
            </View>
            <View style={styles.activeBadge}>
              <Text style={styles.activeText}>Active</Text>
            </View>
          </View>
          <Text style={styles.footnoteText}>
            Trustees help verify status reports. They cannot view your vault.
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.personHeader}>
            <View>
              <Text style={styles.personName}>Maya Mutua</Text>
              <Text style={styles.personRole}>CHILD • maya@example.com</Text>
            </View>
            <View style={styles.benBadge}>
              <Text style={styles.benText}>Recipient</Text>
            </View>
          </View>
          <Text style={styles.footnoteText}>
            Receives only specifically assigned vault documents and personal messages.
          </Text>
        </View>
      )}

      {/* Action Button */}
      <TouchableOpacity style={styles.actionButton}>
        <Text style={styles.actionButtonText}>
          {activeTab === 'trustees' ? '+ Appoint Another Trustee' : '+ Add Another Beneficiary'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  segmentText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  warningCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  warningBody: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  personHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  personName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  personRole: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
  benBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  benText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  footnoteText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 8,
  },
  actionButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
