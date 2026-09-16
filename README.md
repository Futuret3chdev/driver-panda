# Driver Panda

iPhone-first command center for people who drive **Uber**, **Dasher (DoorDash)**, and **Hello Panda (HungryPanda / DeliveryPanda)** in the same shift.

Add it to your iPhone Home Screen and it behaves like a native app: one tap to go live on each platform, log every drop, and see combined pay after mileage.

**Not affiliated with Uber, DoorDash, HungryPanda, or Hello Panda.** Those companies do not publish a public driver API, so Driver Panda does not log into their accounts or scrape offers. You track trips here and jump into the official apps for dispatch.

## iPhone install

1. Open the site in **Safari** (not Chrome in-app browsers).
2. Tap **Share** → **Add to Home Screen**.
3. Open **Driver Panda** from the home screen.

## What it does

- Combined today / week / month earnings across Uber, Dasher, and Hello Panda
- One-tap **Open app** / App Store links for each driver app
- Live / offline toggles with a shift timer
- Trip + expense log, CSV and JSON export
- IRS mileage estimate (72.5¢/mi Jan–Jun 2026, **76¢/mi from Jul 1 2026**)
- HTTP API for Shortcuts and scripts

## API

Stateless compute API. Your trip history stays on the phone.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| GET | `/api/v1/platforms` | Uber, Dasher, Hello Panda |
| POST | `/api/v1/preview` | Enrich one trip (gross, mileage, hourly) |
| POST | `/api/v1/summary` | Summarize `{ trips, expenses }` |
| GET | `/api/v1/openapi` | OpenAPI snippet |

```bash
curl -s https://YOUR_DOMAIN/api/v1/preview \
  -H 'content-type: application/json' \
  -d '{"platform":"panda","fare":12.5,"tip":3,"miles":4.2,"minutes":18}'
```

## Local

```bash
npm install
npm test
npm run dev
```

Then open the Vite URL on your phone, or use Safari with the machine’s LAN address.

## Stack

Vite PWA + Vercel serverless functions. Data is stored in `localStorage` on the device so it works offline after the first load.
