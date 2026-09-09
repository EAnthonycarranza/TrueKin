/**
 * Minimal RFC 4180 CSV reader/writer.
 *
 * Written by hand rather than pulled in as a dependency because the shape we
 * need is small and the failure modes matter: order exports carry addresses and
 * free-text pickup notes, which routinely contain commas, quotes and newlines.
 * A naive `split(',')` corrupts exactly the rows an admin most wants to keep.
 *
 * Conventions:
 *   • Fields containing a comma, quote, CR or LF are wrapped in double quotes,
 *     and inner quotes are doubled ("" ).
 *   • Rows are joined with CRLF, which is what Excel expects.
 *   • A leading UTF-8 BOM is emitted so Excel opens accented text correctly,
 *     and stripped on read so the first header is not called "﻿orderId".
 */

const BOM = '﻿';

function escapeCell(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * @param {Array<object>} rows
 * @param {Array<{key: string, label?: string}>} columns
 */
function toCsv(rows, columns) {
  const header = columns.map((c) => escapeCell(c.label || c.key)).join(',');
  const body = rows.map((row) => columns.map((c) => escapeCell(row[c.key])).join(','));
  return BOM + [header, ...body].join('\r\n') + '\r\n';
}

/**
 * Parse CSV text into an array of objects keyed by the header row.
 *
 * Hand-rolled state machine rather than a regex: a quoted field may contain
 * the delimiter, a line break, or an escaped quote, none of which a line-based
 * split survives.
 */
function parseCsv(text) {
  const input = String(text || '').replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  // Tracks whether the current field was quoted, so an empty quoted field ("")
  // is distinguishable from a genuinely absent one.
  let sawContent = false;

  const endField = () => { row.push(field); field = ''; sawContent = false; };
  const endRow = () => {
    endField();
    // Skip blank lines — trailing newlines are normal and are not empty orders.
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
  };

  while (i < input.length) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i += 1; continue;
      }
      field += char; i += 1; continue;
    }

    if (char === '"' && !sawContent) { inQuotes = true; sawContent = true; i += 1; continue; }
    if (char === ',') { endField(); i += 1; continue; }
    if (char === '\r') { i += 1; continue; }       // CRLF and lone CR both end a row
    if (char === '\n') { endRow(); i += 1; continue; }

    field += char; sawContent = true; i += 1;
  }
  // A file that does not end in a newline still has a final row to flush.
  if (field !== '' || row.length) endRow();

  if (!rows.length) return { headers: [], records: [] };

  const headers = rows[0].map((h) => h.trim());
  const records = rows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, index) => { record[header] = cells[index] ?? ''; });
    return record;
  });
  return { headers, records };
}

module.exports = { toCsv, parseCsv };
