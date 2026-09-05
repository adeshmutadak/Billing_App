import config from '../config';
import api from './axiosConfig';

/**
 * Shared client for GET /v1/api/Bill/history.
 *
 * The customer home screen and the history screen use the same endpoint and the
 * same filters. The only difference is the year they pass: home sends the
 * current one, history sends a past one.
 */

export const MONTHS = [
  { value: 1, label: 'January', short: 'Jan' },
  { value: 2, label: 'February', short: 'Feb' },
  { value: 3, label: 'March', short: 'Mar' },
  { value: 4, label: 'April', short: 'Apr' },
  { value: 5, label: 'May', short: 'May' },
  { value: 6, label: 'June', short: 'Jun' },
  { value: 7, label: 'July', short: 'Jul' },
  { value: 8, label: 'August', short: 'Aug' },
  { value: 9, label: 'September', short: 'Sep' },
  { value: 10, label: 'October', short: 'Oct' },
  { value: 11, label: 'November', short: 'Nov' },
  { value: 12, label: 'December', short: 'Dec' },
];

// Partial appears once a bill carries a PaidAmount smaller than its
// TotalPayable, so the amber entry is required or those months render with no
// background colour at all.
export const STATUS_COLORS = {
  Paid: '#2E7D32',
  Partial: '#F9A825',
  Unpaid: '#C62828',
  NoActivity: '#9E9E9E',
};

/** Human label for a month status. */
export const statusLabel = status => {
  if (status === 'NoActivity') return 'No entries';
  if (status === 'Partial') return 'Part paid';
  return status ?? '-';
};

/**
 * Image source for a customer photo.
 *
 * customers.PhotoUrl holds one of three things:
 *   "/uploads/customer/<guid>.png"  written by the current API
 *   "D:\\Projects\\...\\<guid>.png" a Windows path from an older build
 *   null                            no photo
 * Only the first can be fetched, so the other two fall back to the bundled logo.
 *
 * @param {string|null} photoUrl  the customer's photoUrl field
 * @param {*} fallback            require('.../logo.jpg')
 */
export const photoSource = (photoUrl, fallback) => {
  const path = String(photoUrl ?? '').trim();

  if (!path) {
    return fallback;
  }

  // Already absolute.
  if (/^https?:\/\//i.test(path)) {
    return { uri: path };
  }

  // Legacy rows hold a local Windows path, which the server cannot serve.
  if (/^[a-zA-Z]:\\/.test(path) || path.includes('\\')) {
    return fallback;
  }

  const suffix = path.startsWith('/') ? path : `/${path}`;
  return { uri: `${config.MEDIA_BASE_URL}${suffix}` };
};

export const money = value => `₹ ${Number(value ?? 0).toFixed(2)}`;

export const shortDate = value => {
  if (!value) {
    return '-';
  }
  const [y, m, d] = String(value).split('-');
  return `${d}/${m}/${String(y).slice(2)}`;
};

/** Year dropdown values. There is no server endpoint for this any more. */
export const yearOptions = (count = 5) => {
  const current = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => current - i);
};

// ===================== LOGGING =====================
const LOG_TAG = '[BillHistory]';

// Leave false. The full payload carries customer names, phone numbers and
// addresses, which would then sit in logcat on the device.
const LOG_FULL_PAYLOAD = false;

/** Counts only, no customer identity, so this is safe to leave switched on. */
const summarise = payload => {
  const customers = payload?.data?.customers ?? [];
  const months = customers.flatMap(c => c.months ?? []);
  return {
    customers: customers.length,
    months: months.length,
    monthsWithEntries: months.filter(m => (m.days ?? []).length > 0).length,
    days: months.reduce((n, m) => n + (m.days ?? []).length, 0),
    totals: payload?.data?.totals ?? null,
  };
};

/**
 * Fetches a year of customers, months and optionally daily entries.
 *
 * @param {object}  options
 * @param {number}  options.year             required
 * @param {number}  [options.month]          1 to 12
 * @param {boolean} [options.isPaid]         true, false, or omitted for no filter
 * @param {number}  [options.customerId]
 * @param {boolean} [options.includeDetail]  include the day list in every month
 * @param {boolean} [options.includeEmptyDays]
 * @returns {Promise<{totals: object|null, customers: array, message: string|null}>}
 */
export const fetchBillHistory = async ({
  year,
  month,
  isPaid,
  customerId,
  includeDetail = false,
  includeEmptyDays = false,
} = {}) => {
  const params = new URLSearchParams();
  params.append('year', String(year));

  if (month) {
    params.append('month', String(month));
  }
  if (isPaid !== null && isPaid !== undefined) {
    params.append('isPaid', String(isPaid));
  }
  if (customerId) {
    params.append('customerId', String(customerId));
  }
  if (includeDetail) {
    params.append('includeDetail', 'true');
  }
  if (includeEmptyDays) {
    params.append('includeEmptyDays', 'true');
  }

  const url = `${config.ENDPOINTS.BILL_HISTORY}?${params.toString()}`;
  const startedAt = Date.now();

  console.log(`${LOG_TAG} REQ GET ${config.BASE_URL}${url}`);

  try {
    const response = await api.get(url);

    console.log(`${LOG_TAG} RES ${response?.status} in ${Date.now() - startedAt}ms`, {
      url,
      success: response?.data?.success,
      message: response?.data?.message,
      ...summarise(response?.data),
    });

    if (LOG_FULL_PAYLOAD) {
      console.log(`${LOG_TAG} PAYLOAD`, JSON.stringify(response?.data, null, 2));
    }

    return {
      totals: response?.data?.data?.totals ?? null,
      customers: response?.data?.data?.customers ?? [],
      message: response?.data?.message ?? null,
    };
  } catch (err) {
    console.log(`${LOG_TAG} ERR failed in ${Date.now() - startedAt}ms`, {
      url,
      status: err.response?.status,
      code: err.code,
      message: err.response?.data?.message ?? err.message,
    });
    throw err;
  }
};

/** The month object for a given month number, or null. */
export const monthOf = (customer, month) =>
  (customer?.months ?? []).find(m => m.month === month) ?? null;
