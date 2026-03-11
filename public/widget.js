function getNum(id) {
  return Number(document.getElementById(id).value || 0);
}

async function runDcf() {
  const payload = {
    baseRevenue: getNum('baseRevenue'),
    revenueGrowth: getNum('revenueGrowth'),
    ebitMargin: getNum('ebitMargin'),
    depAsRevenue: getNum('depAsRevenue'),
    nwcAsRevenue: getNum('nwcAsRevenue'),
    capexAsRevenue: getNum('capexAsRevenue'),
    taxRate: getNum('taxRate'),
    wacc: getNum('wacc'),
    terminalGrowth: getNum('terminalGrowth'),
    shares: getNum('shares'),
    cash: getNum('cash'),
    debt: getNum('debt'),
  };

  const response = await fetch('/api/dcf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  document.getElementById('out').textContent = JSON.stringify(data, null, 2);
}

document.getElementById('run').addEventListener('click', runDcf);
