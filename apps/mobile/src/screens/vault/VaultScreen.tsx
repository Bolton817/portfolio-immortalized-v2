import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { ScannerScreen } from './ScannerScreen';

interface MobileVaultAsset {
  id: string;
  title: string;
  category: string;
  version: number;
  sizeMb: string;
  sha256Prefix: string;
}

const INITIAL_MOBILE_ASSETS: MobileVaultAsset[] = [
  {
    id: 'ast_01',
    title: 'Last Will & Testament 2026.pdf',
    category: 'WILL',
    version: 2,
    sizeMb: '2.4 MB',
    sha256Prefix: '9f86d081884c...',
  },
  {
    id: 'ast_02',
    title: 'Karen Property Title Deed.pdf',
    category: 'DOCUMENT',
    version: 1,
    sizeMb: '4.1 MB',
    sha256Prefix: '4b227777d4dd...',
  },
  {
    id: 'ast_03',
    title: 'Passport & National ID Scans.pdf',
    category: 'IDENTITY',
    version: 1,
    sizeMb: '1.8 MB',
    sha256Prefix: 'ef2d127de37b...',
  },
  {
    id: 'ast_04',
    title: 'Personal Audio Message to Children.m4a',
    category: 'AUDIO',
    version: 1,
    sizeMb: '8.3 MB',
    sha256Prefix: '1a2b3c4d5e6f...',
  },
];

export function VaultScreen() {
  const [assets, setAssets] = useState<MobileVaultAsset[]>(INITIAL_MOBILE_ASSETS);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveScan = (pageCount: number) => {
    const newDoc: MobileVaultAsset = {
      id: `ast_${Date.now()}`,
      title: `Camera Scan (${pageCount} pages).pdf`,
      category: 'DOCUMENT',
      version: 1,
      sizeMb: `${(pageCount * 0.8).toFixed(1)} MB`,
      sha256Prefix: 'c3ab8ff13720...',
    };
    setAssets([newDoc, ...assets]);
    showToast(`Secured ${pageCount}-page scan into vault with AES-256-GCM`);
  };

  const filtered = assets.filter((item) =>
    selectedFilter === 'ALL' ? true : item.category === selectedFilter
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Toast Notification */}
      {toastMessage && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>✓ {toastMessage}</Text>
        </View>
      )}

      {/* Security Status Card */}
      <View style={styles.securityCard}>
        <View style={styles.securityHeader}>
          <Text style={styles.securityBadge}>🔒 AES-256-GCM + AAD</Text>
          <Text style={styles.securitySubtext}>REL-04: Zero Trustee Access</Text>
        </View>
        <Text style={styles.securityTitle}>Encrypted Private Vault</Text>
        <Text style={styles.securityBody}>
          Every document is protected with a unique 256-bit envelope key. Raw files are never exposed.
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={() => setIsScannerOpen(true)}
          style={[styles.actionButton, styles.primaryActionButton]}
        >
          <Text style={styles.primaryActionText}>📷 Multi-Page Scan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => showToast('File picker opened (select PDF/Media)')}
          style={styles.actionButton}
        >
          <Text style={styles.actionText}>📁 Upload Media</Text>
        </TouchableOpacity>
      </View>

      {/* Category Pills */}
      <View style={styles.filterRow}>
        {['ALL', 'WILL', 'DOCUMENT', 'IDENTITY', 'AUDIO'].map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setSelectedFilter(cat)}
            style={[
              styles.filterPill,
              selectedFilter === cat && styles.filterPillActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === cat && styles.filterTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Asset Items List */}
      <View style={styles.list}>
        {filtered.map((item) => (
          <View key={item.id} style={styles.assetCard}>
            <View style={styles.assetHeader}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{item.category}</Text>
              </View>
              <Text style={styles.versionBadge}>v{item.version}</Text>
            </View>

            <Text style={styles.assetTitle}>{item.title}</Text>

            <View style={styles.assetFooter}>
              <Text style={styles.assetMeta}>{item.sizeMb}</Text>
              <Text style={styles.hashBadge}>SHA-256: {item.sha256Prefix}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Scanner Modal */}
      <Modal visible={isScannerOpen} animationType="slide" presentationStyle="fullScreen">
        <ScannerScreen
          onClose={() => setIsScannerOpen(false)}
          onSaveToVault={handleSaveScan}
        />
      </Modal>
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
  securityCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  securityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  securityBadge: {
    backgroundColor: '#064E3B',
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  securitySubtext: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  securityTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  securityBody: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionButton: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  actionText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 13,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  filterPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterPillActive: {
    backgroundColor: '#0F172A',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  list: {
    gap: 12,
  },
  assetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: '700',
  },
  versionBadge: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  assetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  assetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  assetMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  hashBadge: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#94A3B8',
  },
});
