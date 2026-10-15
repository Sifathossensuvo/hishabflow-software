# HisabFlow

Simple business management for small shops in Bangladesh: products, stock, sales, customers, baki (due), expenses, suppliers, reports, invoices and AI insights. React + Vite + Tailwind on the front, Node + Express + MongoDB on the back.

## Run it

You need Node 18.11+ and MongoDB (local, or a free MongoDB Atlas cluster).

```bash
npm run install:all            # installs server + client
cp server/.env.example server/.env   # then edit MONGODB_URI / JWT_SECRET if needed
npm run seed                   # optional: demo shop with 45 days of data
npm run dev:server             # API on http://localhost:5000
npm run dev:client             # app on http://localhost:5173  (second terminal)
```

Demo login after seeding: `demo@hisabflow.app` / `demo1234` (Business plan, so every feature is visible).
Staff login: `staff@hisabflow.app` / `demo1234`.

Production: `npm run build`, then `NODE_ENV=production npm start`. The API serves `client/dist` itself, so one server is enough. In production set a real `JWT_SECRET` (32+ chars) and `ALLOW_PLAN_SWITCH=false`.

## How it is organised

```
server/src
  config/       env, plans (single source of truth for Free/Pro/Business)
  models/       Mongoose schemas, every record has a `business` field
  middleware/   auth (JWT, roles, plan gates), error handling
  modules/      one routes file per area (products, sales, customers, ...)
  services/     the logic that must stay consistent: sales, payments, purchases, stock, insights
  seed.js       demo data, built through the same services as the app
client/src
  lib/          api wrapper, formatting (৳, lakh/crore grouping, Dhaka time), small i18n
  context/      auth, language, toasts + confirm dialogs
  components/   UI kit, app shell, forms
  pages/        one file per screen
```

## Rules the code enforces

- **Tenant isolation:** `protect` loads the user and their business; every query filters by `req.businessId`. IDs from the URL are always combined with it.
- **Stock and money stay in sync:** stock is changed with one atomic conditional update (cannot go below 0, even with two sales at once). Customer/supplier balances and per-invoice "due" are updated with rounded `$inc` pipelines. Baki payments are applied to the oldest unpaid invoices first. If a step fails, earlier steps are rolled back.
- **No accidental deletion:** products, customers and suppliers are archived, sales are cancelled (stock and balances reversed, invoice kept), customers/suppliers with baki cannot be removed. Every destructive button asks first.
- **Plans:** limits and features live in `server/src/config/plans.js` and are enforced on the server (`requireFeature`, product limit). The UI reads them from `/auth/me`.
- **Validation:** every input goes through `utils/validate.js`, which rejects objects (blocks NoSQL operator injection). Passwords use bcrypt (cost 12), logins and API calls are rate limited, `helmet` is on.

## Connecting a real AI model

`server/src/services/insights/` builds a small set of numbers (`context.js`), turns them into tips with built-in rules (`rules.js`), and has a stub (`llm.js`) for a real model. Set `AI_PROVIDER=llm`, add `LLM_API_KEY`, and implement `generate()` in `llm.js`. If it returns `null` or throws, the rule-based tips are used, so the page never breaks.

## Payments (bKash / Nagad)

Subscriptions are not connected to a payment gateway. `POST /api/settings/subscription` switches plans directly, only while `ALLOW_PLAN_SWITCH=true`. For launch, remove that route's direct switch and change plans from a verified payment webhook instead.

## Known limits of this version

- Not built yet (shown as "Soon" in the plan cards): branch-wise analytics, advanced inventory (batches/expiry), advanced billing, business notifications, SMS/email reminders. Branches can be created but are not yet selectable on a sale.
- Export is CSV (opens in Excel/Sheets). PDF is done with the browser's Print / Save as PDF.
- Login token is kept in `localStorage`. For higher security move it to an httpOnly cookie with CSRF protection.
- Money is stored as taka with 2 decimals and rounded on every write.
- Only a few labels are translated to Bangla (navigation, dashboard, common buttons). The dictionary is in `client/src/lib/i18n.js`; add keys and use `t('key')` to translate more screens.
