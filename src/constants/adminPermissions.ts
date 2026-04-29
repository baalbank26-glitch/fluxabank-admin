export const ADMIN_PERMISSION_KEYS = {
  SUSPEND_ACCOUNTS: 'suspendAccounts',
  ADJUST_BALANCE: 'adjustBalance',
  CONFIGURE_FEES: 'configureFees',
  SELECT_PROVIDER: 'selectProvider',
  MANAGE_WEBHOOKS_WHITELIST: 'manageWebhooksWhitelist',
  APPROVE_KYC: 'approveKyc',
  MANAGE_OTC: 'manageOtc',
  EDIT_PROVIDERS: 'editProviders',
  TOGGLE_MAINTENANCE: 'toggleMaintenance',
} as const;

export const ADMIN_PERMISSION_LIST = [
  { key: ADMIN_PERMISSION_KEYS.SUSPEND_ACCOUNTS, label: 'Suspender contas' },
  { key: ADMIN_PERMISSION_KEYS.ADJUST_BALANCE, label: 'Ajustar saldo' },
  { key: ADMIN_PERMISSION_KEYS.CONFIGURE_FEES, label: 'Configurar taxas' },
  { key: ADMIN_PERMISSION_KEYS.SELECT_PROVIDER, label: 'Selecionar provider' },
  { key: ADMIN_PERMISSION_KEYS.MANAGE_WEBHOOKS_WHITELIST, label: 'Setar hooks, IPs e whitelist' },
  { key: ADMIN_PERMISSION_KEYS.APPROVE_KYC, label: 'Aprovar KYC' },
  { key: ADMIN_PERMISSION_KEYS.MANAGE_OTC, label: 'GestãoC' },
  { key: ADMIN_PERMISSION_KEYS.EDIT_PROVIDERS, label: 'Editar providers' },
  { key: ADMIN_PERMISSION_KEYS.TOGGLE_MAINTENANCE, label: 'Ativar manutencao' },
];

export const getAllPermissionsEnabled = (): Record<string, boolean> => {
  return ADMIN_PERMISSION_LIST.reduce((acc, permission) => {
    acc[permission.key] = true;
    return acc;
  }, {} as Record<string, boolean>);
};

export const hasAdminPermission = (profile: any, permissionKey: string): boolean => {
  if (!profile) return false;

  const rawPermissions = profile.admin_permissions ?? profile.adminPermissions ?? null;
  if (!rawPermissions) return true;

  return Boolean(rawPermissions[permissionKey]);
};

export const isMasterAdmin = (profile: any): boolean => {
  if (!profile) return false;
  return profile.admin_permissions == null;
};
