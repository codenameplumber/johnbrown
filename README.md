# John Brown Art & Design: website (phase 1)

A responsive HTML/CSS/JS site for a **US-based** clothing art, branding and menswear business. Prices are in US dollars, print sizes in inches, and checkout takes a US shipping address.

- **Design studio**: customers pick a T-shirt, polo, hoodie, cap or tote, choose a color, add art from the gallery, their own upload or text, then drag, resize and rotate it on the front and back. The price updates live, with the print size worked out from the design in inches, bulk discounts, a 2XL-and-up extra and an artwork setup fee.
- **Shop**: suits, shirts, polos, caps and beanies, with categories, search, sorting and product pages.
- **Cart and checkout**: custom prints and shop items together. Ship to a US address (street, apt, city, state, ZIP) with flat-rate shipping and free shipping over a set amount, or choose local pickup. Optional sales tax. Then **Send order on WhatsApp**: the order is saved and WhatsApp opens with the full order typed out.
- **Admin** (`/admin`): login, dashboard, **Printing orders** (design review: front/back preview, full-size view, the art, text, fonts and colors used, the customer's uploaded file, print-ready PNG and mockup downloads), **Shop orders**, sales (any date range or a single day, printing vs shop, chart, CSV), products, print prices, art gallery, and profile & settings (WhatsApp number, shipping fee, free-shipping amount, pickup fee, sales tax rate, categories, backup).
- **Tables**: every admin table has sortable columns, page numbers and a rows-per-page choice. On phones it stays a table: it scrolls sideways and the first column stays pinned.

## Run it

The studio loads art files with `fetch`, so open the site through a local web server, not by double-clicking `index.html`:

```bash
python -m http.server 5520
```

Then open http://localhost:5520 (or use the `johnbrown` entry in `.claude/launch.json`).

## Admin login (phase 1)

The starting login is set in `assets/js/seed.js` (`JB.SEED_ADMIN`). While it is still in use, the sign-in page shows it in a **Demo login** box with copy buttons and a **Fill in for me** button. Once the password is changed under **Admin > Profile & settings**, the box disappears.

Phase 1 keeps everything in the browser's `localStorage`, so the login is only a front-end lock, and orders exist only in the browser that placed them. That is fine for showing the client. It is **not** ready for real customers until phase 2.

## First things the owner should do in admin

1. **Profile & settings**: set the real WhatsApp number (US numbers can be typed as `(212) 555-0123`), the shipping fee, the free-shipping amount, the sales tax rate for the store's state, the pickup address and contact details.
2. **Print prices**: replace the sample USD prices (garment blanks, print sizes in inches, bulk levels, setup and 2XL+ fees).
3. **Products**: replace the sample products and stock photos with real ones.
4. **Art gallery**: upload his own designs for the studio.
5. **Profile & settings > Remove sample orders** once real orders start coming in.

## Folder map

```
index.html  studio.html  shop.html  product.html  cart.html  order.html
admin/      login, index (dashboard), print-orders, shop-orders, sales, products, pricing, gallery, settings
            (orders.html only forwards old links to the right orders page)
assets/
  css/      site.css (brand + shared), pages.css, studio.css, admin.css
  js/       seed.js (sample data)  store.js (data layer: the phase-2 seam)
            ui.js (header/footer/toasts)  garments.js (garment drawings + print areas)
            design-render.js (mockups + print files)  studio.js  cart.js  home.js
  js/admin/ common.js (shell, guard, DataTable)  orders.js (both order pages)  products.js  pricing.js  sales.js
  logo/     jb-mark.svg, jb-logo-light.svg (dark backgrounds), jb-logo-ink.svg (light backgrounds)
  art/      starter studio art (original single-color SVGs)
  img/      free Unsplash photos (US settings), see CREDITS.md
```

## Phase 2 (to go live)

Swap the bodies of the functions in `assets/js/store.js` for `fetch()` calls to a small PHP + MySQL API. Every page already `await`s them, so nothing else needs to change. Phase 2 adds:

- orders saved on the server, so the admin sees orders from every customer's phone
- design files stored on the server, so the WhatsApp message's "Design previews" link works for the owner
- real admin login (sessions, hashed passwords)
- uploaded product photos stored as files instead of in the browser

## Notes

- Prices are in US dollars. The sample prices are placeholders, not market research, so the owner should set his own.
- Sales tax is a single rate set in admin. Rules differ by state (and by what is sold), so the owner should confirm the right rate with his accountant.
- The reference mockups said "JOHN BOWEN". The brand used everywhere here is **John Brown**.
- Libraries load from CDNs with pinned versions: Fabric.js 5.3.1 (studio), Tabler Icons 3.19.0, and Google Fonts.
