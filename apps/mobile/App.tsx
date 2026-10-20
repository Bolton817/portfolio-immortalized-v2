import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PeopleScreen } from './src/screens/people/PeopleScreen';
import { ProfileScreen } from './src/screens/settings/ProfileScreen';
import { VaultScreen } from './src/screens/vault/VaultScreen';
import { LegacyScreen } from './src/screens/legacy/LegacyScreen';

type Tab = 'Home' | 'Vault' | 'People' | 'Legacy' | 'Settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Home');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Screen Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Portfolio Immortalized</Text>
        <Text style={styles.headerSubtitle}>Your Story. Protected for Tomorrow.</Text>
      </View>

      {/* Main Content Area */}
      <View style={styles.mainContainer}>
        {activeTab === 'Home' && (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.card}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>✓ Vault Protected</Text>
              </View>
              <Text style={styles.welcomeText}>Good morning, Alex</Text>
              <Text style={styles.bodyText}>
                Your private vault is secure. Inactivity is an escalation signal only; death is never assumed from lack of app use.
              </Text>

              <View style={styles.metricsRow}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricNumber}>12</Text>
                  <Text style={styles.metricLabel}>Secure Items</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricNumber}>3</Text>
                  <Text style={styles.metricLabel}>Trusted People</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricNumber}>2</Text>
                  <Text style={styles.metricLabel}>Setup Tasks</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        )}

        {activeTab === 'Vault' && <VaultScreen />}

        {activeTab === 'People' && <PeopleScreen />}

        {activeTab === 'Legacy' && <LegacyScreen />}

        {activeTab === 'Settings' && <ProfileScreen />}
      </View>

      {/* 5-Tab Navigation Bar (Blueprint Chapter 25) */}
      <View style={styles.tabBar}>
        {(['Home', 'Vault', 'People', 'Legacy', 'Settings'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mainContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '600',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metricBox: {
    alignItems: 'center',
    flex: 1,
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#F1F5F9',
  },
  tabText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
});
