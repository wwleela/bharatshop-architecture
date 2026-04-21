// hooks/useDailyBriefing.ts — BharatShop OS 2026
// Fetches the daily briefing on mount and auto-refreshes every hour.
// Backed by AsyncStorage cache in BriefingService — works offline.

import { useState, useEffect, useCallback } from 'react';
import { getDailyBriefing } from '@/services/BriefingService';
import { DailyBriefing } from '@/types';

const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

interface UseDailyBriefingResult {
  briefing: DailyBriefing | null;
  loading:  boolean;
  error:    string | null;
  refresh:  () => Promise<void>;
}

export function useDailyBriefing(): UseDailyBriefingResult {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDailyBriefing();
      setBriefing(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    // Auto-refresh every hour
    const timer = setInterval(load, REFRESH_INTERVAL_MS);

    // Cleanup timer on unmount
    return () => clearInterval(timer);
  }, [load]);

  return { briefing, loading, error, refresh: load };
}
