import { MedCase } from '../types/index';
import { BASE_URL, getHeaders, handleResponse } from './config';

const isPixE2E = (value: unknown): value is string => {
  const str = String(value || '').trim();
  return /^[eE][0-9a-zA-Z]{19,}$/.test && !str.includes('-');
};

const getE2EValue = (item: any): string => {
  const providerPayload = item?.provider_payload && typeof item.provider_payload === 'object'
    ? item.provider_payload
    : {};

  const rawResponse = item?.raw_response && typeof item.raw_response === 'object'
    ? item.raw_response
    : {};

  const rawData = rawResponse?.data && typeof rawResponse.data === 'object'
    ? rawResponse.data
    : {};

  const rawNestáa = rawResponse?.raw?.data && typeof rawResponse.raw.data === 'object'
    ? rawResponse.raw.data
    : {};

  const e2eCandidates = [
    rawData?.endToEndId,
    rawNestáa?.endToEndId,
    rawResponse?.endToEndId,
    rawData?.e2e,
    rawNestáa?.e2e,
    rawResponse?.e2e,
    item?.e2e,
    item?.endToEnd,
    item?.end_to_end,
    item?.endToEndId,
    providerPayload?.e2e,
    providerPayload?.endToEnd,
    providerPayload?.end_to_end,
    providerPayload?.endToEndId,
    item?.trade_no,
    item?.tradeNo,
    providerPayload?.trade_no,
    providerPayload?.tradeNo,
    item?.txid,
    providerPayload?.txid,
  ];

  const strictE2E = e2eCandidates.find(isPixE2E);
  return strictE2E || '';
};

const mapMedCase = (item: any): MedCase => ({
  id: String(item?.id ?? ''),
  transactionId: String(item?.transaction_id ?? item?.transactionId ?? ''),
  e2e: getE2EValue(item),
  amount: Number(item?.disputed_amount ?? item?.disputedAmount ?? 0),
  reason: String(item?.reason_code ?? item?.reason ?? 'OTHER') as any,
  reporterBank: item?.bank_name || item?.requestk || '-',
  reportedAt: item?.created_at || item?.openedAt || new Date().toISOString(),
  deadline: item?.due_date || item?.deadline || '',
  status: String(item?.status || 'OPEN') as any,
  clientName: item?.user_name || item?.clientName || ''
});

export const medService = {
  list: async (): Promise<MedCase[]> => {
    const response = await fetch(`${BASE_URL}/admin/med?status=ALL`, { headers: getHeaders() });
    const json = await handleResponse(response);
    const rows = Array.isArray(json?.data) ? json.data : [];
    return rows.map(mapMedCase);
  },

  action: async (id: string, action: string) => {
    const response = await fetch(`${BASE_URL}/admin/med/${id}/action`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ action }),
    });

    const json = await handleResponse(response);
    return json?.data || null;
  },

  detail: async (id: string) => {
    const response = await fetch(`${BASE_URL}/admin/med/${id}`, { headers: getHeaders() });
    const json = await handleResponse(response);
    const item = json?.data || null;
    if (!item) return null;

    return {
      ...mapMedCase(item),
      userId: Number(item?.user_id ?? 0),
      userName: String(item?.user_name || ''),
      userEmail: String(item?.user_email || ''),
      defenseText: String(item?.defense_text || ''),
      attachments: Array.isArray(item?.attachments)
        ? item.attachments.map((att: any) => ({
            id: att?.id,
            url: String(att?.url || ''),
            filename: String(att?.filename || ''),
            mimeType: String(att?.mimeType || att?.mime_type || ''),
            createdAt: att?.createdAt || att?.created_at || null,
          }))
        : [],
    };
  },

  listTransactions: async (params: { search?: string; userId?: number; from?: string; to?: string; filter?: string; page?: number; pageSize?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.userId) q.set('userId', String(params.userId));
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    if (params.filter) q.set('filter', params.filter);
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));

    const response = await fetch(`${BASE_URL}/admin/med/transactions?${q.toString()}`, {
      headers: getHeaders()
    });

    const json = await handleResponse(response);
    const rows = Array.isArray(json?.data) ? json.data : [];
    const items = rows.map((item: any) => ({
      e2e: getE2EValue(item),
      transaction_id: String(item?.transaction_id ?? ''),
      external_id: item?.external_id ? String(item.external_id) : '',
      direction: String(item?.direction || '').toUpperCase(),
      amount: Number(item?.amount ?? 0),
      description: String(item?.description || ''),
      tx_type: String(item?.tx_type || ''),
      source_channel: String(item?.source_channel || ''),
      created_at: item?.created_at || null,
      user_id: Number(item?.user_id ?? 0),
      user_name: String(item?.user_name || ''),
      user_email: String(item?.user_email || ''),
      med_id: item?.med_id ?? null,
      med_status: item?.med_status || null,
      med_code: item?.med_code || null,
    }));

    const meta = json?.meta || {};
    const page = Number(meta.page || params.page || 1);
    const pageSize = Number(meta.pageSize || params.pageSize || items.length || 1);
    const total = Number(meta.total || items.length);
    const totalPages = Number(meta.totalPages || Math.max(1, Math.ceil(total / Math.max(pageSize, 1))));

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
      }
    };
  },

  create: async (payload: {
    transactionId: number | string;
    userId: number;
    amount: number;
    reasonCode: string;
    reasonLabel?: string;
    note?: string;
    dueDate?: string;
  }) => {
    const response = await fetch(`${BASE_URL}/admin/med`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    const json = await handleResponse(response);
    return json?.data || null;
  }
};
