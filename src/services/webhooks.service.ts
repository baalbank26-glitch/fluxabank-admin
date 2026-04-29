import { BASE_URL, getHeaders, handleResponse } from './config';

const buildHeaders = (): HeadersInit => {
  // Config.ts getHeaders() returns Authorization: Bearer <ADMIN_TOKEN>
  // We should start with that for Admin-secured endpoints
  const headers: any = getHeaders();

  // Optional: Attach app_id/secret for fallback or legacy endpoints
  try {
    const appId = localStorage.getItem('app_id');
    if (appId) headers['app_id'] = String(appId);
  } catch { }

  return headers;
};

export type WebhookHistoryQuery = {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  status?: string;
  url?: string;
  transactionId?: string;
  page?: number;
  pageSize?: number;
};

const trimSlash = (s: string) => s ? (s.endsWith('/') ? s.slice(0, -1) : s) : s;
const ensureLeadingSlash = (s: string) => s ? (s.startsWith('/') ? s : `/${s}`) : s;

// Resolve base and path with sensible defaults and localStorage overrides
const resolveBase = () => {
  const ls = (typeof window !== 'undefined') ? (localStorage.getItem('webhooks_api_base') || '') : '';
  // Default to the Vercel USER-SERVICE which exposes webhooks history
  const def = 'https://api.baabank.com';
  return trimSlash(ls || BASE_URL || def);
};

const resolveListPaths = (): string[] => {
  const override = (typeof window !== 'undefined') ? (localStorage.getItem('webhooks_list_path') || '') : '';
  if (override) return [ensureLeadingSlash(override)];
  // Try common candidates in order
  return [
    // New hinted endpoint
    '/webhooks',
    '/webhooks/history',
    '/admin/webhooks',
    '/webhooks/logs'
  ];
};

export const webhooksService = {
  list: async (query: WebhookHistoryQuery = {}) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
    });
    const qs = params.toString() ? `?${params.toString()}` : '';
    const base = resolveBase();
    const candidates = resolveListPaths();
    let lastError: any = null;
    for (const p of candidates) {
      try {
        const response = await fetch(`${base}${p}${qs}`, { headers: buildHeaders() });
        const json = await handleResponse(response);
        if (json) return json;
      } catch (e) {
        lastError = e;
      }
    }
    if (lastError) throw lastError;
    return null;
  },

  getHistory: async (userId: number | string, query: WebhookHistoryQuery = {}) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
    });
    const qs = params.toString() ? `?${params.toString()}` : '';
    const base = resolveBase();

    // Direct call to correct endpoint
    const response = await fetch(`${base}/webhooks/history/${userId}${qs}`, { headers: buildHeaders() });
    return handleResponse(response);
  },

  resend: async (ids: number[]) => {
    const base = resolveBase();
    const path = ensureLeadingSlash(
      (typeof window !== 'undefined' ? (localStorage.getItem('webhooks_resend_path') || '') : '')
      || '/webhooks/resend'
    );

    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ ids }),
    });
    return handleResponse(response);
  },

  triggerLedger: async (ledgerId: number) => {
    const base = resolveBase();
    const pathBase = ensureLeadingSlash(
      (typeof window !== 'undefined' ? (localStorage.getItem('webhooks_ledger_base_path') || '') : '')
      || '/webhooks/ledger'
    );
    const response = await fetch(`${base}${pathBase}/${ledgerId}`, {
      method: 'POST',
      headers: buildHeaders(),
    });
    return handleResponse(response);
  },

  mapTransaction: async (transactionId: string) => {
    const tx = String(transactionId || '').trim();
    if (!tx) return null;

    const base = resolveBase();
    const path = ensureLeadingSlash(
      (typeof window !== 'undefined' ? (localStorage.getItem('webhooks_mapper_path') || '') : '')
      || `/webhooks/mapper/${encodeURIComponent(tx)}`
    );

    const response = await fetch(`${base}${path}`, {
      headers: buildHeaders(),
    });

    return handleResponse(response);
  },
};

export type { };
