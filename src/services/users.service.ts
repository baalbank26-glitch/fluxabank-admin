import { User } from '../types/index';
import { BASE_URL, getHeaders, handleResponse } from './config';

const extractUserRows = (json: any): User[] => {
  const candidates = [
    json?.data,
    json?.data?.items,
    json?.data?.rows,
    json?.items,
    json?.rows,
    json?.users,
  ];

  const rows = candidates.find((c) => Array.isArray(c));
  return Array.isArray(rows) ? rows : [];
};

const extractPágination = (json: any) => {
  const meta =
    json?.pagination ||
    json?.meta ||
    json?.data?.pagination ||
    json?.data?.meta ||
    {};

  const page = Number(meta.page ?? meta.currentPage ?? meta.current_page ?? 1);
  const totalPages = Number(meta.totalPages ?? meta.total_pages ?? meta.lastPage ?? meta.last_page ?? 0);
  const total = Number(meta.total ?? meta.totalItems ?? meta.total_items ?? 0);
  const hasNext =
    typeof meta.hasNext === 'boolean'
      ? meta.hasNext
      : typeof meta.has_next === 'boolean'
        ? meta.has_next
        : totalPages > 0
          ? page < totalPages
          : undefined;

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 0,
    total: Number.isFinite(total) && total > 0 ? total : 0,
    hasNext,
  };
};

const userKey = (u: User): string => {
  const anyUser = u as any;
  if (anyUser?.id !== undefined && anyUser?.id !== null) return `id:${String(anyUser.id)}`;
  if (anyUser?.email) return `email:${String(anyUser.email).toLowerCase()}`;
  return JSON.stringify(u);
};

export const usersService = {
  list: async (): Promise<User[]> => {
    const pageSize = 200;
    const buildUrl = (page: number) => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      params.set('pageSize', String(pageSize));
      return `${BASE_URL}/admin/users?${params.toString()}`;
    };

    const firstResponse = await fetch(buildUrl(1), { headers: getHeaders() });
    const firstJson = await handleResponse(firstResponse);
    const firstRows = extractUserRows(firstJson);
    if (!firstRows.length) return [];

    const firstMeta = extractPágination(firstJson);
    const collected = [...firstRows];
    const seen = new Set(collected.map(userKey));

    const shouldPáginate =
      firstMeta.hasNext === true ||
      firstMeta.totalPages > 1 ||
      (firstMeta.total > 0 && firstMeta.total > firstRows.length);

    if (!shouldPáginate) return collected;

    let page = Math.max(2, firstMeta.page + 1);
    const maxPages = 200;

    while (page <= maxPages) {
      const response = await fetch(buildUrl(page), { headers: getHeaders() });
      const json = await handleResponse(response);
      const rows = extractUserRows(json);

      if (!rows.length) break;

      let newItems = 0;
      for (const row of rows) {
        const key = userKey(row);
        if (!seen.has(key)) {
          seen.add(key);
          collected.push(row);
          newItems += 1;
        }
      }

      // If backend ignores page parameter and returns the same first page, stop.
      if (newItems === 0) break;

      const meta = extractPágination(json);
      if (meta.total > 0 && collected.length >= meta.total) break;
      if (meta.totalPages > 0 && page >= meta.totalPages) break;
      if (meta.hasNext === false) break;

      page += 1;
    }

    return collected;
  },

  get: async (id: string | number): Promise<User> => {
    const response = await fetch(`${BASE_URL}/admin/users/${id}`, { headers: getHeaders() });
    const json = await handleResponse(response);
    return json?.data || null;
  },

  getLinkedAccounts: async (id: string | number) => {
    const response = await fetch(`${BASE_URL}/admin/users/${id}/linked-accounts`, { headers: getHeaders() });
    const json = await handleResponse(response);
    return json?.data || null;
  },

  updateDocStatus: async (id: string | number, status: string, notes: string = '') => {
    const response = await fetch(`${BASE_URL}/admin/users/${id}/doc-status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, notes }),
    });
    const json = await handleResponse(response);
    return json?.data || null;
  },

  getFees: async (id: string | number) => {
    const response = await fetch(`${BASE_URL}/admin/users/${id}/fees`, {
      headers: getHeaders(),
    });
    const json = await handleResponse(response);
    return json?.data || null;
  },

  updateFees: async (
    id: string | number, 
    pixInPercent: number, 
    pixOutPercent: number,
    pixInFeeType: string = 'PERCENT',
    pixInFeeValue: number = 0,
    pixOutFeeType: string = 'PERCENT',
    pixOutFeeValue: number = 0,
    otcFeePercentage: number | null = null
  ) => {
    const response = await fetch(`${BASE_URL}/admin/users/${id}/fees`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ 
        pixInPercent, 
        pixOutPercent,
        pixInFeeType,
        pixInFeeValue,
        pixOutFeeType,
        pixOutFeeValue,
        otcFeePercentage
      }),
    });
    const json = await handleResponse(response);
    return json?.data || null;
  },

  getProvider: async (id: string | number) => {
    const response = await fetch(`${BASE_URL}/admin/users/${id}/provider`, {
      headers: getHeaders(),
    });
    const json = await handleResponse(response);
    // Retorna o provider (pode ser um objeto Provider ou apenas o ID)
    return json?.data || null;
  },

  updateProvider: async (id: string | number, providerCode: string) => {
    const response = await fetch(`${BASE_URL}/admin/users/${id}/provider`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ provider: providerCode }),
    });
    const json = await handleResponse(response);
    // Backend retorna { ok: true, userId, provider } diretamente, não dentro de data
    return json || null;
  },

  updateConfig: async (
    id: string | number, 
    webhookUrl: string, 
    webhookUrlPixIn: string, 
    webhookUrlPixOut: string, 
    refundApiRoute: string,
    ipWhitelist: string,
    pixInEnabled: boolean,
    pixOutEnabled: boolean
  ) => {
    const response = await fetch(`${BASE_URL}/admin/users/${id}/config`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ 
        webhook_url: webhookUrl || null,
        webhook_url_pix_in: webhookUrlPixIn || null,
        webhook_url_pix_out: webhookUrlPixOut || null,
        refund_api_route: refundApiRoute || null,
        ip_whitelist: ipWhitelist || null,
        pix_in_enabled: Boolean(pixInEnabled),
        pix_out_enabled: Boolean(pixOutEnabled)
      }),
    });
    const json = await handleResponse(response);
    return json || null;
  },
};

