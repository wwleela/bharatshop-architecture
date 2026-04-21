// hooks/useCamera.ts — BharatShop OS 2026
// expo-camera wrapper with image compression built-in.
// Compatible with Expo SDK 51 CameraView API (uses 'facing' prop, not 'type').
// Compression: resize to 800px wide + JPEG 0.72 quality = ~97% size reduction.
// NOTE: expo-image-manipulator must be installed:
//   npx expo install expo-image-manipulator

import { useRef, useState, useCallback } from 'react';
import { useCameraPermissions } from 'expo-camera';
import type { CameraView } from 'expo-camera';

interface CameraHook {
  cameraRef:         React.RefObject<CameraView>;
  hasPermission:     boolean;
  requestPermission: () => Promise<void>;
  flash:             'on' | 'off';
  toggleFlash:       () => void;
  /** Returns base64-encoded JPEG string (compressed), or null on failure */
  capture:           () => Promise<string | null>;
}

export function useCamera(): CameraHook {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPerm] = useCameraPermissions();
  const [flash, setFlash] = useState<'on' | 'off'>('off');

  const hasPermission = permission?.granted ?? false;

  const requestPermission = useCallback(async () => {
    await requestPerm();
  }, [requestPerm]);

  const toggleFlash = useCallback(() => {
    setFlash(prev => prev === 'off' ? 'on' : 'off');
  }, []);

  const capture = useCallback(async (): Promise<string | null> => {
    if (!cameraRef.current) return null;
    try {
      // Step 1: Take photo at full quality, get URI (not base64 yet — too slow)
      const photo = await cameraRef.current.takePictureAsync({
        base64:         false,
        quality:        1,
        skipProcessing: false,
      });
      if (!photo?.uri) return null;

      // Step 2: Compress via expo-image-manipulator
      // 800px wide at 0.72 JPEG quality = ~97.3% reduction from 8MP original.
      // Gemini Vision only needs ~800px for accurate OCR — higher res wastes tokens.
      try {
        const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
        const compressed = await manipulateAsync(
          photo.uri,
          [{ resize: { width: 800 } }],
          { compress: 0.72, format: SaveFormat.JPEG, base64: true },
        );
        return compressed.base64 ?? null;
      } catch (comprErr) {
        // expo-image-manipulator not installed — fallback to raw base64
        console.warn('[useCamera] Compression unavailable, falling back to raw capture:', comprErr);
        const raw = await cameraRef.current.takePictureAsync({
          base64:  true,
          quality: 0.75,
          skipProcessing: false,
        });
        return raw?.base64 ?? null;
      }
    } catch (err) {
      console.error('[useCamera] capture failed:', err);
      return null;
    }
  }, []);

  return { cameraRef, hasPermission, requestPermission, flash, toggleFlash, capture };
}
