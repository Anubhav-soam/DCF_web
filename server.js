const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DEFAULTS = {
  revenueGrowth: 0.08,
  ebitMargin: 0.15,
  depAsRevenue: 0.03,
  nwcAsRevenue: 0.12,
  capexAsRevenue: 0.05,
  taxRate: 0.18,
  wacc: 0.12,
  terminalGrowth: 0.03,
  shares: 1000000000,
  cash: 0,
  debt: 0,
};

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildForecast(input) {
  const years = [1, 2, 3, 4, 5];
  const revenue = [toNumber(input.baseRevenue, 0)];

  for (let i = 0; i < years.length; i += 1) {
    revenue.push(revenue[i] * (1 + input.revenueGrowth));
  }

  const rows = years.map((year, idx) => {
    const rev = revenue[idx + 1];
    const ebit = rev * input.ebitMargin;
    const nopat = ebit * (1 - input.taxRate);
    const dep = rev * input.depAsRevenue;
    const capex = rev * input.capexAsRevenue;
    const nwc = rev * input.nwcAsRevenue;
    const prevNwc = revenue[idx] * input.nwcAsRevenue;
    const deltaNwc = nwc - prevNwc;
    const fcff = nopat + dep - capex - deltaNwc;

    return { year, revenue: rev, ebit, nopat, dep, capex, deltaNwc, fcff };
  });

  return rows;
}

function discountCashFlows(rows, wacc, terminalGrowth) {
  const discounted = rows.map((r, idx) => {
    const pv = r.fcff / (1 + wacc) ** (idx + 1);
    return { ...r, pv };
  });

  const terminalFcff = rows[rows.length - 1].fcff * (1 + terminalGrowth);
  const terminalValue = terminalFcff / (wacc - terminalGrowth);
  const terminalPv = terminalValue / (1 + wacc) ** rows.length;
  const pvSum = discounted.reduce((sum, r) => sum + r.pv, 0);

  return { discounted, terminalValue, terminalPv, enterpriseValue: pvSum + terminalPv };
}

function sensitivity(rows, base, stepWacc = 0.01, stepTg = 0.005) {
  const waccValues = [];
  const tgValues = [];

  for (let i = -2; i <= 2; i += 1) {
    waccValues.push(Number((base.wacc + i * stepWacc).toFixed(4)));
  }
  for (let i = -2; i <= 2; i += 1) {
    tgValues.push(Number((base.terminalGrowth + i * stepTg).toFixed(4)));
  }

  const table = tgValues.map((tg) => {
    return waccValues.map((wacc) => {
      if (wacc <= tg) return null;
      const { enterpriseValue } = discountCashFlows(rows, wacc, tg);
      const equityValue = enterpriseValue + base.cash - base.debt;
      return Number((equityValue / base.shares).toFixed(2));
    });
  });

  return { waccValues, tgValues, table };
}

app.post('/api/dcf', (req, res) => {
  const input = {
    baseRevenue: toNumber(req.body.baseRevenue, 100000),
    revenueGrowth: toNumber(req.body.revenueGrowth, DEFAULTS.revenueGrowth),
    ebitMargin: toNumber(req.body.ebitMargin, DEFAULTS.ebitMargin),
    depAsRevenue: toNumber(req.body.depAsRevenue, DEFAULTS.depAsRevenue),
    nwcAsRevenue: toNumber(req.body.nwcAsRevenue, DEFAULTS.nwcAsRevenue),
    capexAsRevenue: toNumber(req.body.capexAsRevenue, DEFAULTS.capexAsRevenue),
    taxRate: toNumber(req.body.taxRate, DEFAULTS.taxRate),
    wacc: toNumber(req.body.wacc, DEFAULTS.wacc),
    terminalGrowth: toNumber(req.body.terminalGrowth, DEFAULTS.terminalGrowth),
    shares: toNumber(req.body.shares, DEFAULTS.shares),
    cash: toNumber(req.body.cash, DEFAULTS.cash),
    debt: toNumber(req.body.debt, DEFAULTS.debt),
  };

  if (input.wacc <= input.terminalGrowth) {
    return res.status(400).json({ ok: false, error: 'wacc must be greater than terminalGrowth' });
  }
  if (input.shares <= 0) {
    return res.status(400).json({ ok: false, error: 'shares must be greater than 0' });
  }

  const forecast = buildForecast(input);
  const discounted = discountCashFlows(forecast, input.wacc, input.terminalGrowth);
  const equityValue = discounted.enterpriseValue + input.cash - input.debt;
  const valuePerShare = equityValue / input.shares;
  const sensitivityMatrix = sensitivity(forecast, input);

  return res.json({
    ok: true,
    data: {
      assumptions: input,
      forecast,
      discounted,
      valuation: {
        enterpriseValue: discounted.enterpriseValue,
        equityValue,
        valuePerShare,
      },
      sensitivity: sensitivityMatrix,
    },
  });
});

app.get('/api/health', (_, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`DCF server listening on http://localhost:${port}`);
});
