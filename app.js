// ---- Configuration ----
// Replace with your Google Sheet's ID (the long string in the sheet URL
// between /d/ and /edit). The sheet must be shared as "Anyone with the
// link" → Viewer. Data is read from the first tab (gid=0).
const SHEET_ID = '1AGxDtg8eQ9tA2LVlO9QW0JAqo1WgO6WnY8g9YczoRbw';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=0&headers=1`;

// ---- State ----
let columns = [];       // [{ label, type }]
let allRows = [];       // [{ [label]: { value, display } }]
let statusColumn = null;
let sortState = { key: null, dir: 'asc' };
let filterState = { search: '', status: 'all' };

const BADGE_PALETTE = ['badge-1', 'badge-2', 'badge-3', 'badge-4', 'badge-5', 'badge-6'];
const statusColorMap = new Map();

async function init() {
  try {
    const res = await fetch(SHEET_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const json = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));

    columns = json.table.cols
      .map((c, i) => ({ label: (c.label || '').trim(), type: c.type, index: i }))
      .filter(c => c.label);

    allRows = json.table.rows
      .map(row => buildRow(row))
      .filter(r => r && Object.values(r).some(cell => cell.display));

    if (!columns.length || !allRows.length) throw new Error('No data found');

    statusColumn = columns.find(c => c.label.toLowerCase() === 'status') || null;
    const dateColumn = columns.find(c => c.type === 'date' || /date/i.test(c.label));
    sortState = dateColumn
      ? { key: dateColumn.label, dir: 'desc' }
      : { key: columns[0].label, dir: 'asc' };

    if (statusColumn) assignStatusColors();

    buildHead();
    buildStatusFilter();
    render();

    document.getElementById('last-updated').textContent =
      `Data loaded ${new Date().toLocaleString()}`;
  } catch (err) {
    showError();
  }
}

function buildRow(row) {
  const result = {};
  for (const col of columns) {
    const cell = row.c[col.index];
    const value = cell ? cell.v : null;
    const display = cell && cell.f != null ? cell.f : (value != null ? String(value) : '');
    result[col.label] = {
      value: col.type === 'date' ? parseGvizDate(value) : value,
      display: col.type === 'date' ? parseGvizDate(value) : display,
    };
  }
  return result;
}

function parseGvizDate(v) {
  const m = /^Date\((\d+),(\d+),(\d+)/.exec(v || '');
  if (!m) return v == null ? '' : String(v);
  const [, y, mo, d] = m;
  return `${y}-${String(Number(mo) + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function assignStatusColors() {
  const seen = new Set();
  for (const row of allRows) {
    const val = row[statusColumn.label]?.value;
    if (val && !seen.has(val)) {
      seen.add(val);
      statusColorMap.set(val, BADGE_PALETTE[statusColorMap.size % BADGE_PALETTE.length]);
    }
  }
}

function buildHead() {
  const thead = document.getElementById('table-head');
  thead.innerHTML = '';
  const tr = document.createElement('tr');
  for (const col of columns) {
    const th = document.createElement('th');
    th.dataset.key = col.label;
    th.textContent = col.label;
    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    th.appendChild(arrow);
    th.addEventListener('click', () => {
      sortState = sortState.key === col.label
        ? { key: col.label, dir: sortState.dir === 'asc' ? 'desc' : 'asc' }
        : { key: col.label, dir: 'asc' };
      render();
    });
    tr.appendChild(th);
  }
  thead.appendChild(tr);
}

function buildStatusFilter() {
  const select = document.getElementById('status-filter');
  if (!statusColumn) {
    select.hidden = true;
    return;
  }
  const values = [...statusColorMap.keys()];
  select.innerHTML = '<option value="all">All statuses</option>' +
    values.map(v => `<option value="${escapeAttr(v)}">${escapeAttr(v)}</option>`).join('');
  select.hidden = false;
  select.addEventListener('change', e => {
    filterState.status = e.target.value;
    render();
  });
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function render() {
  const q = filterState.search.trim().toLowerCase();

  let rows = allRows.filter(row => {
    if (q) {
      const hay = columns.map(c => row[c.label]?.display || '').join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (statusColumn && filterState.status !== 'all') {
      if (row[statusColumn.label]?.value !== filterState.status) return false;
    }
    return true;
  });

  const sortCol = columns.find(c => c.label === sortState.key);
  if (sortCol) {
    rows = rows.slice().sort((a, b) => {
      const av = a[sortCol.label]?.value;
      const bv = b[sortCol.label]?.value;
      let cmp;
      if (sortCol.type === 'number') {
        cmp = (Number(av) || 0) - (Number(bv) || 0);
      } else {
        cmp = String(av ?? '').localeCompare(String(bv ?? ''));
      }
      return sortState.dir === 'asc' ? cmp : -cmp;
    });
  }

  renderBody(rows);
  updateSortArrows();

  const countEl = document.getElementById('result-count');
  countEl.textContent = `${rows.length} of ${allRows.length}`;
}

function renderBody(rows) {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  for (const row of rows) {
    const tr = document.createElement('tr');
    for (const col of columns) {
      const cell = row[col.label] || { value: '', display: '' };
      const td = document.createElement('td');

      if (/link/i.test(col.label) && cell.value) {
        td.className = 'cell-link';
        const a = document.createElement('a');
        a.href = cell.value;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = 'View ↗';
        td.appendChild(a);
      } else if (statusColumn && col.label === statusColumn.label && cell.value) {
        const span = document.createElement('span');
        span.className = `badge ${statusColorMap.get(cell.value) || 'badge-6'}`;
        span.textContent = cell.display;
        td.appendChild(span);
      } else {
        td.textContent = cell.display;
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}

function updateSortArrows() {
  document.querySelectorAll('#table-head th').forEach(th => {
    const arrow = th.querySelector('.arrow');
    if (!arrow) return;
    arrow.textContent = th.dataset.key === sortState.key
      ? (sortState.dir === 'asc' ? '↑' : '↓')
      : '';
  });
}

function showError() {
  document.querySelector('.table-wrapper').hidden = true;
  document.querySelector('.controls').hidden = true;
  const msg = document.getElementById('status-message');
  msg.hidden = false;
  msg.textContent = 'Unable to load portfolio data right now. Please refresh or check back shortly.';
}

document.getElementById('search-input').addEventListener('input', e => {
  filterState.search = e.target.value;
  render();
});

init();
