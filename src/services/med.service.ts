import { MedCase } from '../types/index';
import { BASE_URL, getHeaders, handleResponse } from './config';

const mapMedCase = (item: any): MedCase => ({
  id: String(item?.id ?? ''),
  transactionId: String(item?.transaction_id ?? item?.transactionId ?? ''),
  amount: Number(item?.disputed_amount ?? item?.disputedAmount ?? 0),
  reason: String(item?.reason_code ?? item?.reason ?? 'OTHER') as any,
  reporterBank: item?.bank_name || item?.requesterBank || '-',
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

  listTransactions: async (params: { search?: string; userId?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.userId) q.set('userId', String(params.userId));

    const response = await fetch(`${BASE_URL}/admin/med/transactions?${q.toString()}`, {
      headers: getHeaders()
    });

    const json = await handleResponse(response);
    const rows = Array.isArray(json?.data) ? json.data : [];
    return rows.map((item: any) => ({
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
