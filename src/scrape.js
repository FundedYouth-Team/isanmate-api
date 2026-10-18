// Scrapes the iSANMATE Shopify storefront into a normalized catalog.
// Uses Shopify's public storefront JSON endpoints (/products.json, /collections.json)
// rather than parsing HTML, so it is fast and stable across theme changes.

import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const STORE_URL = 'https://isanmate.store';
export const DATA_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../data/products.json');
// Hand-written English translations for listings the store only publishes in another
// language, keyed by Shopify product ID.
const TRANSLATIONS_FILE = resolve(dirname(DATA_FILE), 'translations.json');

// Shopify Markets geolocates requests and may return prices in a local currency
// (e.g. HKD). Pin every request to the store's base currency so data is stable.
export const CURRENCY = 'USD';
const PAGE_LIMIT = 250; // Shopify's max page size
const REQUEST_DELAY_MS = 300; // be polite to the store
const USER_AGENT = 'isanmate-api/1.0 (authorized wholesaler catalog sync)';

// Checked in order; first match wins, so more specific materials come first.
const MATERIALS = [
  ['PA12', /\bPA12\b/i],
  ['PA6', /\bPA6\b/i],
  ['PC', /\b(polycarbonate|PC)\b/i],
  ['PETG', /\bPETG\b/i],
  ['ASA', /\bASA\b/i],
  ['ABS', /\bABS\b/i],
  ['TPU', /\bTPU\b/i],
  ['PLA+', /\bPLA\+/i],
  ['PLA', /\bPLA\b/i],
];

const FEATURES = [
  ['Carbon Fiber', /carbon fiber/i],
  ['High Speed', /high[- ]speed|\bHS\b|hochgeschwindigkeit/i],
  ['Silk', /\bsilk\b/i],
  ['Matte', /\bmatte\b/i],
  ['Glow in the Dark', /glow in the dark|luminous/i],
  ['Glitter', /glitter/i],
  ['Transparent', /transparent|translucent|clear|klares/i],
  ['Rainbow', /rainbow/i],
  ['Gradient', /gradient/i],
  ['Dual Color', /dual color/i],
  ['Tri-Color', /tri-color/i],
  ['Marble', /marble/i],
  ['Wood', /\bwood\b/i],
  ['UV Color Change', /uv color change/i],
  ['Bundle', /bundle|\*\s*\d+\s*(spule|spools?)/i],
];

// Common German words, used to flag listings that still need a translation.
const GERMAN_HINT = /\b(und|für|mit|wird|nicht|Spule|Drucker|geeignet)\b|[äöüß]/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Shopify rate-limits bursts with a 429 or an HTML challenge page; back off and retry.
async function getJson(path, attempts = 4) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(STORE_URL + path, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    const body = await res.text();
    if (res.ok) {
      try {
        return JSON.parse(body);
      } catch {
        // fall through to retry
      }
    } else if (res.status !== 429 && res.status < 500) {
      throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
    }
    if (attempt >= attempts) throw new Error(`GET ${path} failed after ${attempts} attempts (status ${res.status})`);
    await sleep(2000 * 2 ** (attempt - 1));
  }
}

async function fetchAllPages(basePath, key) {
  const items = [];
  for (let page = 1; ; page++) {
    const sep = basePath.includes('?') ? '&' : '?';
    const query = `limit=${PAGE_LIMIT}&page=${page}&currency=${CURRENCY}`;
    const batch = (await getJson(`${basePath}${sep}${query}`))[key];
    items.push(...batch);
    if (batch.length < PAGE_LIMIT) return items;
    await sleep(REQUEST_DELAY_MS);
  }
}

function htmlToText(html = '') {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

// Weight parsing: "1KG", "1 KG*10", "16KG", "250g", "1.25kg".
function parseWeight(text) {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s?(kg|g)\b(?:\s*[*x×]\s*(\d+))?/i);
  if (!m) return null;
  const value = parseFloat(m[1].replace(',', '.'));
  const grams = m[2].toLowerCase() === 'kg' ? value * 1000 : value;
  const spools = m[3] ? parseInt(m[3], 10) : 1;
  const label = `${m[1].replace(',', '.')}${m[2].toLowerCase()}` + (spools > 1 ? ` x ${spools}` : '');
  return { label, grams_per_spool: grams, spools };
}

function parseDiameter(text) {
  const m = text.match(/\b(1[.,]75|2[.,]85)\s?mm/i);
  return m ? `${m[1].replace(',', '.')}mm` : null;
}

function detectMaterial(text) {
  return MATERIALS.find(([, re]) => re.test(text))?.[0] ?? null;
}

// Single-color products are named like "Carbon Fiber PLA Filament - Black".
function colorFromTitle(title) {
  const m = title.match(/\s[-–]\s([A-Za-z ]+)$/);
  return m ? m[1].trim() : null;
}

function detectFeatures(text) {
  return FEATURES.filter(([, re]) => re.test(text)).map(([name]) => name);
}

// Shopify option names on this store vary ("Color", "Color：", "Material", "China Warehouse").
function normalizeOptionName(name) {
  return name.replace(/[:：\s]+$/, '').trim();
}

const sourceHash = (p) => createHash('sha1').update(`${p.title}\n${p.body_html}`).digest('hex');

// Swaps in English text for listings in data/translations.json. A translation is only
// used while the store's source text is unchanged; otherwise the original is kept and
// a warning asks for the translation to be refreshed.
function applyTranslation(p, translations, log) {
  const t = translations[p.id];
  if (!t) {
    if (GERMAN_HINT.test(p.title)) {
      log(`WARNING: "${p.title}" (${p.id}) looks untranslated. Add it to data/translations.json.`);
    }
    return { product: p, original: null };
  }
  const hash = sourceHash(p);
  if (hash !== t.source_sha1) {
    log(
      `WARNING: "${p.title}" (${p.id}) changed on the store since it was translated. ` +
        `Update its entry in data/translations.json (new source_sha1: ${hash}).`,
    );
    return { product: p, original: null };
  }
  return {
    product: { ...p, title: t.name, body_html: t.description_html },
    original: { language: t.language, name: p.title, description: htmlToText(p.body_html) },
  };
}

async function readTranslations() {
  try {
    return JSON.parse(await readFile(TRANSLATIONS_FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

// Each Shopify variant (one color/option of a listing) becomes its own inventory item,
// carrying a copy of the listing-level details it shares with its siblings.
function toInventoryItems(p, collectionsByProduct, original) {
  const description = htmlToText(p.body_html);
  const options = p.options
    .filter((o) => !(o.name === 'Title' && o.values.length === 1 && o.values[0] === 'Default Title'))
    .map((o, i) => ({ name: normalizeOptionName(o.name), key: `option${i + 1}` }));
  // Listings with a single option use it as the color picker even when it isn't named
  // "Color" (e.g. "Material: Box Wood", "China Warehouse: Black").
  const colorOption = options.find((o) => /colou?r/i.test(o.name)) ?? (options.length === 1 ? options[0] : null);
  const imagesById = new Map(p.images.map((img) => [img.id, img.src]));
  const material = detectMaterial(p.title) ?? detectMaterial(description);
  const diameter = parseDiameter(p.title) ?? parseDiameter(description);
  // Descriptions mention gram figures in unrelated contexts ("models over 50g"),
  // so only trust kilogram figures when falling back to the description.
  const descWeight = parseWeight(description);
  const listingWeight = parseWeight(p.title) ?? (descWeight?.grams_per_spool >= 1000 ? descWeight : null);

  return p.variants.map((v) => {
    const variantTitle = v.title === 'Default Title' ? null : v.title;
    const optionValues = Object.fromEntries(
      options.map((o) => [o.name, v[o.key]]).filter(([, val]) => val != null),
    );
    // Variants without their own photo show the listing's main image on the store.
    const image = v.featured_image?.src ?? imagesById.get(v.image_id) ?? p.images[0]?.src ?? null;

    return {
      id: v.id,
      sku: v.sku || null,
      name: variantTitle && !p.title.endsWith(variantTitle) ? `${p.title} - ${variantTitle}` : p.title,
      color: colorOption ? v[colorOption.key] : colorFromTitle(p.title),
      options: optionValues,
      material,
      features: detectFeatures(`${p.title} ${variantTitle ?? ''}`),
      diameter,
      roll_size: (variantTitle && parseWeight(variantTitle)) || listingWeight,
      price: Number(v.price),
      compare_at_price: v.compare_at_price ? Number(v.compare_at_price) : null,
      in_stock: v.available,
      url: `${STORE_URL}/products/${p.handle}?variant=${v.id}`,
      image,
      images: [image, ...p.images.map((img) => img.src).filter((src) => src !== image)].filter(Boolean),
      description,
      description_html: p.body_html,
      shipping_weight_grams: v.grams || null,
      vendor: p.vendor,
      product_type: p.product_type || null,
      collections: collectionsByProduct.get(p.id) ?? [],
      tags: p.tags,
      listing: {
        id: p.id,
        name: p.title,
        handle: p.handle,
        url: `${STORE_URL}/products/${p.handle}`,
      },
      // Present only on translated products: the store's untranslated text.
      ...(original && { original }),
      published_at: p.published_at,
      updated_at: v.updated_at,
    };
  });
}

async function fetchCollectionMembership() {
  const collections = await fetchAllPages('/collections.json', 'collections');
  const byProduct = new Map();
  for (const c of collections) {
    if (!c.products_count || c.handle === 'frontpage') continue;
    await sleep(REQUEST_DELAY_MS);
    const products = await fetchAllPages(`/collections/${c.handle}/products.json`, 'products');
    for (const p of products) {
      if (!byProduct.has(p.id)) byProduct.set(p.id, []);
      byProduct.get(p.id).push({ handle: c.handle, title: c.title });
    }
  }
  return byProduct;
}

export async function scrapeCatalog({ log = () => {} } = {}) {
  log('Fetching products…');
  const raw = await fetchAllPages('/products.json', 'products');
  log(`Found ${raw.length} products. Fetching collection membership…`);
  const collectionsByProduct = await fetchCollectionMembership();

  const translations = await readTranslations();

  const products = raw.flatMap((p) => {
    const { product, original } = applyTranslation(p, translations, log);
    return toInventoryItems(product, collectionsByProduct, original);
  });
  return {
    source: STORE_URL,
    currency: CURRENCY,
    scraped_at: new Date().toISOString(),
    product_count: products.length,
    in_stock_count: products.filter((p) => p.in_stock).length,
    listing_count: raw.length,
    products,
  };
}

export async function readCatalog() {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

// Summarizes what changed between two catalog snapshots.
export function diffCatalogs(prev, next) {
  const before = new Map((prev?.products ?? []).map((p) => [p.id, p]));
  const after = new Map(next.products.map((p) => [p.id, p]));
  const added = next.products.filter((p) => !before.has(p.id)).map((p) => p.name);
  const removed = [...before.values()].filter((p) => !after.has(p.id)).map((p) => p.name);
  const priceChanges = [];
  const stockChanges = [];
  for (const p of next.products) {
    const old = before.get(p.id);
    if (!old) continue;
    if (old.price !== p.price) priceChanges.push({ product: p.name, from: old.price, to: p.price });
    if (old.in_stock !== p.in_stock) stockChanges.push({ product: p.name, in_stock: p.in_stock });
  }
  return { added, removed, price_changes: priceChanges, stock_changes: stockChanges };
}

export async function updateCatalog({ log = () => {} } = {}) {
  let prev = await readCatalog();
  // Snapshots from before the one-item-per-variant format can't be compared item by item.
  if (prev && !('in_stock_count' in prev)) prev = null;
  const next = await scrapeCatalog({ log });
  await mkdir(dirname(DATA_FILE), { recursive: true });
  // Write to a temp file then rename so readers never see a half-written file.
  const tmp = `${DATA_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(next, null, 2) + '\n');
  await rename(tmp, DATA_FILE);
  return { catalog: next, changes: diffCatalogs(prev, next) };
}

// CLI: `pnpm update-data`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { catalog, changes } = await updateCatalog({ log: console.log });
  console.log(
    `Wrote ${catalog.product_count} products (${catalog.in_stock_count} in stock, ` +
      `from ${catalog.listing_count} store listings) to ${DATA_FILE}`,
  );
  console.log(
    `Changes: +${changes.added.length} / -${changes.removed.length} products, ` +
      `${changes.price_changes.length} price changes, ${changes.stock_changes.length} stock changes`,
  );
}
