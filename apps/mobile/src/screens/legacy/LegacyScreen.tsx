import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal } from 'react-native';

interface MobileBeneficiaryAllocation {
  id: string;
  name: string;
  relationship: string;
  assignedAssetCount: number;
  assignedAssetTitles: string[];
  personalNote: string;
  delayDays: number;
}

const INITIAL_ALLOCATIONS: MobileBeneficiaryAllocation[] = [
  {
    id: 'ben_01',
    name: 'Jane Doe Johnson',
    relationship: 'Spouse',
    assignedAssetCount: 2,
    assignedAssetTitles: ['Last Will & Testament 2026.pdf', 'Karen Property Title Deed.pdf'],
    personalNote: 'Consult attorney Mwangi for land transfer proceedings.',
    delayDays: 0,
  },
  {
    id: 'ben_02',
    name: 'Timothy Johnson',
    relationship: 'Child',
    assignedAssetCount: 2,
    assignedAssetTitles: ['Passport & National ID Scans.pdf', 'Personal Letter To Family.pdf'],
    personalNote: 'Keep identity documents safe and read the personal letter.',
    delayDays: 14,
  },
];

export function LegacyScreen() {
  const [allocations] = useState<MobileBeneficiaryAllocation[]>(INITIAL_ALLOCATIONS);
  const [selectedForPreview, setSelectedForPreview] = useState<MobileBeneficiaryAllocation | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {toastMessage && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>✓ {toastMessage}</Text>
        </View>
      )}

      {/* Legacy Status Banner */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusBadge}>📜 Legacy Directives Active</Text>
          <Text style={styles.versionBadge}>v1 (Draft)</Text>
        </View>
        <Text style={styles.statusTitle}>Beneficiary Allocation Matrix</Text>
        <Text style={styles.statusBody}>
          Preserved vault assets are partitioned by recipient. Beneficiaries only receive their specific allocated items upon two-person release authorization.
        </Text>
      </View>

      {/* AI Estate Advisor Banner (Stage 6, ADR-009) */}
      <View style={styles.aiAdvisorCard}>
        <Text style={styles.aiAdvisorTitle}>💡 AI Estate Advisor (Cap. 160 Guidance)</Text>
        <Text style={styles.aiAdvisorBody}>
          Testamentary documents require 2 independent trustees to avoid succession probate gridlock. Consider attaching specific execution letters for each allocated title deed.
        </Text>
      </View>

      {/* Recipient Cards */}
      <View style={styles.cardList}>

        {allocations.map((ben) => (
          <View key={ben.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.relBadge}>{ben.relationship.toUpperCase()}</Text>
                <Text style={styles.nameText}>{ben.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedForPreview(ben)}
                style={styles.previewBtn}
              >
                <Text style={styles.previewBtnText}>👁 Preview</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionLabel}>
              Allocated Vault Items ({ben.assignedAssetCount})
            </Text>
            <View style={styles.assetTags}>
              {ben.assignedAssetTitles.map((title, idx) => (
                <View key={idx} style={styles.assetTag}>
                  <Text style={styles.assetTagText}>📄 {title}</Text>
                </View>
              ))}
            </View>

            {ben.personalNote && (
              <View style={styles.noteBox}>
                <Text style={styles.noteLabel}>PERSONAL GUIDANCE</Text>
                <Text style={styles.noteText}>&quot;{ben.personalNote}&quot;</Text>
              </View>
            )}

            <View style={styles.cardFooter}>
              <Text style={styles.timingText}>
                ⏱ {ben.delayDays === 0 ? 'Immediate release' : `Delivered +${ben.delayDays} days after authorization`}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Publish Action Button */}
      <TouchableOpacity
        onPress={() => showToast('Plan committed with Kenya Cap. 160 succession terms')}
        style={styles.publishButton}
      >
        <Text style={styles.publishButtonText}>Commit & Publish Plan (v2)</Text>
      </TouchableOpacity>

      {/* Recipient Preview Modal */}
      {selectedForPreview && (
        <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Simulated Recipient View</Text>
              <TouchableOpacity
                onPress={() => setSelectedForPreview(null)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.previewRecipientInfo}>
                <Text style={styles.previewRecipientName}>{selectedForPreview.name}</Text>
                <Text style={styles.previewRecipientSub}>
                  Release Package • {selectedForPreview.relationship}
                </Text>
              </View>

              {selectedForPreview.personalNote && (
                <View style={styles.previewMessageBox}>
                  <Text style={styles.previewMessageTitle}>Personal Message From Owner</Text>
                  <Text style={styles.previewMessageBody}>
                    &quot;{selectedForPreview.personalNote}&quot;
                  </Text>
                </View>
              )}

              <Text style={styles.previewSectionTitle}>
                Decrypted Vault Documents ({selectedForPreview.assignedAssetTitles.length})
              </Text>

              {selectedForPreview.assignedAssetTitles.map((title, idx) => (
                <View key={idx} style={styles.previewDocItem}>
                  <Text style={styles.previewDocTitle}>✓ {title}</Text>
                  <Text style={styles.previewDocStatus}>Decryption Ready</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#F8FAFC',
  },
  toast: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  toastText: {
    color: '#065F46',
    fontWeight: '600',
    fontSize: 13,
  },
  statusCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    color: '#34D399',
    fontWeight: '700',
    fontSize: 12,
  },
  versionBadge: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  statusBody: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
  aiAdvisorCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  aiAdvisorTitle: {
    color: '#6D28D9',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  aiAdvisorBody: {
    color: '#4C1D95',
    fontSize: 12,
    lineHeight: 17,
  },
  cardList: {
    gap: 14,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  relBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  previewBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  previewBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  assetTags: {
    gap: 6,
    marginBottom: 12,
  },
  assetTag: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  assetTagText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  noteBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
    marginBottom: 12,
  },
  noteLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  noteText: {
    fontSize: 12,
    color: '#334155',
    fontStyle: 'italic',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 8,
  },
  timingText: {
    fontSize: 11,
    color: '#64748B',
  },
  publishButton: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 14,
  },
  modalContent: {
    padding: 20,
  },
  previewRecipientInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewRecipientName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  previewRecipientSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  previewMessageBox: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  previewMessageTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  previewMessageBody: {
    fontSize: 13,
    color: '#064E3B',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  previewSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  previewDocItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewDocTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  previewDocStatus: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
});
