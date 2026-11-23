// Fetches every Turkey-tagged product from Open Food Facts via the search-a-licious
// API (search.openfoodfacts.org) and writes it as JSONL compatible with
// scripts/transformOffRecord.ts's OffRawProduct shape.
//
// Why this instead of the official full-world dump: the world dump
// (openfoodfacts-products.jsonl.gz) is several GB and has no pre-filtered
// per-country version. world.openfoodfacts.org also rate-limits anonymous
// script traffic (503). search.openfoodfacts.org is a separate, lighter
// Elasticsearch-backed API that answers a country-filtered query directly.
//
// Usage: node scripts/fetchOffTurkey.mjs [outPath]
// (outPath defaults to off-turkey-raw.jsonl in the current directory)

import { writeFile } from 'node:fs/promises';

const BASE = 'https://search.openfoodfacts.org/search';
const PAGE_SIZE = 100;
const FIELDS = 'code,product_name,product_name_tr,brands,nutriments,countries_tags';
const UA = 'KaloriPWA/1.0 (personal project; https://umutbarancicek.github.io/kalori-pwa/)';

async function fetchPage(page) {
  const url = `${BASE}?q=${encodeURIComponent('countries_tags:"en:turkey"')}&page_size=${PAGE_SIZE}&page=${page}&sort_by=unique_scans_n&fields=${FIELDS}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) {
    throw new Error(`Page ${page} failed: HTTP ${res.status}`);
  }
  return res.json();
}

function normalize(hit) {
  return {
    code: hit.code,
    product_name: hit.product_name_tr || hit.product_name,
    brands: Array.isArray(hit.brands) ? hit.brands.join(', ') : hit.brands,
    countries_tags: hit.countries_tags,
    nutriments: hit.nutriments ?? {},
  };
}

async function main() {
  const first = await fetchPage(1);
  const totalPages = first.page_count;
  console.log(`Total products: ${first.count}, pages: ${totalPages}`);

  const lines = first.hits.map((hit) => JSON.stringify(normalize(hit)));

  for (let page = 2; page <= totalPages; page++) {
    const data = await fetchPage(page);
    for (const hit of data.hits) {
      lines.push(JSON.stringify(normalize(hit)));
    }
    if (page % 5 === 0 || page === totalPages) {
      console.log(`Fetched page ${page}/${totalPages} (${lines.length} products so far)`);
    }
    await new Promise((r) => setTimeout(r, 300)); // be polite to the API
  }

  const outPath = process.argv[2] ?? 'off-turkey-raw.jsonl';
  await writeFile(outPath, lines.join('\n') + '\n', 'utf-8');
  console.log(`Wrote ${lines.length} products to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
