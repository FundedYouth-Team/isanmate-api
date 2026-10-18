// Local preview of the hosted site: the catalog viewer plus the same API the Pages Function serves.
//   GET  /                  catalog viewer UI
//   GET  /api/products      the catalog JSON (same content as data/products.json)
//                           optional filters: ?q=text&material=PETG&in_stock=true|false
// Refresh the data with `pnpm update-data`.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCatalog } from './scrape.js';
import { applyFilters, checkFilters } from './filter.js';

const PORT = Number(process.env.PORT) || 3000;
const INDEX_HTML = resolve(dirname(fileURLToPath(import.meta.url)), '../public/index.html');

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  try {
    const { pathname, searchParams } = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(await readFile(INDEX_HTML));
    }
    if (req.method === 'GET' && pathname === '/api/products') {
      const error = checkFilters(searchParams);
      if (error) return sendJson(res, 400, { error });
      const catalog = await readCatalog();
      if (!catalog) return sendJson(res, 404, { error: 'No data yet. Run pnpm update-data.' });
      return sendJson(res, 200, applyFilters(catalog, searchParams));
    }
    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => console.log(`iSANMATE catalog running at http://localhost:${PORT}`));
