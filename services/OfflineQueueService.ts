/**
 * BharatShop OS — OfflineQueueService.ts
 *
 * Failure mode → Strength:
 * The "Offline Paradox" — Indian telecom is patchy.
 * Solution: Async "Outbox" pattern. User snaps bill, gets instant
 * "Saved to Tray ✓" feedback. App silently syncs when network returns.
 * Gemini is called only when online. Zero-Entry promise kept.
 *
 * UX flow:
 *   1. User snaps bill (online or offline)
 *   2. Image saved locally → "Saved to Tray" animation shown
 *   3. Background poller detects connectivity
 *   4. Queued images sent to Gemini
 *   5. Local push notification: "3 Bills Processed. Inventory Updated."
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
// import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { scanBillBase64, recompressBase64 } from './GeminiService';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

const QUEUE_KEY = 'bharatshop_bill_queue';
const POLL_INTERVAL = 30_000; // check every 30s

// ── Types ────────────────────────────────────────────────────────────────────
export interface QueuedBill {
  id: string;
  base64: string;
  capturedAt: string;     // ISO timestamp
  status: 'pending' | 'processing' | 'done' | 'failed';
  retries: number;
  result?: any;
  error?: string;
}

export type QueueStatus = {
  pending: number;
  processing: number;
  done: number;
  failed: number;
  total: number;
};

// ── Notification setup ────────────────────────────────────────────────────────
/*
if (!IS_EXPO_GO) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
*/

async function requestNotificationPermission() {
  return false;
  /*
  if (IS_EXPO_GO) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
  */
}

async function sendLocalNotification(title: string, body: string) {
  console.log(`[OfflineQueue] Notification (disabled): ${title} - ${body}`);
  /*
  if (IS_EXPO_GO) {
    console.log(`[OfflineQueue] Notification (Expo Go - skipped): ${title} - ${body}`);
    return;
  }
  const granted = await requestNotificationPermission();
  if (!granted) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: false },
    trigger: null, // immediate
  });
  */
}

// ── Queue helpers ─────────────────────────────────────────────────────────────
async function loadQueue(): Promise<QueuedBill[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedBill[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// ── PUBLIC: Add bill to queue ─────────────────────────────────────────────────
// Call this immediately after capture — works offline or online.
// Returns instantly so the UI can show "Saved to Tray ✓" without waiting.
export async function enqueueBill(base64: string): Promise<string> {
  const id = `bill_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const bill: QueuedBill = {
    id,
    base64,
    capturedAt: new Date().toISOString(),
    status: 'pending',
    retries: 0,
  };

  const queue = await loadQueue();
  queue.push(bill);
  await saveQueue(queue);

  return id;
}

// ── PUBLIC: Get queue status ──────────────────────────────────────────────────
export async function getQueueStatus(): Promise<QueueStatus> {
  const queue = await loadQueue();
  return {
    pending: queue.filter(b => b.status === 'pending').length,
    processing: queue.filter(b => b.status === 'processing').length,
    done: queue.filter(b => b.status === 'done').length,
    failed: queue.filter(b => b.status === 'failed').length,
    total: queue.length,
  };
}

// ── PUBLIC: Get all queue items ───────────────────────────────────────────────
export async function getQueue(): Promise<QueuedBill[]> {
  return loadQueue();
}

// ── PUBLIC: Clear completed items ────────────────────────────────────────────
export async function clearDoneItems(): Promise<void> {
  const queue = await loadQueue();
  await saveQueue(queue.filter(b => b.status !== 'done'));
}
// ── CORE: Process one pending bill ────────────────────────────────────────────
async function processOneBill(bill: QueuedBill): Promise<QueuedBill> {
  if (bill.status !== 'pending' || bill.retries >= 5) return bill; // increased limit to allow low-bandwidth retries

  let currentBase64 = bill.base64;

  // LOW BANDWIDTH MODE: If already failed 3 times, shrink the image aggressively
  if (bill.retries >= 3) {
    console.log(`[OfflineQueue] Low bandwidth mode active for bill ${bill.id}`);
    currentBase64 = await recompressBase64(bill.base64, 0.3);
  }

  try {
    const result = await scanBillBase64(currentBase64);

    if (result.success) {
      return { ...bill, status: 'done', result, error: undefined };
    } else {
      // Gemini returned error — retry up to 5 times (3 normal + 2 aggressive)
      const retries = bill.retries + 1;

      if (retries === 3) {
        await sendLocalNotification(
          'Slow Connection Detected',
          'Switching to low-bandwidth mode for pending bills. You can also type items manually.'
        );
      }

      return {
        ...bill,
        retries,
        status: retries >= 5 ? 'failed' : 'pending',
        error: result.error,
      };
    }
  } catch (err: any) {
    const retries = bill.retries + 1;
    return {
      ...bill,
      retries,
      status: retries >= 5 ? 'failed' : 'pending',
      error: err.message,
    };
  }
}


// ── CORE: Flush the queue ─────────────────────────────────────────────────────
// Called when connectivity is detected.
async function flushQueue(onItemProcessed?: (bill: QueuedBill) => void): Promise<number> {
  let queue = await loadQueue();
  const pending = queue.filter(b => b.status === 'pending');
  if (pending.length === 0) return 0;

  let processedCount = 0;

  for (const bill of pending) {
    // Mark as processing
    queue = queue.map(b => b.id === bill.id ? { ...b, status: 'processing' as const } : b);
    await saveQueue(queue);

    const updated = await processOneBill(bill);
    queue = queue.map(b => b.id === updated.id ? updated : b);
    await saveQueue(queue);

    if (updated.status === 'done') {
      processedCount++;
      onItemProcessed?.(updated);
    }
  }

  // Send notification for batch
  if (processedCount > 0) {
    const failed = queue.filter(b => b.status === 'failed').length;
    await sendLocalNotification(
      'BharatShop OS',
      failed > 0
        ? `${processedCount} bill${processedCount !== 1 ? 's' : ''} processed. ${failed} failed — tap to review.`
        : `${processedCount} bill${processedCount !== 1 ? 's' : ''} processed. Inventory updated. ✓`
    );
  }

  return processedCount;
}

// ── BACKGROUND POLLER ─────────────────────────────────────────────────────────
// Start this in your App.tsx or root layout.
// It watches for connectivity and flushes the queue automatically.
let pollerActive = false;

export function startBackgroundPoller(
  onBillProcessed?: (bill: QueuedBill) => void
): () => void {
  if (pollerActive) return () => {};
  pollerActive = true;

  // Subscribe to connectivity changes — flush immediately when online
  const unsubscribe = NetInfo.addEventListener(async state => {
    if (state.isConnected && state.isInternetReachable) {
      const status = await getQueueStatus();
      if (status.pending > 0) {
        await flushQueue(onBillProcessed);
      }
    }
  });

  // Also poll on interval as fallback
  const interval = setInterval(async () => {
    const netState = await NetInfo.fetch();
    if (netState.isConnected && netState.isInternetReachable) {
      const status = await getQueueStatus();
      if (status.pending > 0) {
        await flushQueue(onBillProcessed);
      }
    }
  }, POLL_INTERVAL);

  // Return cleanup function
  return () => {
    pollerActive = false;
    unsubscribe();
    clearInterval(interval);
  };
}
