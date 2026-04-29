

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  PENDING = 'PENDING'
}

export enum DocStatus {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  REJECTED = 'REJECTED'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface User {
  id: number | string;
  owner_user_id?: number | string | null;
  ownerUserId?: number | string | null;
  account_type?: 'PRIMARY' | 'LINKED' | string;
  owner_account_name?: string | null;
  linked_accounts_count?: number;
  name: string;
  email: string;
  status: UserStatus;
  doc_status?: DocStatus;
  doc_status_notes?: string;
  role: UserRole;
  created_at?: string;
  document?: string;
  company?: string;
  provider?: string; // Provider code
  // Fees fields
  pixInPercent?: number;
  pixOutPercent?: number;
  otcFeePercentage?: number; // Taxa OTC personalizada (null = usar global)
  // Response fields from approval
  appId?: string;
  appSecret?: string;
  // API credentials from database
  app_id?: string;
  client_secret?: string;
  // Configuration fields
  webhook_url?: string;
  webhook_url_pix_in?: string;
  webhook_url_pix_out?: string;
  pix_in_enabled?: boolean;
  pix_out_enabled?: boolean;
  refund_api_route?: string;
  ip_whitelist?: string;
}

export interface Wallet {
  id: number | string;
  user_id: number | string;
  balance: number;
  currency?: string;
}

export interface LedgerItem {
  id: string | number;
  amount: number;
  description: string;
  type: 'CREDIT' | 'DEBIT' | 'PIX_IN' | 'PIX_OUT';
  created_at: string;
  balance_after?: number;
  // Informações do usuário que gerou a taxa
  userId?: number | string | null;
  userName?: string | null;
  userEmail?: string | null;
  // Informações adicionais
  transactionType?: string | null;
  feeType?: string | null;
  merOrderNo?: string | null;
  providerOrderNo?: string | null;
  provider?: string | null;
}

export interface Fees {
  pixInPercent: number;
  pixOutPercent: number;
}

export interface MedCase {
  id: string;
  transactionId: string;
  e2e?: string;
  amount: number;
  reason: string;
  reporterBank: string;
  reportedAt: string;
  deadline: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'DEFENSE_SENT' | 'REFUND_ACCEPTED' | 'REFUND_REJECTED' | string;
  clientName?: string;
}

export interface TreasuryBalance {
  amount: number;
  currency: string;
}

export interface TreasurySummary {
  date: string; // YYYY-MM-DD or YYYY-MM
  total_in: number;
  total_out: number;
  net_amount: number;
}

export interface TreasuryByUserSummary {
  userId: number;
  userName: string;
  userEmail?: string | null;
  totalCollected: number;
  totalReversed: number;
  netCollected: number;
  operaçãos: number;
}

export interface PáginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PáginatedTreasuryByUserSummary {
  items: TreasuryByUserSummary[];
  meta: PáginationMeta;
}

export interface PáginatedLedgerItems {
  items: LedgerItem[];
  meta: PáginationMeta;
}

export interface Provider {
  id: number;
  code: string;
  name: string;
  base_url: string;
  active: boolean;
  created_at: string;
}

export enum AppView {
  DASHBOARD = 'dashboard',
  CLIENTS = 'clients',
  TREASURY = 'treasury',
  APPROVALS = 'approvals',
  MED = 'med',
  SETTINGS = 'settings',
  PROVIDERS = 'providers',
  WEBHOOKS = 'webhooks',
  WEBHOOK_SETTINGS = 'webhook_settings',
  WEBHOOK_MAPPER = 'webhook_mapper',
  SECURITY = 'security',
  AUTHENTICATOR = 'authenticator',
  OTC = 'otc',
  ADMINS = 'admins'
}