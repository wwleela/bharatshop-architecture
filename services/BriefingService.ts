// services/BriefingService.ts
// Fetches weather from Open-Meteo (free, no API key).
// Cross-references with Festivals.ts to generate demand predictions.
// Falls back to AsyncStorage cache if network fails.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ANNUAL_FESTIVALS, WEATHER_DEMAND,
  getTodaysFestival, getUpcomingFestivals,
} from '@/constants/Festivals';
import { fetchLowStockProducts } from '@/services/SupabaseService';
import { DailyBriefing, WeatherData } from '@/types';
import { Config } from '@/constants/Config';

const CACHE_KEY        = 'briefing_cache';
const CACHE_TTL_MS     = 60 * 60 * 1000; // 1 hour

// ── Weather fetch ────────────────────────────────────────────

async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = `${Config.weather.baseUrl}?latitude=${lat}&longitude=${lon}`
    + `&current=temperature_2m,precipitation&timezone=Asia/Kolkata`;

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 4_000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);

    const json = await res.json();
    const temp  = json?.current?.temperature_2m  ?? 25;
    const precip = json?.current?.precipitation   ?? 0;

    let condition: WeatherData['condition'];
    if (precip > 5)    condition = 'monsoon';
    else if (temp > 35) condition = 'hot';
    else if (temp < 15) condition = 'cold';
    else                condition = 'mild';

    const descriptions: Record<WeatherData['condition'], string> = {
      hot:     `${Math.round(temp)}°C — Hot day`,
      cold:    `${Math.round(temp)}°C — Cool weather`,
      monsoon: `${Math.round(temp)}°C — Raining`,
      mild:    `${Math.round(temp)}°C — Pleasant`,
    };

    return { temperature: temp, precipitation: precip, condition, description: descriptions[condition] };

  } catch {
    clearTimeout(timeout);
    // Fallback weather (Hyderabad annual average)
    return { temperature: 28, precipitation: 0, condition: 'mild', description: '28°C — Weather unavailable' };
  }
}

// ── Main briefing builder ────────────────────────────────────

export async function getDailyBriefing(
  lat = Config.weather.defaultLat,
  lon = Config.weather.defaultLon,
): Promise<DailyBriefing> {

  // Check cache first
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed: DailyBriefing = JSON.parse(cached);
      const age = Date.now() - new Date(parsed.fetchedAt).getTime();
      if (age < CACHE_TTL_MS) return parsed;
    }
  } catch { /* cache miss is fine */ }

  // Fetch weather and low-stock in parallel
  const [weather, lowStockProducts] = await Promise.all([
    fetchWeather(lat, lon),
    fetchLowStockProducts().catch(() => []),
  ]);

  // Festival lookup
  const festivalToday    = getTodaysFestival();
  const upcoming         = getUpcomingFestivals(7);
  const upcomingFestival = upcoming[0] ?? null;

  // Demand signals: union of weather + festival
  const weatherDemand  = WEATHER_DEMAND[weather.condition];
  const festivalBoosts = festivalToday?.demandSignals ?? [];

  const demandBoosts  = [...new Set([...weatherDemand.boost,  ...festivalBoosts])];
  const demandReduces = [...new Set([...weatherDemand.reduce])];

  // Remove items from reduces if they appear in boosts (festival overrides weather)
  const finalReduces = demandReduces.filter(item => !demandBoosts.includes(item));

  // Today's sales total
  let todaySalesTotal = 0;
  try {
    const { fetchTodaySales } = await import('@/services/SupabaseService');
    const sales = await fetchTodaySales();
    todaySalesTotal = sales.reduce((sum, s) => sum + s.total, 0);
  } catch { /* non-critical */ }

  const briefing: DailyBriefing = {
    weather,
    festivalToday,
    upcomingFestival,
    demandBoosts,
    demandReduces: finalReduces,
    lowStockProducts,
    todaySalesTotal,
    fetchedAt: new Date().toISOString(),
  };

  // Cache it
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(briefing));
  } catch { /* cache write failure is fine */ }

  return briefing;
}
