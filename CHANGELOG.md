# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Rewrote the README for API users. It now covers the public endpoint URL; examples in curl, JavaScript and Python; a real sample response; and a reference for every field. Maintainer instructions moved to a "Running it yourself" section.

## [0.4.0] - 2026-10-17

### Added

- English translations for the two listings the store publishes only in German: "PLA Transparent Filament, 1 KG*10 Spools" and "250g*8 Spools". Translations live in `data/translations.json` and are applied during every scrape.
- An `original` field on translated products, holding the store's German name and description for reference.
- Scrape warnings when a listing looks German but has no translation, and when a translated listing's text changes on the store. In that case the store's original text is kept until the translation is updated.

### Fixed

- The "High Speed" feature tag now also matches the hyphenated "High-Speed".
- The "Bundle" feature tag now recognizes English "Spools" as well as German "Spule".

## [0.3.0] - 2026-10-17

### Changed

- **Breaking:** `data/products.json` now lists every color/option as its own product, so it works as an inventory reference of what iSANMATE stocks. The 39 store listings became 217 products. Each product has its own `id` (Shopify variant ID), `sku`, `name` (listing name plus color), `color`, `price`, `compare_at_price`, `in_stock`, `image` and `url`.
- Listing-level details are copied onto each product: material, features, diameter, roll size, description, image gallery (with this color's image first) and collections. A `listing` object links back to the store page.
- Top-level totals are now `product_count`, `in_stock_count` and `listing_count`. They replace `product_count` and `variant_count`.
- `available` was renamed to `in_stock`.
- The update summary reports price and stock changes per product. `availability_changes` was renamed to `stock_changes`.
- The web app shows one card per product and has an "In stock only" filter. The color buttons were removed.

### Fixed

- Listings whose only option isn't named "Color" now use it as the color. Examples are the Wood filament ("Material: Box Wood") and the Carbon Fiber ABS ("China Warehouse: Black").
- Product names no longer repeat the color when the listing title already ends with it.

## [0.2.0] - 2026-10-17

### Added

- Clickable color buttons in the web app that swap the image, price, link and stock status. They were replaced in 0.3.0.
- Automatic retry with backoff when the store rate-limits requests (HTTP 429 or an HTML challenge page).

### Fixed

- 15 colors/options without their own photo now use the listing's main image, matching the store.

## [0.1.0] - 2026-10-17

### Added

- Scraper (`pnpm scrape`) that reads the store's public Shopify JSON (`/products.json`, `/collections/*/products.json`) and writes `data/products.json`.
- Fields: name, material, features (Silk, Matte, Carbon Fiber, etc.), diameter, roll size, colors, price, stock, product link, image links, plain-text and HTML descriptions, collections, tags and per-variant details.
- Local web app (`pnpm start`) with search, a material filter and an **Update data** button that re-scrapes the store and summarizes what changed: new or removed products, price changes and stock changes.
- Endpoints `GET /api/products` and `POST /api/update`.
- Safe file writes (write to a temp file, then rename), so a half-written file is never served.
- Zero-dependency Node project using pnpm.

### Fixed

- Prices are pinned to USD, the store's base currency. Shopify Markets had been returning location-based currencies, such as HKD.
- The material is now read from the description when the title doesn't include it, as with the Glow in the Dark Bundle.
- Roll size no longer picks up unrelated gram figures from descriptions (e.g. "models over 50g"). Only kilogram figures are trusted there.

## [0.0.0] - 2026-10-17

### Added

- Initial repository, README and project plan (`public_api_model.md`).

[0.4.0]: https://github.com/FundedYouth-Team/isanmate-api/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/FundedYouth-Team/isanmate-api/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/FundedYouth-Team/isanmate-api/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/FundedYouth-Team/isanmate-api/compare/v0.0.0...v0.1.0
[0.0.0]: https://github.com/FundedYouth-Team/isanmate-api/releases/tag/v0.0.0
