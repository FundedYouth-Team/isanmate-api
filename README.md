# iSANMATE Public API

A free, public inventory list of every 3D printing filament [iSANMATE](https://isanmate.store) stocks: prices, colors, materials, stock status, images and links. Built with iSANMATE's permission.

This is a community-maintained project, not an official iSANMATE API.

Each color of a filament is its own product. For example, "High Speed Rainbow PLA+ Filament" comes in 7 colors, so it appears as 7 products.

## Using the API

The whole catalog is one JSON file. No API key, sign-up or setup is needed. Just request this URL:

```
https://raw.githubusercontent.com/FundedYouth-Team/isanmate-api/main/data/products.json
```

It works from anywhere, including browser JavaScript on your own website. The data is refreshed from the store periodically. Check `scraped_at` to see when it was last updated.

### Examples

**In a browser:** open the URL above to see the raw data.

**Command line:**

```sh
curl https://raw.githubusercontent.com/FundedYouth-Team/isanmate-api/main/data/products.json
```

**JavaScript:**

```js
const res = await fetch('https://raw.githubusercontent.com/FundedYouth-Team/isanmate-api/main/data/products.json');
const { products } = await res.json();

// Every PETG filament that's in stock, cheapest first
const petg = products
  .filter((p) => p.material === 'PETG' && p.in_stock)
  .sort((a, b) => a.price - b.price);

petg.forEach((p) => console.log(`${p.name}: $${p.price}`));
```

**Python:**

```python
import requests

url = "https://raw.githubusercontent.com/FundedYouth-Team/isanmate-api/main/data/products.json"
products = requests.get(url).json()["products"]

for p in products:
    if p["material"] == "PLA" and p["in_stock"]:
        print(p["name"], p["price"], p["url"])
```

### Sample response

This is the real entry for one product, trimmed to a single product. The descriptions and image list are shortened here.

```json
{
  "source": "https://isanmate.store",
  "currency": "USD",
  "scraped_at": "2026-10-18T04:12:31.562Z",
  "product_count": 217,
  "in_stock_count": 217,
  "listing_count": 39,
  "products": [
    {
      "id": 51116953305405,
      "sku": null,
      "name": "PLA Glow in The Dark Filament 1KG - Green",
      "color": "Green",
      "options": { "Color": "Green" },
      "material": "PLA",
      "features": ["Glow in the Dark"],
      "diameter": "1.75mm",
      "roll_size": { "label": "1kg", "grams_per_spool": 1000, "spools": 1 },
      "price": 26.99,
      "compare_at_price": null,
      "in_stock": true,
      "url": "https://isanmate.store/products/pla-glow-in-the-dark-filament-1kg?variant=51116953305405",
      "image": "https://cdn.shopify.com/s/files/1/0841/1004/9597/files/01_2784b536-ef63-45fb-9a29-3ea04ea47f15.jpg?v=1764839002",
      "images": [
        "https://cdn.shopify.com/s/files/1/0841/1004/9597/files/01_2784b536-ef63-45fb-9a29-3ea04ea47f15.jpg?v=1764839002",
        "https://cdn.shopify.com/s/files/1/0841/1004/9597/files/01-2_2a4d321a-c080-4ec9-aee9-cdf1e6775386.jpg?v=1764839002"
      ],
      "description": "PLA Glow in The Dark Filament 1KG\n🌟【Dazzling Glow, Shines Day and Night】iSANMATE glow-in-the-dark rainbow color PLA fil…",
      "description_html": "<h2>PLA Glow in The Dark Filament 1KG</h2>\n<p>…",
      "shipping_weight_grams": 1300,
      "vendor": "iSANMATE",
      "product_type": "3D Printing Filament",
      "collections": [{ "handle": "pla-glow", "title": "PLA Glow" }],
      "tags": [],
      "listing": {
        "id": 10172060533053,
        "name": "PLA Glow in The Dark Filament 1KG",
        "handle": "pla-glow-in-the-dark-filament-1kg",
        "url": "https://isanmate.store/products/pla-glow-in-the-dark-filament-1kg"
      },
      "published_at": "2025-12-04T17:01:18+08:00",
      "updated_at": "2026-10-18T11:51:37+08:00"
    }
  ]
}
```

### Field reference

**Top level**

| Field            | Description                                              |
| ---------------- | -------------------------------------------------------- |
| `source`         | The store the data comes from                            |
| `currency`       | Currency for all prices (always `USD`)                   |
| `scraped_at`     | When the data was last refreshed (UTC)                   |
| `product_count`  | Number of products (one per color/option)                |
| `in_stock_count` | Number of products currently in stock                    |
| `listing_count`  | Number of product pages on the store                     |
| `products`       | The list of products                                     |

**Each product**

| Field                    | Description |
| ------------------------ | ----------- |
| `id`                     | Unique product ID. It stays the same between updates, so you can use it as a key. |
| `sku`                    | iSANMATE's SKU, or `null` if the store doesn't list one |
| `name`                   | Product name, including the color |
| `color`                  | Color name, or `null` for multicolor bundles and products without a color choice |
| `options`                | The option(s) chosen on the store page, e.g. `{ "Color": "Green" }` |
| `material`               | `PLA`, `PLA+`, `PETG`, `ASA`, `ABS`, `TPU`, `PC`, `PA6` or `PA12` |
| `features`               | Tags such as `Silk`, `Matte`, `Carbon Fiber`, `High Speed`, `Glow in the Dark`, `Rainbow`, `Bundle` |
| `diameter`               | Filament diameter, e.g. `"1.75mm"`, or `null` if not stated |
| `roll_size`              | Spool weight and count, or `null` if the store doesn't state it |
| `price`                  | Current price in USD |
| `compare_at_price`       | Original price when on sale, otherwise `null` |
| `in_stock`               | `true` if it can currently be ordered |
| `url`                    | Direct link to this color on the store |
| `image`                  | Main image for this color |
| `images`                 | All images: this color's first, then the rest of the listing's gallery |
| `description`            | Plain-text description |
| `description_html`       | Description as HTML |
| `shipping_weight_grams`  | Shopify's shipping weight (includes packaging, not the filament weight) |
| `vendor`, `product_type`, `tags` | As set on the store |
| `collections`            | Store categories this product appears in |
| `listing`                | The store page this product belongs to. Products with the same `listing.id` are colors of the same item. |
| `original`               | Only on translated products: the store's original text (see [Translations](#translations)) |
| `published_at`, `updated_at` | Timestamps from the store |

Notes:

- `material`, `features`, `diameter`, `roll_size` and some `color` values are worked out from product names and descriptions, because the store doesn't have dedicated fields for them. They are `null` or empty when the store doesn't say. For example, many listings never give a spool weight.
- Prices change. Always link to `url` for the current price before ordering.

## Running it yourself

The rest of this README is for maintainers who refresh the data.

The store runs on Shopify, so the scraper reads Shopify's public storefront JSON (`/products.json`, `/collections/*/products.json`) instead of parsing HTML. Prices are fixed to **USD**, the store's base currency. Otherwise, Shopify returns prices in a currency based on the requester's location.

It requires Node 18+ and pnpm, and has no dependencies.

```sh
pnpm update-data   # refresh data/products.json from the live store and print what changed
pnpm start         # preview the web app at http://localhost:3000
pnpm build         # assemble the site in dist/ for Cloudflare Pages
```

`pnpm update-data` prints a summary of new and removed products, price changes and stock changes. To publish an update, commit and push `data/products.json`. A nightly GitHub Action also does this (see [Hosting](#hosting)).

The web app shows every product with search, a material filter and an "In stock only" toggle. It serves one endpoint:

| Method | Path            | Description                                    |
| ------ | --------------- | ---------------------------------------------- |
| GET    | `/api/products` | The full catalog (same as `data/products.json`) |

`/api/products` takes optional filters, both on the hosted site and in the local preview. The raw GitHub URL above doesn't, because it's a static file.

| Parameter  | Description |
| ---------- | ----------- |
| `q`        | Text search over name, color, material, SKU and features |
| `material` | Exact material, e.g. `PETG` (not case-sensitive) |
| `in_stock` | `true` or `false` |

For example, `/api/products?material=PETG&in_stock=true`. A filtered response has the same shape as the full catalog, plus `query` (the filters used) and `match_count`. Unknown parameters return a 400 error.

The web app's filters call this endpoint, and the request bar above the results shows the exact URL. You can edit that URL and click **Run** to send your own request, **Copy** it, or open the raw JSON.

### Hosting

The public site runs on Cloudflare Pages, connected to this GitHub repo:

| Pages setting          | Value        |
| ---------------------- | ------------ |
| Build command          | `pnpm build` |
| Build output directory | `dist`       |

`pnpm build` copies `public/` and `data/products.json` into `dist/`. The site serves the catalog at `/products.json`. [`functions/api/products.js`](functions/api/products.js) is a Pages Function that serves `/api/products` with the same filters as the local preview, using [`src/filter.js`](src/filter.js). Both endpoints allow cross-origin requests.

Visitors can't trigger a scrape. [`.github/workflows/update-data.yml`](.github/workflows/update-data.yml) runs the scraper every day at 09:00 UTC (2 AM Pacific Daylight Time, 1 AM standard time) and commits `data/products.json`. The push makes Cloudflare Pages redeploy. To run it on demand, use **Run workflow** on the repo's Actions tab.

### Translations

A few listings are published on the store only in German. Their English translations live in [`data/translations.json`](data/translations.json), keyed by Shopify product ID, and are applied on every scrape. Translated products keep the store's text under `original`:

```jsonc
"original": { "language": "de", "name": "…Klares Filament 3D-Drucker…", "description": "…" }
```

Each translation records a `source_sha1` fingerprint of the store's text. If iSANMATE edits that listing, the scrape keeps the store's original text and prints a warning with the new fingerprint, so the translation can be reviewed and updated. A new listing that looks German but has no translation also triggers a warning.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
