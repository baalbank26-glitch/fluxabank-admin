import { BASE_URL, getHeaders, handleResponse } from './config';

export interface OtcWithdrawal {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  amountBrl: number;
  feeAmountBrl: number;
  netAmountBrl: number;
  cryptoCurrency: string;
  cryptoAmount: number;
  cryptoRate: number;
  walletAddress: string;
  walletNetwork: string;
  walletMemo?: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  txHash?: string;
  adminNotes?: string;
  createdAt: string;
  completedAt?: string;
  completedBy?: string;
}

export interface OtcStats {
  totalWithdrawals: number;
  pending: number;
  processing: number;
  completed: number;
  totalAmountBrl: number;
  totalFeesBrl: number;
  completedFeesBrl: number;
}

export interface OtcSettings {
  feePercentage: number;
  minWithdrawalBrl: number;
  maxWithdrawalBrl: number;
  enabled: boolean;
  updatedAt?: string;
  updatedBy?: number;
}

export const otcAdminService = {
  // Listar todas as solicitações
  async getAllWithdrawals(filters?: {
    status?: string;
    userId?: number;
    cryptoCurrency?: string;
    limit?: number;
  }): Promise<OtcWithdrawal[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.userId) params.append('userId', filters.userId.toString());
    if (filters?.cryptoCurrency) params.append('cryptoCurrency', filters.cryptoCurrency);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`${BASE_URL}/admin/otc/withdrawals?${params.toString()}`, {
      headers: getHeaders()
    });
    const json = await handleResponse(response);
    return json?.withdrawals || [];
  },

  // Buscar detalhes de uma solicitação
  async getWithdrawalById(id: number): Promise<OtcWithdrawal> {
    const response = await fetch(`${BASE_URL}/admin/otc/withdrawals/${id}`, {
      headers: getHeaders()
    });
    const json = await handleResponse(response);
    return json?.withdrawal || null;
  },

  // Atualizar status de uma solicitação
  async updateWithdrawalStatus(
    id: number,
    status: string,
    txHash?: string,
    adminNotes?: string
  ): Promise<any> {
    const response = await fetch(`${BASE_URL}/admin/otc/withdrawals/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, txHash, adminNotes })
    });
    const json = await handleResponse(response);
    return json;
  },

  // Estatísticas
  async getStats(): Promise<OtcStats> {
    const response = await fetch(`${BASE_URL}/admin/otc/stats`, {
      headers: getHeaders()
    });
    const json = await handleResponse(response);
    return json?.stats || null;
  },

  // Pegar configurações
  async getSettings(): Promise<OtcSettings> {
    const response = await fetch(`${BASE_URL}/admin/otc/settings`, {
      headers: getHeaders()
    });
    const json = await handleResponse(response);
    return json?.settings || null;
  },

  // Atualizar configurações
  async updateSettings(data: Partial<OtcSettings>): Promise<OtcSettings> {
    const response = await fetch(`${BASE_URL}/admin/otc/settings`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    const json = await handleResponse(response);
    return json?.settings || null;
  }
};
