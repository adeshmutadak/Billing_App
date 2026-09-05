import config from '../config';

/**
 * Bill markup, shared by the single-customer bill and the print-all batch.
 *
 * Both use the same header, table, totals and footer, so a batch sheet and a
 * single sheet cannot drift apart. The only difference is scale: a single bill
 * fills the page, while the batch fits four customers to an A4 sheet.
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const shortDate = value => {
  if (!value) {
    return '';
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return String(value);
  }
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
};

const num = value => Number(value ?? 0);
const money = value => num(value).toFixed(2);

/**
 * Downloads a customer photo and returns it as a data URI, or null.
 *
 * The print engine snapshots the page as soon as it is laid out, so a remote
 * <img src> often captures blank. Inlining the bytes removes that race.
 *
 * Handles the three shapes customers.PhotoUrl can hold: a served path, an
 * absolute URL, and the Windows file paths left by an older build, which
 * cannot be fetched and yield null.
 */
export const fetchPhotoDataUri = async photoUrl => {
  const path = String(photoUrl ?? '').trim();

  // A Windows file path from an older build (D:...) cannot be fetched.
  if (!path || /^[a-zA-Z]:/.test(path)) {
    return null;
  }

  const url = /^https?:\/\//i.test(path)
    ? path
    : `${config.MEDIA_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();

    return await new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.log('[Bill] photo fetch failed', url, err?.message);
    return null;
  }
};

/**
 * Attaches photoDataUri to each customer, in parallel. A failed download is
 * simply null, so one unreachable photo never blocks the print job.
 */
export const withPhotos = async customers =>
  Promise.all(
    (customers ?? []).map(async c => ({
      ...c,
      photoDataUri: await fetchPhotoDataUri(c.photoUrl),
    })),
  );

/** Seven cells for one entry, or seven blanks when a half runs out. */
const cells = (item, index) =>
  item
    ? `
        <td class="c">${index + 1}</td>
        <td class="c">${shortDate(item.date)}</td>
        <td class="r">${num(item.cowLitre)}</td>
        <td class="r">${num(item.cowRate)}</td>
        <td class="r">${num(item.buffaloLitre)}</td>
        <td class="r">${num(item.buffaloRate)}</td>
        <td class="r b">${money(item.totalAmount)}</td>`
    : '<td></td><td></td><td></td><td></td><td></td><td></td><td></td>';

const HEAD_CELLS = `
        <th>Sr</th><th>Date</th><th>Cow L</th><th>Cow &#8377;</th>
        <th>Buf L</th><th>Buf &#8377;</th><th>Total</th>`;

/**
 * The entries table: the month folded in half so both halves share each row,
 * with one header line across the block.
 */
const entriesTable = entries => {
  const half = Math.ceil(entries.length / 2);
  const left = entries.slice(0, half);
  const right = entries.slice(half);

  const bodyRows = left
    .map(
      (item, i) => `
      <tr class="${i % 2 ? 'alt' : ''}">
        ${cells(item, i)}
        <td class="gap"></td>
        ${cells(right[i], half + i)}
      </tr>`,
    )
    .join('');

  return `
    <table class="entries">
      <tr>
        ${HEAD_CELLS}
        <th class="gap"></th>
        ${HEAD_CELLS}
      </tr>
      ${bodyRows}
    </table>`;
};

/** Dark band across the top: bill title on the left, brand on the right. */
const bannerBlock = () => `
    <div class="banner">
      <span class="banner-title">MILK BILL</span>
      <span class="banner-brand">${config.BRAND.name}</span>
    </div>`;

/** Customer identity and period, two columns under the banner.
 *  photoDataUri must already be inlined: a remote src is not reliably loaded
 *  before the print engine captures the page. */
const customerHead = (customer, subtitle, photoDataUri) => `
    <div class="meta">
      <div class="meta-left">
        <div class="name">${customer.name ?? ''}</div>
        <div class="line">${customer.phoneNumber ?? '-'}</div>
        ${customer.address ? `<div class="line dim">${customer.address}</div>` : ''}
      </div>

      <div class="meta-right">
        <div class="line dim">${subtitle}</div>
        <div class="line">
          Cow &#8377;${num(customer.cowRate)} &nbsp; Buffalo &#8377;${num(customer.buffaloRate)}
        </div>
      </div>

      ${
        photoDataUri
          ? `<img src="${photoDataUri}" class="logo"/>`
          : ''
      }
    </div>`;

/** Remaining and grand total, in a boxed panel on the right. */
const totalsBlock = (remainingAmount, totalAmount) => `
    <div class="totals">
      <table>
        <tr>
          <td class="lbl">Remaining</td>
          <td class="val">&#8377; ${money(remainingAmount)}</td>
        </tr>
        <tr class="grand">
          <td class="lbl">GRAND TOTAL</td>
          <td class="val">&#8377; ${money(totalAmount)}</td>
        </tr>
      </table>
    </div>`;

/** Bottom of the sheet: blank space and a rule on the left so the owner can
 *  sign by hand, the three brand values on the right, thanks centred below. */
const footerBlock = () => `
    <div class="foot">
      <div class="sign">
        <div class="sign-space"></div>
        <div class="sign-line"></div>
        <div class="sign-label">Owner's Signature</div>
      </div>

      <div class="foot-brand">
        <div class="brand-name">${config.BRAND.name}</div>
        <div class="brand-line">${config.BRAND.ownerName} &nbsp;&#183;&nbsp; ${config.BRAND.phone}</div>
      </div>
    </div>

    <div class="thanks">Thank you for your business</div>`;

/**
 * @param {number} scale  1 for a full-page bill, 0.72 for a quadrant in the
 *                        four-up batch. Everything is in pt, so one multiplier
 *                        shrinks the whole sheet consistently.
 */
const baseCss = (scale = 1) => `
    @page { size: A4 portrait; margin: 8mm; }

    * { box-sizing: border-box; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: ${(8 * scale).toFixed(2)}pt;
      color: #111;
      margin: 0;
    }

    .sheet {
      border: 1px solid #0A1F44;
      padding: 0 0 ${(6 * scale).toFixed(1)}px 0;
    }

    /* ---------- banner ---------- */
    .banner {
      background: #0A1F44;
      color: #fff;
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      padding: ${(5 * scale).toFixed(1)}px ${(8 * scale).toFixed(1)}px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .banner-title {
      font-size: ${(13 * scale).toFixed(2)}pt;
      font-weight: bold;
      letter-spacing: ${(1.5 * scale).toFixed(1)}px;
    }
    .banner-brand {
      font-size: ${(8 * scale).toFixed(2)}pt;
      letter-spacing: 0.4px;
    }

    /* ---------- customer meta ---------- */
    .meta {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: ${(5 * scale).toFixed(1)}px ${(8 * scale).toFixed(1)}px;
      border-bottom: 1px solid #0A1F44;
    }
    .meta-left { line-height: 1.3; }
    .meta-right { line-height: 1.3; text-align: right; }
    .name {
      font-size: ${(10 * scale).toFixed(2)}pt;
      font-weight: bold;
    }
    .line { font-size: ${(7.5 * scale).toFixed(2)}pt; }
    .dim { color: #555; }

    .logo {
      width: ${Math.round(42 * scale)}px;
      height: ${Math.round(42 * scale)}px;
      border-radius: ${Math.round(21 * scale)}px;
      object-fit: cover;
      border: 1px solid #0A1F44;
      margin-left: ${Math.round(8 * scale)}px;
    }

    /* ---------- entries ---------- */
    .entries {
      border-collapse: collapse;
      width: calc(100% - ${Math.round(16 * scale)}px);
      margin: ${(5 * scale).toFixed(1)}px ${(8 * scale).toFixed(1)}px 0 ${(8 * scale).toFixed(1)}px;
    }
    .entries th, .entries td {
      border: 1px solid #b9c0cb;
      padding: ${scale < 1 ? '0px 1px' : '1.5px 3px'};
      font-size: ${(7 * scale).toFixed(2)}pt;
      line-height: 1.25;
    }
    .entries th {
      background: #0A1F44;
      color: #fff;
      font-weight: bold;
      text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .entries tr.alt td { background: #f4f6f8; }
    td.c { text-align: center; }
    td.r { text-align: right; }
    td.b { font-weight: bold; }

    /* Borderless spacer between the two halves of the month. */
    .gap {
      border: none !important;
      background: #fff !important;
      width: ${Math.round(8 * scale)}px;
      padding: 0;
    }

    /* ---------- totals ---------- */
    .totals {
      display: flex;
      justify-content: flex-end;
      margin: ${(5 * scale).toFixed(1)}px ${(8 * scale).toFixed(1)}px 0 0;
    }
    .totals table {
      border-collapse: collapse;
      width: auto;
      border: 1px solid #0A1F44;
    }
    .totals td {
      padding: ${(2 * scale).toFixed(1)}px ${(6 * scale).toFixed(1)}px;
      font-size: ${(8 * scale).toFixed(2)}pt;
    }
    .totals .lbl { text-align: right; color: #333; }
    .totals .val {
      text-align: right;
      font-weight: bold;
      min-width: ${Math.round(66 * scale)}px;
    }
    .totals .grand td {
      background: #0A1F44;
      color: #fff;
      font-size: ${(9.5 * scale).toFixed(2)}pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .totals .grand .lbl { color: #dfe4ec; letter-spacing: 0.4px; }

    /* ---------- footer ---------- */
    .foot {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin: ${(6 * scale).toFixed(1)}px ${(8 * scale).toFixed(1)}px 0 ${(8 * scale).toFixed(1)}px;
      padding-top: ${(4 * scale).toFixed(1)}px;
      border-top: 1px solid #b9c0cb;
    }

    /* Signing area. sign-space is deliberately empty: it is the room the pen
       needs, so the rule underneath is not pressed against the totals above. */
    .sign { width: ${Math.round(150 * scale)}px; }
    .sign-space { height: ${Math.round(26 * scale)}px; }
    .sign-line {
      border-bottom: 1px solid #0A1F44;
      width: 100%;
    }
    .sign-label {
      margin-top: ${(2 * scale).toFixed(1)}px;
      font-size: ${(7 * scale).toFixed(2)}pt;
      color: #555;
    }

    .foot-brand { text-align: right; line-height: 1.25; }
    .brand-name {
      font-size: ${(8.5 * scale).toFixed(2)}pt;
      font-weight: bold;
      color: #0A1F44;
      letter-spacing: 0.3px;
    }
    .brand-line {
      font-size: ${(7 * scale).toFixed(2)}pt;
      color: #555;
    }

    .thanks {
      text-align: center;
      font-size: ${(7 * scale).toFixed(2)}pt;
      color: #555;
      font-style: italic;
      margin-top: ${(4 * scale).toFixed(1)}px;
    }`;

/**
 * One customer, filling the page. Used by the Print Bill screen.
 */
export const singleCustomerBillHtml = ({
  customer,
  entries = [],
  remainingAmount = 0,
  subtitle,
}) => {
  const totalAmount = entries.reduce((sum, e) => sum + num(e.totalAmount), 0);
  const line =
    subtitle ??
    `INV-${Date.now()} &nbsp;&#183;&nbsp; ${new Date().toLocaleDateString('en-GB')}`;

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>${baseCss(1)}</style>
      </head>
      <body>
        <div class="sheet">
          ${bannerBlock()}
          ${customerHead(customer, line, customer.photoDataUri)}
          ${entriesTable(entries)}
          ${totalsBlock(remainingAmount, totalAmount)}
          ${footerBlock()}
        </div>
      </body>
    </html>`;
};

/**
 * Every customer's bill for one month, four to an A4 sheet in a 2x2 grid.
 *
 * Feed it the customers array from GET /Bill/history with includeDetail=true,
 * which already carries each month's days.
 */
export const allCustomersBillHtml = ({
  customers = [],
  month,
  year,
  skipEmpty = true,
}) => {
  const monthLabel = `${MONTH_NAMES[month - 1] ?? ''} ${year}`;

  const blocks = customers
    .map(c => {
      const m = (c.months ?? []).find(x => x.month === month) ?? null;
      const entries = (m?.days ?? []).filter(d => d.entryId != null);
      return { customer: c, month: m, entries };
    })
    .filter(b => (skipEmpty ? b.entries.length > 0 : true))
    .map(
      b => `
        <div class="cell">
          <div class="sheet">
            ${bannerBlock()}
            ${customerHead(b.customer, monthLabel, b.customer.photoDataUri)}
            ${entriesTable(b.entries)}
            ${totalsBlock(
              b.month?.remainingAmount ?? 0,
              b.month?.totalAmount ??
                b.entries.reduce((s, e) => s + num(e.totalAmount), 0),
            )}
            ${footerBlock()}
          </div>
        </div>`,
    );

  if (blocks.length === 0) {
    return `
      <html><head><meta charset="utf-8"/><style>${baseCss(1)}</style></head>
      <body><div class="sheet">${bannerBlock()}
        <div class="foot"><div class="foot-note">
          No customers with entries for ${monthLabel}.
        </div></div>
      </div></body></html>`;
  }

  // Four to a page: two across, two down, then a hard page break.
  const pages = [];
  for (let i = 0; i < blocks.length; i += 4) {
    pages.push(`<div class="page">${blocks.slice(i, i + 4).join('')}</div>`);
  }

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          ${baseCss(0.72)}

          .page {
            display: flex;
            flex-wrap: wrap;
            align-content: flex-start;
            page-break-after: always;
            break-after: page;
          }
          .page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          /* Two across, two down. The 49.6% leaves room for the gap without
             a third block ever wrapping onto the row. */
          .cell {
            width: 49.6%;
            padding: 2px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .cell .sheet { height: 100%; }
        </style>
      </head>
      <body>
        ${pages.join('')}
      </body>
    </html>`;
};

export default {
  singleCustomerBillHtml,
  allCustomersBillHtml,
  fetchPhotoDataUri,
  withPhotos,
};
