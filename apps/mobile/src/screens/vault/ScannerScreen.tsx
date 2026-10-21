import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { offlineQueue } from '../../services/offlineQueue';

export interface ScannedPage {
  id: string;
  pageNumber: number;
  rotationDegrees: number;
  filterMode: 'ORIGINAL' | 'HIGH_CONTRAST' | 'CLEAN_BW';
}

interface ScannerScreenProps {
  onClose: () => void;
  onSaveToVault: (pageCount: number) => void;
}

export function ScannerScreen({ onClose, onSaveToVault }: ScannerScreenProps) {
  const [pages, setPages] = useState<ScannedPage[]>([
    { id: 'p1', pageNumber: 1, rotationDegrees: 0, filterMode: 'CLEAN_BW' },
    { id: 'p2', pageNumber: 2, rotationDegrees: 0, filterMode: 'CLEAN_BW' },
  ]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRotateCurrentPage = () => {
    setPages((prev) =>
      prev.map((page, idx) =>
        idx === activePageIndex
          ? { ...page, rotationDegrees: (page.rotationDegrees + 90) % 360 }
          : page
      )
    );
  };

  const handleToggleFilter = () => {
    const filters: ScannedPage['filterMode'][] = ['ORIGINAL', 'HIGH_CONTRAST', 'CLEAN_BW'];
    setPages((prev) =>
      prev.map((page, idx) => {
        if (idx === activePageIndex) {
          const nextIndex = (filters.indexOf(page.filterMode) + 1) % filters.length;
          return { ...page, filterMode: filters[nextIndex] ?? 'CLEAN_BW' };
        }
        return page;
      })
    );
  };

  const handleMovePage = (direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? activePageIndex - 1 : activePageIndex + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    setPages((prev) => {
      const copy = [...prev];
      const temp = copy[activePageIndex];
      const target = copy[targetIndex];
      if (temp && target) {
        copy[activePageIndex] = target;
        copy[targetIndex] = temp;
      }
      return copy.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    });
    setActivePageIndex(targetIndex);
  };

  const handleCaptureNextPage = () => {
    const nextNum = pages.length + 1;
    setPages((prev) => [
      ...prev,
      {
        id: `p${nextNum}_${Date.now()}`,
        pageNumber: nextNum,
        rotationDegrees: 0,
        filterMode: 'CLEAN_BW',
      },
    ]);
    setActivePageIndex(pages.length);
  };

  const handleDeleteCurrentPage = () => {
    if (pages.length <= 1) {
      Alert.alert('Cannot Delete', 'A document must contain at least one scanned page.');
      return;
    }
    setPages((prev) => {
      const filtered = prev.filter((_, idx) => idx !== activePageIndex);
      return filtered.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    });
    setActivePageIndex((prev) => Math.max(0, prev - 1));
  };

  const handleSave = () => {
    setIsProcessing(true);
    // Queue offline upload intent if network is unavailable or commit immediately
    offlineQueue.enqueue('SAVE_SCAN_INTENT', {
      pageCount: pages.length,
      category: 'WILL',
      title: `Scanned Document (${pages.length} Pages)`,
      scannedAt: new Date().toISOString(),
    });

    setTimeout(() => {
      setIsProcessing(false);
      onSaveToVault(pages.length);
      onClose();
    }, 1000);
  };

  const currentPage = pages[activePageIndex] || pages[0] || {
    id: 'p1',
    pageNumber: 1,
    rotationDegrees: 0,
    filterMode: 'CLEAN_BW' as const,
  };

  return (
    <View style={styles.container}>
      {/* Scanner Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Document Scanner ({activePageIndex + 1} of {pages.length})
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isProcessing}
          style={[styles.headerButton, styles.saveButton]}
        >
          <Text style={styles.saveButtonText}>{isProcessing ? 'Encrypting...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      {/* Camera / Document Viewport */}
      <View style={styles.viewportContainer}>
        <View
          style={[
            styles.documentPreview,
            { transform: [{ rotate: `${currentPage.rotationDegrees}deg` }] },
            currentPage.filterMode === 'HIGH_CONTRAST' && styles.filterHighContrast,
            currentPage.filterMode === 'CLEAN_BW' && styles.filterCleanBw,
          ]}
        >
          <View style={styles.scanCornerTL} />
          <View style={styles.scanCornerTR} />
          <View style={styles.scanCornerBL} />
          <View style={styles.scanCornerBR} />
          <Text style={styles.pageWatermark}>Page {currentPage.pageNumber}</Text>
          <Text style={styles.documentSimText}>
            CONFIDENTIAL WILL & TESTAMENT{'\n'}
            Perspective Flattened & Cropped{'\n'}
            Rotation: {currentPage.rotationDegrees}° • Filter: {currentPage.filterMode}
          </Text>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>✨ AI Quality: 95% Sharp • High Legibility</Text>
          </View>
        </View>
      </View>

      {/* Page Reordering & Filter Controls */}
      <View style={styles.subControlsRow}>
        <TouchableOpacity
          onPress={() => handleMovePage('UP')}
          disabled={activePageIndex === 0}
          style={[styles.subButton, activePageIndex === 0 && styles.disabledButton]}
        >
          <Text style={styles.subButtonText}>◀ Move Up</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleToggleFilter} style={styles.subButton}>
          <Text style={styles.subButtonText}>🎨 {currentPage.filterMode}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleMovePage('DOWN')}
          disabled={activePageIndex === pages.length - 1}
          style={[styles.subButton, activePageIndex === pages.length - 1 && styles.disabledButton]}
        >
          <Text style={styles.subButtonText}>Move Down ▶</Text>
        </TouchableOpacity>
      </View>

      {/* Main Action Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity onPress={handleRotateCurrentPage} style={styles.toolButton}>
          <Text style={styles.toolButtonText}>⟳ Rotate 90°</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCaptureNextPage} style={styles.captureButton}>
          <View style={styles.captureInnerCircle} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDeleteCurrentPage} style={styles.toolButton}>
          <Text style={[styles.toolButtonText, styles.deleteText]}>✕ Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Page Thumbnails Tray */}
      <View style={styles.trayContainer}>
        <Text style={styles.trayLabel}>Document Pages ({pages.length})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trayScroll}>
          {pages.map((p, idx) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => setActivePageIndex(idx)}
              style={[
                styles.thumbnail,
                activePageIndex === idx && styles.thumbnailActive,
              ]}
            >
              <Text style={styles.thumbnailText}>P.{p.pageNumber}</Text>
              {p.rotationDegrees > 0 && (
                <Text style={styles.thumbRotateText}>{p.rotationDegrees}°</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  headerButton: {
    padding: 6,
  },
  headerButtonText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  viewportContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  documentPreview: {
    width: '90%',
    height: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  filterHighContrast: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  filterCleanBw: {
    backgroundColor: '#FFFFFF',
  },
  scanCornerTL: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#0284C7',
  },
  scanCornerTR: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#0284C7',
  },
  scanCornerBL: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#0284C7',
  },
  scanCornerBR: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#0284C7',
  },
  pageWatermark: {
    fontSize: 48,
    fontWeight: '800',
    color: '#F1F5F9',
    position: 'absolute',
  },
  documentSimText: {
    fontSize: 13,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  aiBadge: {
    position: 'absolute',
    bottom: 16,
    backgroundColor: '#0F172AEE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  aiBadgeText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  subControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#1E293B',
  },
  subButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#334155',
    borderRadius: 6,
  },
  subButtonText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.3,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: '#0F172A',
  },
  toolButton: {
    padding: 10,
  },
  toolButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteText: {
    color: '#EF4444',
  },
  captureButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInnerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  trayContainer: {
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  trayLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  trayScroll: {
    gap: 10,
  },
  thumbnail: {
    width: 50,
    height: 65,
    backgroundColor: '#334155',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#475569',
  },
  thumbnailText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  thumbRotateText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
});
