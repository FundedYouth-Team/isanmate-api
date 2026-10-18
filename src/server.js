// Local web app: browse the catalog and refresh data/products.json with one click.
//   GET  /                  catalog viewer UI
//   GET  /api/products      the catalog JSON (same content as data/products.json)
//   POST /api/update        re-scrape the store, write the file, return a change summary

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCatalog, updateCatalog } from './scrape.js';

const PORT = Number(process.env.PORT) || 3000;
const INDEX_HTML = resolve(dirname(fileURLToPath(import.meta.url)), '../public/index.html');

let updateInProgress = null;

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(await readFile(INDEX_HTML));
    }
    if (req.method === 'GET' && req.url === '/api/products') {
      const catalog = await readCatalog();
      return catalog ? sendJson(res, 200, catalog) : sendJson(res, 404, { error: 'No data yet. Run an update.' });
    }
    if (req.method === 'POST' && req.url === '/api/update') {
      // Coalesce concurrent clicks into a single scrape.
      updateInProgress ??= updateCatalog({ log: console.log }).finally(() => (updateInProgress = null));
      const { catalog, changes } = await updateInProgress;
      return sendJson(res, 200, {
        scraped_at: catalog.scraped_at,
        product_count: catalog.product_count,
        in_stock_count: catalog.in_stock_count,
        listing_count: catalog.listing_count,
        changes,
      });
    }
    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => console.log(`iSANMATE catalog running at http://localhost:${PORT}`));
