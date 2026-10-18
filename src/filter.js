// Query filters for GET /api/products. Shared by the local server and the Cloudflare Pages Function,
// so it must not use Node-only APIs.

export const FILTERS = ['q', 'material', 'in_stock'];

// Returns an error message for bad filter params, or null if they're valid.
export function checkFilters(params) {
  const unknown = [...params.keys()].filter((k) => !FILTERS.includes(k));
  if (unknown.length) return `Unknown parameter(s): ${unknown.join(', ')}. Supported: ${FILTERS.join(', ')}.`;
  const inStock = params.get('in_stock');
  if (inStock && inStock !== 'true' && inStock !== 'false') return 'in_stock must be "true" or "false".';
  return null;
}

// The catalog response for these params: the catalog unchanged when there are none,
// otherwise the matching products plus `query` and `match_count`.
export function applyFilters(catalog, params) {
  if (!params.toString()) return catalog;
  const q = params.get('q')?.trim().toLowerCase();
  const material = params.get('material')?.toLowerCase();
  const inStock = params.get('in_stock') || null;
  const products = catalog.products.filter((p) =>
    (!material || p.material?.toLowerCase() === material) &&
    (!inStock || p.in_stock === (inStock === 'true')) &&
    (!q || [p.name, p.color, p.material, p.sku, ...p.features].join(' ').toLowerCase().includes(q)));
  return { ...catalog, query: Object.fromEntries(params), match_count: products.length, products };
}
