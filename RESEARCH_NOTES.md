# KisanMandi AI — Research & Product Notes

## Verified public-system references (checked 9 September 2026)

### e-NAM / National Agriculture Market
Official e-NAM describes itself as a pan-India electronic trading portal that networks APMC mandis and aims to improve transparency, reduce information asymmetry and support real-time price discovery based on demand, supply and quality. This supports the prototype's auction/price-discovery workflow and quality-aware pricing concept.

Source: e-NAM, National Agriculture Market official portal — https://enam.gov.in/

### Government agriculture digital ecosystem
The Government of India's PMFBY portal describes an integrated web-based ecosystem, multiple stakeholder access and digitized workflows/data visibility. This supports separating farmer, authority and buyer views instead of giving every role the same dashboard.

Source: Ministry of Agriculture & Farmers Welfare, PMFBY official portal — https://pmfby.gov.in/

## Product decisions

### Farmer
The farmer portal prioritizes fast data entry, the resulting price band, bid/sale values, history and crop-planning suggestions. The main outcome is a readable record of what was submitted and what price was ultimately realized.

### Authority
The authority portal is designed as the operational desk: current arrivals, open auctions, records and reports. This is where initial bids and final selling prices can be entered/closed.

### Buyer
The buyer portal intentionally stays narrower: current crop prices and buying history. The production version can add a searchable lot marketplace and authenticated bidding once buyer identity and auction permissions are implemented server-side.

## Price-prediction prototype

This version intentionally avoids claiming a trained machine-learning model. Its “AI estimate” is an explainable heuristic using crop baseline, quality grade, humidity fit, arrival time and lot volume. This makes the demo deterministic and easy to audit while clearly signaling that production decisions require historical, timestamped market observations and model validation.

## Production data architecture

A production implementation should use a server-side database and authenticated role-based access control. Each price observation should carry source, location/mandi, commodity, grade/quality, timestamp and units. The model layer should be trained and validated separately from UI logic, with back-testing by crop and geography.

## Important limitation

The prices embedded in the demo are illustrative baseline values. They are not live mandi quotes and must not be presented as authoritative market prices. The UI and documentation deliberately call this out so that the prototype does not mislead users during a hackathon demonstration.
