// constants/Festivals.ts — BharatShop OS 2026
// Hardcoded Indian festival calendar + weather-based demand signals.
// No external API needed — this data changes once a year at most.
// Dates are MM-DD (approximate — many festivals follow lunar calendar).

import { FestivalEntry } from '@/types';

// ── Festival catalogue (14 entries) ─────────────────────────

export const ANNUAL_FESTIVALS: FestivalEntry[] = [
  {
    name:          'Makar Sankranti',
    nameHi:        'मकर संक्रांति',
    date:          '01-14',
    type:          'major',
    demandSignals: ['til', 'jaggery', 'peanuts', 'sweets', 'chikki'],
    stockAlert:    'Stock up til-gul, jaggery, peanut chikki',
    notes:         'Kite-flying festival. Sesame + jaggery sweets are essential.',
  },
  {
    name:          'Republic Day',
    nameHi:        'गणतंत्र दिवस',
    date:          '01-26',
    type:          'national',
    demandSignals: ['snacks', 'soft_drinks', 'namkeen'],
    stockAlert:    'Higher foot traffic — stock general snacks',
  },
  {
    name:          'Holi',
    nameHi:        'होली',
    date:          '03-25',   // varies — approximate
    type:          'major',
    demandSignals: ['cold_drinks', 'thandai', 'sweets', 'snacks', 'beverages', 'dairy'],
    stockAlert:    'Biggest snack + beverage spike of Q1',
    notes:         'Festival of colours. Gujiya, thandai, cold drinks surge.',
  },
  {
    name:          'Baisakhi',
    nameHi:        'बैसाखी',
    date:          '04-14',
    type:          'regional',
    demandSignals: ['sweets', 'dairy', 'namkeen', 'beverages'],
    stockAlert:    'Harvest festival — dairy and sweets in demand',
  },
  {
    name:          'Independence Day',
    nameHi:        'स्वतंत्रता दिवस',
    date:          '08-15',
    type:          'national',
    demandSignals: ['snacks', 'soft_drinks', 'namkeen', 'beverages'],
    stockAlert:    'Public holiday — family snacking time',
  },
  {
    name:          'Raksha Bandhan',
    nameHi:        'रक्षाबंधन',
    date:          '08-19',   // varies
    type:          'major',
    demandSignals: ['sweets', 'chocolates', 'dry_fruits', 'gift_items'],
    stockAlert:    'Sweets + gift boxes sell out fast',
    notes:         'Sister-brother festival. Mithai boxes are key SKU.',
  },
  {
    name:          'Janmashtami',
    nameHi:        'जन्माष्टमी',
    date:          '08-26',   // varies
    type:          'major',
    demandSignals: ['dairy', 'milk', 'dahi', 'peda', 'makhan'],
    stockAlert:    'Dairy spike — milk, curd, butter, pedas',
    notes:         'Krishna birthday. Dairy products essential.',
  },
  {
    name:          'Gandhi Jayanti',
    nameHi:        'गांधी जयंती',
    date:          '10-02',
    type:          'national',
    demandSignals: ['staples', 'snacks'],
    stockAlert:    'Public holiday — steady staples demand',
  },
  {
    name:          'Navratri',
    nameHi:        'नवरात्रि',
    date:          '10-03',   // varies
    type:          'major',
    demandSignals: ['sabudana', 'singhara', 'kuttu', 'dairy', 'fruits'],
    stockAlert:    'Fasting staples: sabudana, singhara atta, kuttu',
    notes:         '9-day festival. Fasting food categories spike significantly.',
  },
  {
    name:          'Dussehra',
    nameHi:        'दशहरा',
    date:          '10-12',   // varies
    type:          'major',
    demandSignals: ['sweets', 'snacks', 'beverages', 'namkeen'],
    stockAlert:    'Post-Navratri — general sweet + snack surge',
  },
  {
    name:          'Diwali',
    nameHi:        'दीवाली',
    date:          '11-01',   // varies — approximate
    type:          'major',
    demandSignals: ['sweets', 'dry_fruits', 'gift_items', 'beverages', 'chocolates', 'namkeen', 'pooja'],
    stockAlert:    'Biggest shopping event — all categories surge 3-5x',
    notes:         'Festival of lights. Single highest-volume week of the year.',
  },
  {
    name:          'Bhai Dooj',
    nameHi:        'भाई दूज',
    date:          '11-03',   // 2 days after Diwali
    type:          'major',
    demandSignals: ['sweets', 'dry_fruits', 'gifts'],
    stockAlert:    'Continue Diwali stock — sweets still moving',
  },
  {
    name:          'Christmas',
    nameHi:        'क्रिसमस',
    date:          '12-25',
    type:          'national',
    demandSignals: ['cakes', 'beverages', 'snacks', 'chocolates', 'dairy'],
    stockAlert:    'Cake and bakery items in high demand',
  },
  {
    name:          "New Year's Eve",
    nameHi:        'नया साल',
    date:          '12-31',
    type:          'national',
    demandSignals: ['beverages', 'snacks', 'namkeen', 'soft_drinks', 'juices'],
    stockAlert:    'Party snacks and drinks — evening peak',
    notes:         'Urban Kirana sees evening rush for party supplies.',
  },
];

// ── Weather demand matrix ────────────────────────────────────

export const WEATHER_DEMAND: Record<
  'hot' | 'cold' | 'monsoon' | 'mild',
  { boost: string[]; reduce: string[] }
> = {
  hot: {
    boost:  ['cold_drinks', 'ice_cream', 'nimbu_pani', 'ors_sachets', 'buttermilk', 'beverages'],
    reduce: ['hot_beverages', 'soup', 'jaggery'],
  },
  cold: {
    boost:  ['chai', 'coffee', 'soup', 'jaggery', 'hot_beverages', 'namkeen'],
    reduce: ['cold_drinks', 'ice_cream'],
  },
  monsoon: {
    boost:  ['chai', 'biscuits', 'maggi', 'snacks', 'namkeen', 'umbrella'],
    reduce: ['cold_drinks', 'ice_cream'],
  },
  mild: {
    boost:  ['beverages', 'snacks'],
    reduce: [],
  },
};

// ── Helper: today's festival ─────────────────────────────────

export function getTodaysFestival(): FestivalEntry | null {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const key = `${mm}-${dd}`;

  return ANNUAL_FESTIVALS.find(f => f.date === key) ?? null;
}

// ── Helper: upcoming festivals in next N days ────────────────

export function getUpcomingFestivals(withinDays = 7): FestivalEntry[] {
  const now  = new Date();
  const year = now.getFullYear();

  return ANNUAL_FESTIVALS.filter(f => {
    const parts = f.date.split('-');
    const [m, d]  = parts.map(Number);
    if (m === undefined || d === undefined) return false;
    const fDate   = new Date(year, m - 1, d);
    const diffMs  = fDate.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    // Include if within window and in the future (not today — that's getTodaysFestival)
    return diffDays > 0 && diffDays <= withinDays;
  }).sort((a, b) => {
    const [am, ad] = a.date.split('-').map(Number);
    const [bm, bd] = b.date.split('-').map(Number);
    if (am === undefined || ad === undefined || bm === undefined || bd === undefined) return 0;
    return new Date(year, am - 1, ad).getTime() - new Date(year, bm - 1, bd).getTime();
  });
}
