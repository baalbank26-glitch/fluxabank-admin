import { BASE_URL, getHeaders, handleResponse } from './config';

export interface AdminPermissionItem {
  key: string;
  label: string;
}

export interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  doc_status: string;
  admin_permissions: Record<string, boolean>;
  isMaster: boolean;
  created_at?: string;
}

export const adminsService = {
  list: async (): Promise<{ admins: AdminUserRow[]; permissionCatalog: AdminPermissionItem[] }> => {
    const response = await fetch(`${BASE_URL}/admin/admins`, { headers: getHeaders() });
    const json = await handleResponse(response);
    return {
      admins: json?.data || [],
      permissionCatalog: json?.permissionCatalog || [],
    };
  },

  create: async (payload: { name: string; email: string; password: string; permissions: Record<string, boolean> }) => {
    const response = await fetch(`${BASE_URL}/admin/admins`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await handleResponse(response);
    return json?.data || null;
  },

  updatePermissions: async (id: number | string, permissions: Record<string, boolean>) => {
    const response = await fetch(`${BASE_URL}/admin/admins/${id}/permissions`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ permissions }),
    });
    const json = await handleResponse(response);
    return json?.data || null;
  },
};
