# DCF Web API (No Python)

This project provides a JavaScript/Node backend for DCF valuation, so you can plug it into your website.

## Run

```bash
npm install
npm start
```

Server runs at `http://localhost:3000`.

## API

`POST /api/dcf`

Example payload:

```json
{
  "baseRevenue": 100000,
  "revenueGrowth": 0.08,
  "ebitMargin": 0.15,
  "depAsRevenue": 0.03,
  "nwcAsRevenue": 0.12,
  "capexAsRevenue": 0.05,
  "taxRate": 0.18,
  "wacc": 0.12,
  "terminalGrowth": 0.03,
  "shares": 1000000000,
  "cash": 0,
  "debt": 0
}
```

## Embed in your website

Use fetch from your frontend:

```js
fetch('https://YOUR-DOMAIN/api/dcf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ baseRevenue: 100000 })
}).then(r => r.json()).then(console.log);
```
