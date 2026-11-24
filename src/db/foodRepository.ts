import Fuse from 'fuse.js';
import { normalizeTurkish } from '../lib/turkishNormalize';
import type { AppDatabase } from './database';
import type { Food, Nutrients } from './schema';

interface SearchIndexCacheEntry {
  count: number;
  all: Food[];
  fuse: Fuse<Food>;
}

// Rebuilding a Fuse index from a full table scan on every keystroke is the slowest
// path in the app once the bulk dataset is loaded (tens of thousands of rows). Cache
// the index (and the underlying row list) per database and only rebuild when the row
// count changes — cheap via Dexie's indexed count() — rather than on every search call.
const searchIndexCache = new WeakMap<AppDatabase, SearchIndexCacheEntry>();

export async function upsertFood(db: AppDatabase, food: Food): Promise<void> {
  await db.foods.put({ ...food, nameNormalized: normalizeTurkish(food.name) });
}

export async function findByBarcode(db: AppDatabase, barcode: string): Promise<Food | undefined> {
  return db.foods.where('barcode').equals(barcode).first();
}

async function getSearchIndex(db: AppDatabase): Promise<SearchIndexCacheEntry> {
  const count = await db.foods.count();
  const cached = searchIndexCache.get(db);
  if (cached && cached.count === count) {
    return cached;
  }
  const all = await db.foods.toArray();
  const fuse = new Fuse(all, {
    keys: ['nameNormalized'],
    threshold: 0.3,
    minMatchCharLength: 2,
  });
  const entry = { count, all, fuse };
  searchIndexCache.set(db, entry);
  return entry;
}

const MIN_SEARCH_QUERY_LENGTH = 2;

// A bulk (scraped) record with every macro at zero almost always means the
// source never had real nutrition data for it (see transformOffRecord) rather
// than a genuinely zero-calorie food. A user's own entry (water, black coffee)
// is trusted as deliberate and never hidden.
function hasUsableNutrientData(food: Food): boolean {
  if (food.source !== 'bulk') return true;
  const n = food.nutrientsPer100g;
  return n.kcal !== 0 || n.protein !== 0 || n.carb !== 0 || n.fat !== 0;
}

function completenessScore(n: Nutrients): number {
  return Object.values(n).filter((value) => value !== 0).length;
}

/** Lower is better: exact name match ranks above a prefix match, above a substring match. */
type MatchTier = 0 | 1 | 2 | 3;

function directMatchTier(nameNormalized: string, normalizedQuery: string): MatchTier | null {
  if (nameNormalized === normalizedQuery) return 0;
  if (nameNormalized.startsWith(normalizedQuery)) return 1;
  if (nameNormalized.includes(normalizedQuery)) return 2;
  return null;
}

interface ScoredFood {
  food: Food;
  tier: MatchTier;
  fuseRank: number;
}

function pickBestOfGroup(items: ScoredFood[]): ScoredFood {
  return items.slice().sort((a, b) => {
    if (b.food.usageCount !== a.food.usageCount) return b.food.usageCount - a.food.usageCount;
    const completenessDiff =
      completenessScore(b.food.nutrientsPer100g) - completenessScore(a.food.nutrientsPer100g);
    if (completenessDiff !== 0) return completenessDiff;
    return 0;
  })[0];
}

export async function searchFoods(db: AppDatabase, query: string, limit = 20): Promise<Food[]> {
  const normalizedQuery = normalizeTurkish(query);
  if (normalizedQuery.length < MIN_SEARCH_QUERY_LENGTH) {
    return [];
  }

  const { all, fuse } = await getSearchIndex(db);
  const candidates = all.filter(hasUsableNutrientData);

  const directMatches: ScoredFood[] = [];
  for (const food of candidates) {
    const tier = directMatchTier(food.nameNormalized ?? normalizeTurkish(food.name), normalizedQuery);
    if (tier !== null) {
      directMatches.push({ food, tier, fuseRank: 0 });
    }
  }

  const candidateIds = new Set(candidates.map((f) => f.id));
  const scored: ScoredFood[] =
    directMatches.length > 0
      ? directMatches
      : fuse
          .search(normalizedQuery)
          .filter((result) => candidateIds.has(result.item.id))
          .map((result, fuseRank) => ({ food: result.item, tier: 3 as const, fuseRank }));

  // Dedup records that share a normalized name (common in scraped data: casing
  // variants, re-submitted duplicates) down to the single best representative.
  const groups = new Map<string, ScoredFood[]>();
  for (const entry of scored) {
    const key = entry.food.nameNormalized ?? normalizeTurkish(entry.food.name);
    const group = groups.get(key);
    if (group) group.push(entry);
    else groups.set(key, [entry]);
  }

  const deduped = [...groups.values()].map((group) => {
    const minTier = Math.min(...group.map((g) => g.tier)) as MatchTier;
    const bestAtMinTier = pickBestOfGroup(group.filter((g) => g.tier === minTier));
    return bestAtMinTier;
  });

  deduped.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.tier === 3) return a.fuseRank - b.fuseRank; // preserve Fuse's own relevance order
    if (b.food.usageCount !== a.food.usageCount) return b.food.usageCount - a.food.usageCount;
    return (b.food.lastUsedAt ?? 0) - (a.food.lastUsedAt ?? 0);
  });

  return deduped.slice(0, limit).map((entry) => entry.food);
}

export async function recordUsage(
  db: AppDatabase,
  foodId: string,
  quantityGrams: number,
): Promise<void> {
  const food = await db.foods.get(foodId);
  if (!food) return;
  await db.foods.update(foodId, {
    usageCount: food.usageCount + 1,
    lastUsedAt: Date.now(),
    lastQuantityGrams: quantityGrams,
  });
}

export async function getFavoritesAndRecents(db: AppDatabase, limit = 10): Promise<Food[]> {
  const all = await db.foods.toArray();
  return all
    .filter((food) => food.usageCount > 0)
    .sort((a, b) => {
      if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
      return (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0);
    })
    .slice(0, limit);
}
