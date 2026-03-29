const PROVINCES_API_BASE = 'https://provinces.open-api.vn/api/v2';

/**
 * LocationService gọi trực tiếp API bên ngoài (provinces.open-api.vn/api/v2)
 * thay vì đọc file JSON tĩnh.
 */
export class LocationService {

    async getAll(depth: number = 1) {
        const response = await fetch(`${PROVINCES_API_BASE}/?depth=${Math.min(depth, 2)}`);
        if (!response.ok) throw new Error(`Failed to fetch all divisions: ${response.statusText}`);
        return response.json();
    }

    async getProvinces(search?: string) {
        const params = search ? `?search=${encodeURIComponent(search)}` : '';
        const response = await fetch(`${PROVINCES_API_BASE}/p/${params}`);
        if (!response.ok) throw new Error(`Failed to fetch provinces: ${response.statusText}`);
        return response.json();
    }

    async getProvince(code: number, depth: number = 1) {
        const response = await fetch(`${PROVINCES_API_BASE}/p/${code}?depth=${Math.min(depth, 2)}`);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`Failed to fetch province ${code}: ${response.statusText}`);
        }
        return response.json();
    }

    async getWards(search?: string, provinceCode?: number) {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (provinceCode) params.append('province', provinceCode.toString());
        const query = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`${PROVINCES_API_BASE}/w/${query}`);
        if (!response.ok) throw new Error(`Failed to fetch wards: ${response.statusText}`);
        return response.json();
    }

    async getWard(code: number) {
        const response = await fetch(`${PROVINCES_API_BASE}/w/${code}`);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`Failed to fetch ward ${code}: ${response.statusText}`);
        }
        return response.json();
    }
}
