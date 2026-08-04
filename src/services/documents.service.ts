import { BASE_URL, getHeaders, handleResponse } from './config';

interface UserDocument {
  id?: string | number;
  user_id?: string | number;
  userId?: string | number;
  document_type?: string;
  documentType?: string;
  document_link?: string;
  documentLink?: string;
  created_at?: string;
  fileName?: string;
  status?: string;
}

export const documentsService = {
  getUserDocuments: async (userId: string | number): Promise<UserDocument[]> => {
    const response = await fetch(`${BASE_URL}/documents/admin/user/${userId}/documents`, {
      headers: getHeaders(),
    });
    const json = await handleResponse(response);
    return Array.isArray(json?.documents) ? json.documents : [];
  },

  getDocument: async (id: string | number): Promise<UserDocument> => {
    const response = await fetch(`${BASE_URL}/api/documents/${id}`, {
      headers: getHeaders(),
    });
    const json = await handleResponse(response);
    return json?.data || null;
  },
};
