import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';

interface ScannedPage {
  pageNumber: number;
  rotationDegrees: number;
}

interface ScannerScreenProps {
  onClose: () => void;
  onSaveToVault: (pageCount: number) => void;
}

export function ScannerScreen({ onClose, onSaveToVault }: ScannerScreenProps) {
  const [pages, setPages] = useState<ScannedPage[]>([
    { pageNumber: 1, rotationDegrees: 0 },
    { pageNumber: 2, rotationDegrees: 0 },
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

  const handleCaptureNextPage = () => {
    setPages((prev) => [
      ...prev,
      { pageNumber: prev.length + 1, rotationDegrees: 0 },
    ]);
    setActivePageIndex(pages.length);
  };

  const handleSave = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onSaveToVault(pages.length);
      onClose();
    }, 1200);
  };

  const currentPage = pages[activePageIndex] || pages[0];

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
            Rotation: {currentPage.rotationDegrees}°
          </Text>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>✨ AI Quality: 94% Sharp • Legible</Text>
          </View>
        </View>
      </View>


      {/* Action Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity onPress={handleRotateCurrentPage} style={styles.toolButton}>
          <Text style={styles.toolButtonText}>⟳ Rotate 90°</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCaptureNextPage} style={styles.captureButton}>
          <View style={styles.captureInnerCircle} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (pages.length > 1) {
              setPages((prev) => prev.filter((_, idx) => idx !== activePageIndex));
              setActivePageIndex((prev) => Math.max(0, prev - 1));
            }
          }}
          style={styles.toolButton}
        >
          <Text style={[styles.toolButtonText, styles.deleteText]}>✕ Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Page Thumbnails Tray */}
      <View style={styles.trayContainer}>
        <Text style={styles.trayLabel}>Document Pages ({pages.length})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trayScroll}>
          {pages.map((p, idx) => (
            <TouchableOpacity
              key={p.pageNumber}
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
  scanCornerTL: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#059669',
  },
  scanCornerTR: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#059669',
  },
  scanCornerBL: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#059669',
  },
  scanCornerBR: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#059669',
  },
  pageWatermark: {
    position: 'absolute',
    top: 20,
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  documentSimText: {
    fontSize: 13,
    textAlign: 'center',
    color: '#334155',
    lineHeight: 20,
    fontWeight: '500',
  },
  aiBadge: {
    position: 'absolute',
    bottom: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiBadgeText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  toolButton: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  toolButtonText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteText: {
    color: '#EF4444',
  },
  captureButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInnerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#059669',
  },
  trayContainer: {
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  trayLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trayScroll: {
    flexDirection: 'row',
    gap: 10,
  },
  thumbnail: {
    width: 50,
    height: 65,
    backgroundColor: '#334155',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  thumbnailActive: {
    borderColor: '#059669',
    borderWidth: 2,
    backgroundColor: '#0F172A',
  },
  thumbnailText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  thumbRotateText: {
    color: '#34D399',
    fontSize: 9,
    marginTop: 2,
  },
});
