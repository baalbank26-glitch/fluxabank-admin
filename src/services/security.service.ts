import { API_USER_SERVICE, getHeaders, handleResponse } from './config';

export const securityService = {
    getLogs: async (params: { dateFrom?: string, dateTo?: string, type?: string, ip?: string, limit?: number, offset?: number } = {}) => {
        const query = new URLSearchParams();
        if (params.dateFrom) query.append('dateFrom', params.dateFrom);
        if (params.dateTo) query.append('dateTo', params.dateTo);
        if (params.type) query.append('type', params.type);
        if (params.ip) query.append('ip', params.ip);
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.offset) query.append('offset', params.offset.toString());

        const response = await fetch(`${API_USER_SERVICE}/admin/security/logs?${query.toString()}`, {
            headers: getHeaders(),
        });
        return handleResponse(response);
    },
};
