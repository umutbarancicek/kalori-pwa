import { createReadStream, promises as fs } from 'node:fs';
import { createInterface } from 'node:readline';
import { gzipSync } from 'node:zlib';
import type { Food } from '../src/db/schema';
import { transformOffRecord, type OffRawProduct } from './transformOffRecord';

interface UsdaFoodNutrient {
  nutrientName?: string;
  value?: number;
}

interface UsdaRawFood {
  fdcId?: number | string;
  description?: string;
  foodNutrients?: UsdaFoodNutrient[];
}

const USDA_NUTRIENT_NAME_MAP: Record<string, keyof Food['nutrientsPer100g']> = {
  'Energy': 'kcal',
  'Protein': 'protein',
  'Carbohydrate, by difference': 'carb',
  'Sugars, total including NLEA': 'sugar',
  'Total lipid (fat)': 'fat',
  'Fatty acids, total saturated': 'satFat',
  'Fiber, total dietary': 'fiber',
  'Sodium, Na': 'salt',
};

function transformUsdaRecord(raw: UsdaRawFood): Food | null {
  if (!raw.description || raw.fdcId === undefined) return null;
  const nutrientsPer100g: Food['nutrientsPer100g'] = {
    kcal: 0,
    protein: 0,
    carb: 0,
    sugar: 0,
    fat: 0,
    satFat: 0,
    fiber: 0,
    salt: 0,
  };
  for (const n of raw.foodNutrients ?? []) {
    const key = n.nutrientName ? USDA_NUTRIENT_NAME_MAP[n.nutrientName] : undefined;
    if (key && typeof n.value === 'number') {
      nutrientsPer100g[key] = n.value;
    }
  }
  return {
    id: `usda-${raw.fdcId}`,
    name: raw.description,
    nutrientsPer100g,
    source: 'bulk',
    usageCount: 0,
  };
}

async function readOffProducts(offDumpPath: string): Promise<Food[]> {
  const results: Food[] = [];
  const rl = createInterface({ input: createReadStream(offDumpPath, { encoding: 'utf-8' }) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let raw: OffRawProduct;
    try {
      raw = JSON.parse(line);
    } catch {
      continue;
    }
    const food = transformOffRecord(raw);
    if (food) results.push(food);
  }
  return results;
}

async function readUsdaFoods(usdaDumpPath: string): Promise<Food[]> {
  const raw = await fs.readFile(usdaDumpPath, 'utf-8');
  const parsed: UsdaRawFood[] = JSON.parse(raw);
  return parsed.map(transformUsdaRecord).filter((f): f is Food => f !== null);
}

async function writeJsonAndGzip(outPath: string, data: unknown): Promise<void> {
  const json = JSON.stringify(data);
  await fs.writeFile(outPath, json, 'utf-8');
  await fs.writeFile(`${outPath}.gz`, new Uint8Array(gzipSync(json)));
}

export async function buildFoodData(
  offDumpPath: string,
  usdaDumpPath: string,
  outDir: string,
): Promise<void> {
  await fs.mkdir(outDir, { recursive: true });
  const bulkFoods = await readOffProducts(offDumpPath);
  const genericFoods = await readUsdaFoods(usdaDumpPath);
  await writeJsonAndGzip(`${outDir}/foods-bulk.json`, bulkFoods);
  await writeJsonAndGzip(`${outDir}/foods-generic.json`, genericFoods);
}

async function main() {
  const [offDumpPath, usdaDumpPath, outDir] = process.argv.slice(2);
  if (!offDumpPath || !usdaDumpPath || !outDir) {
    console.error('Kullanım: tsx scripts/buildFoodData.ts <offDumpPath> <usdaDumpPath> <outDir>');
    process.exit(1);
  }
  await buildFoodData(offDumpPath, usdaDumpPath, outDir);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
