# Legend Lifestyle

An original, responsive storefront concept for a consumer technology and lifestyle brand. The visual direction uses editorial typography, muted natural colours, product illustrations built with CSS, and a lightweight vanilla JavaScript shopping-bag demo. It is inspired by broad modern ecommerce patterns, not a copy of another store's code or protected assets.

## Preview locally

This is a static HTML/CSS/JavaScript project. You can open `index.html` directly or serve the folder with a local static server:

```bash
python -m http.server 4173
```

Then visit `http://localhost:4173`. The storefront is the root `index.html`; the draft policy page is `policies.html`; the admin prototype is in `admin/`.

## Included

- Responsive landing page and collection sections
- Demo product cards, category filters, search overlay, wishlist state and shopping-bag drawer
- Draft shipping, privacy and terms page with explicit pre-launch notes
- Separate admin prototype with browser-local demo data
- Static hosting configuration for Vercel

## Important production gaps

This repository is a front-end prototype, not a production ecommerce backend or a Shopify replacement. Cart, wishlist and admin demo data are stored only in the current browser session/local storage; they are not shared between customers or devices. There is no real checkout, payment processing, customer account, inventory service, order database, transactional email, or secure server-side admin authentication yet.

Before accepting real orders:
1. Connect a backend/database and validate all product prices and stock server-side.
2. Integrate a reputable payment provider using its hosted/secure checkout; never collect or store raw card details in this frontend.
3. Implement server-side authentication, role checks, audit logs, and access controls for the admin.
4. Configure shipping, returns, support contacts, privacy disclosures and final legal terms for the actual business.
5. Replace sample products/prices with verified catalogue information and add real product photography that you own or are licensed to use.
6. Set environment variables only in the hosting provider's project settings; never commit secrets.
7. Test mobile layout, accessibility, security, payment success/failure, stock updates, refunds, and order emails.

## Deploy on Vercel

Import this repository in Vercel and choose **Other** / static site. No build command is required; use the repository root as the output directory. The included `vercel.json` provides basic security headers. This configuration has not yet been verified by a Vercel build or deployment.

## Backend foundation (not yet connected to the admin UI)

A starter Supabase/Postgres schema and a Vercel serverless product API are included:

- `supabase/schema.sql` — products table, input constraints, updated-at trigger, and row-level security (RLS).
- `api/admin/products.js` — GET/POST/PATCH/DELETE product operations; verifies the Supabase access token, requires trusted `app_metadata.role = "admin"`, validates input, and keeps service-role access on the server.
- `.env.example` — names of the Vercel environment variables needed.

### Setup checklist

1. Create your own Supabase project and run `supabase/schema.sql` in its SQL editor after reviewing it.
2. In Vercel Project Settings → Environment Variables, set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Never put the service-role key in frontend code or commit real secrets.
3. Create the intended admin user in Supabase Auth, then assign `app_metadata.role = "admin"` through a trusted server/admin workflow. Do not trust a role supplied through user-editable metadata.
4. Deploy the Vercel project and test unauthenticated requests (must return 401), signed-in non-admin requests (must return 403), and authorized admin CRUD flows.
5. Integrate the admin UI with Supabase sign-in and `/api/admin/products`; the current `admin/` UI is still a local demo and does not call this API.
6. Add persistent audit-event writes, rate limiting, backup/restore, monitoring, and a review of privacy/data-retention requirements before production use.

No Supabase project has been created, no credentials have been configured, and the API has not yet been tested against a live database. The API is a foundation, not a complete production admin system. Payments and checkout remain disconnected.
