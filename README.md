# iSANMATE Public API

A public inventory reference for everything iSANMATE stocks on [isanmate.store](https://isanmate.store), built with iSANMATE's permission. The data lives in [`data/products.json`](data/products.json).

Each color or option of a filament is its own product entry. For example, "High Speed Rainbow PLA+ Filament" has 7 colors on the store and appears as 7 products. Each has its own ID, SKU, price, stock status, image and link.

See [CHANGELOG.md](CHANGELOG.md) for the project's history.

## How it works

The store runs on Shopify, so the scraper reads Shopify's public storefront JSON (`/products.json`, `/collections/*/products.json`) instead of parsing HTML. It then normalizes each product into a consistent shape. Prices are fixed to **USD**, the store's base currency. Without that, Shopify Markets returns prices in a currency based on the requester's location.

No dependencies are needed. It only requires Node 18+ and pnpm.

```sh
pnpm scrape   # refresh data/products.json from the live store
pnpm start    # web app at http://localhost:3000 with an "Update data" button
```

The web app shows every product with search, a material filter and an "In stock only" toggle. **Update data** re-scrapes the store, rewrites `data/products.json`, and lists what changed: new or removed products, price changes and stock changes.

### Local endpoints

| Method | Path            | Description                                   |
| ------ | --------------- | --------------------------------------------- |
| GET    | `/api/products` | The full catalog (same as `data/products.json`) |
| POST   | `/api/update`   | Re-scrape, save, and return a change summary  |

## Data shape

```jsonc
{
  "source": "https://isanmate.store",
  "currency": "USD",
  "scraped_at": "2026-10-18T04:07:05.700Z",
  "product_count": 217,      // one entry per color/option
  "in_stock_count": 217,
  "listing_count": 39,       // product pages on the store
  "products": [
    {
      "id": 49671741702461,  // Shopify variant ID, stable across updates
      "sku": "1013061205",
      "name": "High Speed Rainbow PLA+ Filament - Summer Breeze",
      "color": "Summer Breeze",
      "options": { "Color": "Summer Breeze" },
      "material": "PLA+",                    // PLA, PLA+, PETG, ASA, ABS, TPU, PC, PA6, PA12
      "features": ["High Speed", "Rainbow"], // Silk, Matte, Carbon Fiber, Glow in the Dark…
      "diameter": "1.75mm",
      "roll_size": null,                     // e.g. { "label": "1kg", "grams_per_spool": 1000, "spools": 1 }
      "price": 32.8,
      "compare_at_price": 45.3,
      "in_stock": true,
      "url": "https://isanmate.store/products/high-speed-rainbow-pla-filament?variant=49671741702461",
      "image": "https://cdn.shopify.com/…/HS-PLA_Rainbow_Summer_Breeze_2.jpg",
      "images": ["…this color's image first, then the rest of the listing's gallery"],
      "description": "Plain-text description…",
      "description_html": "<p>…</p>",
      "shipping_weight_grams": 1000,
      "vendor": "ISANMATE",
      "product_type": null,
      "collections": [{ "handle": "pla", "title": "PLA" }],
      "tags": [],
      "listing": {                           // the store page this product belongs to
        "id": 8952610980157,
        "name": "High Speed Rainbow PLA+ Filament",
        "handle": "high-speed-rainbow-pla-filament",
        "url": "https://isanmate.store/products/high-speed-rainbow-pla-filament"
      },
      "published_at": "…", "updated_at": "…"
    }
  ]
}
```

### Translations

A few listings are published on the store only in German. Their English translations live in [`data/translations.json`](data/translations.json), keyed by Shopify product ID, and are applied on every scrape. Translated products keep the store's text under `original`:

```jsonc
"original": { "language": "de", "name": "…Klares Filament 3D-Drucker…", "description": "…" }
```

Each translation records a `source_sha1` fingerprint of the store's text. If iSANMATE edits that listing, the scrape keeps the store's original text and prints a warning with the new fingerprint, so the translation can be reviewed and updated. A new listing that looks German but has no translation also triggers a warning.

### Notes on derived fields

`material`, `features`, `diameter`, `roll_size` and (for single-color listings) `color` are parsed from titles and descriptions, because the store has no structured fields for them. A field is `null` or empty when the store doesn't state it. For example, `color` is `null` for multicolor bundles and listings with no color choice. For example, many listings never give a spool weight. `shipping_weight_grams` is Shopify's shipping weight, not the filament weight.
