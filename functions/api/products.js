// Cloudflare Pages Function for GET /api/products. Reads the static /products.json from the
// deployment and applies the same filters as the local server.

import { applyFilters, checkFilters } from '../../src/filter.js';

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=300',
};

export async function onRequestGet({ request, env }) {
  const { searchParams } = new URL(request.url);
  const error = checkFilters(searchParams);
  if (error) return Response.json({ error }, { status: 400, headers: HEADERS });
  const res = await env.ASSETS.fetch(new URL('/products.json', request.url));
  if (!res.ok) return Response.json({ error: 'Catalog not found.' }, { status: 500, headers: HEADERS });
  return Response.json(applyFilters(await res.json(), searchParams), { headers: HEADERS });
}
