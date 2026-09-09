# KisanMandi AI — Crop Price & Auction Prototype

A static, Vercel-ready prototype for a hackathon/demo. It implements three role-specific workspaces:

- Farmer: crop arrival entry, AI-assisted indicative price range, bidding values, sale history, market analysis, crop suggestions.
- Authority: live mandi desk, crop records, auction close workflow, reports.
- Buyer: current price board, buying history, buyer dashboard.

## Demo credentials

Farmer: `farmer01` / `farmer123`
Authority: `authority01` / `admin123`
Buyer: `buyer01` / `buyer123`

## How the price range works

The prototype uses a transparent scoring formula instead of pretending to have a trained production model. The estimate combines:

1. Commodity baseline signal
2. Quality grade
3. Humidity fit to a crop-specific target
4. Arrival time factor
5. Lot volume factor

The UI labels the result as indicative and shows a confidence score. Replace the baseline table and formula with an authenticated historical price dataset/model before production deployment.

## Data storage

For hackathon simplicity, records and bids are stored in browser `localStorage`. That makes the demo fully functional without a backend, but data is not shared across devices/users.

## Vercel deployment

1. Put these files in a GitHub repository.
2. Import the repository into Vercel.
3. Framework preset: `Other` (or leave auto-detect).
4. Build command: leave empty.
5. Output directory: `.`
6. Deploy.

Because this is a static site, it does not need an API server.

## Production upgrade path

- Add a backend (Supabase/Firebase/Postgres) with role-based authentication.
- Store auction/bill records server-side.
- Connect an official, authenticated market-price feed (for example e-NAM/APMC data where permitted) and timestamp every observation.
- Train and validate a crop-specific price model using historical transaction data.
- Add audit logs, authority approval, buyer identity, payment reconciliation and PDF invoice generation.

## Reference sources

- e-NAM — National Agriculture Market: https://enam.gov.in/
- Pradhan Mantri Fasal Bima Yojana portal: https://pmfby.gov.in/

These references were checked on September 9, 2026. e-NAM describes its purpose as transparent price discovery across integrated agricultural markets; PMFBY demonstrates a multi-stakeholder government agriculture portal with digital workflows and dashboards.
