# Legend Lifestyle — Aera parent-company Firebase setup

Legend Lifestyle is a store/brand operated under Aera. The existing Firebase project `aera-s-store` is used for Firebase Authentication and Realtime Database; no new project is required.

## Architecture

- `firebase-config.js` contains the Firebase web-app config. Web config values are public identifiers, not admin credentials.
- `admin/login.html` uses Firebase Authentication email/password.
- `admin/admin-guard.js` requires a trusted Firebase custom claim `admin: true`.
- `database.rules.json` denies access by default. Admins can manage `/products`; visitors can read `/storefrontProducts`, the public mirror intended to contain active products only.
- Never put service-account JSON, private keys, or Firebase Admin SDK credentials in the repository or browser.

## One-time setup

1. In Firebase Console for `aera-s-store`, enable Authentication → Sign-in method → Email/Password and create the intended admin account.
2. In Realtime Database → Rules, publish the rules in `database.rules.json`. Review them first; do not enable public writes.
3. On a trusted computer, install project dependencies with `npm install`. Create a service-account key through Firebase Console → Project settings → Service accounts, store the JSON outside this repository, and set `GOOGLE_APPLICATION_CREDENTIALS` to that local file path. Never upload or commit the key.
4. Run `node scripts/set-admin-claim.mjs admin@example.com` using the exact email of the intended admin. This uses Firebase Admin SDK to set `admin: true`. Sign out and back in so the ID token refreshes.
5. In Firebase Authentication → Settings → Authorized domains, ensure your deployed domain is listed.
6. Deploy the repository to Vercel as a static site with the repository root as output directory. Firebase rules, not a hidden frontend route, enforce database permissions.
7. Test with separate admin and non-admin accounts. Confirm active products appear on the storefront, draft products remain private, and non-admin writes are denied.

## Product data

`/products/{id}` is the admin catalogue. `/storefrontProducts/{id}` is the public mirror for active products. Admin creates/deletes mirror entries atomically. Do not manually write to the public node.

## Limits

- Product listing, creation and deletion use Firebase when configured. Orders, customers, sales metrics, discounts, checkout and payments remain demo-only.
- The storefront uses sample products only when Firebase config is absent. If a configured Firebase read fails, it hides the catalogue rather than showing sample items. Verify the Firebase connection before launch.
- CI checks source syntax/tests only; they do not validate your live Firebase project or deployed security rules.

## Local preview

Run `python -m http.server 4173` and open `http://localhost:4173`. Use a local web server rather than opening the HTML file directly.