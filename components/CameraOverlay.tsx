// components/scanner/CameraOverlay.tsx — BharatShop OS 2026
// ─────────────────────────────────────────────────────────────────────────────
// FIX: CameraView does not support children — renders warning and may crash.
// Pattern: render CameraView and overlay content as siblings inside a parent
// View, using absolute positioning on the overlay.
//
// BEFORE (broken):
//   <CameraView style={...}>
//     <View>  ← warning: CameraView does not support children
//       <Text>Scan your bill</Text>
//     </View>
//   </CameraView>
//
// AFTER (correct):
//   <View style={{ flex: 1 }}>
//     <CameraView style={StyleSheet.absoluteFill} ... />
//     <CameraOverlay ... />   ← sibling, absolutely positioned
//   </View>
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

interface CameraOverlayProps {
  isScanning:   boolean;
  onCapture:    () => void;
  onManualEntry: () => void;
  onClose:      () => void;
}

export function CameraOverlay({
  isScanning,
  onCapture,
  onManualEntry,
  onClose,
}: CameraOverlayProps) {
  return (
    // This View sits as an ABSOLUTE SIBLING next to <CameraView />, not inside it.
    // Parent must be: <View style={{ flex: 1, position: 'relative' }}>
    <View className="absolute inset-0">

      {/* Top bar */}
      <View className="flex-row justify-between items-center px-4 pt-12 pb-4 bg-black/50">
        <TouchableOpacity onPress={onClose} className="p-2">
          <Text className="text-white text-base font-semibold">✕ Close</Text>
        </TouchableOpacity>
        <Text className="text-white text-base font-semibold">Scan Bill</Text>
        <TouchableOpacity onPress={onManualEntry} className="p-2">
          <Text className="text-amber text-base font-semibold">Manual</Text>
        </TouchableOpacity>
      </View>

      {/* Centre viewfinder cutout hint */}
      <View className="flex-1 items-center justify-center">
        <View className="w-72 h-48 border-2 border-amber rounded-xl" />
        <Text className="text-white/80 text-sm mt-3 text-center px-8">
          Point at your supplier bill
        </Text>
      </View>

      {/* Bottom capture button */}
      <View className="items-center pb-12 bg-black/50 pt-6">
        {isScanning ? (
          <View className="items-center gap-2">
            <ActivityIndicator color="#FFBF00" size="large" />
            <Text className="text-amber text-sm font-medium">Reading bill…</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={onCapture}
            className="w-18 h-18 rounded-full bg-amber items-center justify-center"
            activeOpacity={0.8}
          >
            <View className="w-14 h-14 rounded-full border-2 border-black/30 items-center justify-center">
              <Text className="text-2xl">📸</Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onManualEntry} className="mt-4 px-6 py-2">
          <Text className="text-white/70 text-sm">
            Can't scan? Enter manually →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Usage in your scanner screen:
//
// import { CameraView } from 'expo-camera';
// import { CameraOverlay } from '@/components/scanner/CameraOverlay';
//
// return (
//   <View style={{ flex: 1 }}>
//     <CameraView
//       style={StyleSheet.absoluteFill}
//       facing="back"
//       ref={cameraRef}
//     />
//     <CameraOverlay
//       isScanning={isScanning}
//       onCapture={handleCapture}
//       onManualEntry={handleManualEntry}
//       onClose={router.back}
//     />
//   </View>
// );
// ─────────────────────────────────────────────────────────────────────────────
