import { AppError } from "../utils/customErrors.js";

const PROVINCES_API_BASE = "https://provinces.open-api.vn/api/v2";

export class LocationController {
  // ─── Get All ──────────────────────────────────────────────────────────────────

  async getAll(depth: number = 1) {
    const response = await fetch(`${PROVINCES_API_BASE}/?depth=${Math.min(depth, 2)}`);
    if (!response.ok) throw new Error(`Failed to fetch all divisions: ${response.statusText}`);
    return response.json();
  }

  // ─── Get Provinces ────────────────────────────────────────────────────────────

  async getProvinces(search?: string) {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    const response = await fetch(`${PROVINCES_API_BASE}/p/${params}`);
    if (!response.ok) throw new Error(`Failed to fetch provinces: ${response.statusText}`);
    return response.json();
  }

  // ─── Get Province ─────────────────────────────────────────────────────────────

  async getProvince(code: number, depth: number = 1) {
    const response = await fetch(`${PROVINCES_API_BASE}/p/${code}?depth=${Math.min(depth, 2)}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch province ${code}: ${response.statusText}`);
    }
    return response.json();
  }

  // ─── Get Wards ────────────────────────────────────────────────────────────────

  async getWards(search?: string, provinceCode?: number) {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (provinceCode) params.append("province", provinceCode.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(`${PROVINCES_API_BASE}/w/${query}`);
    if (!response.ok) throw new Error(`Failed to fetch wards: ${response.statusText}`);
    return response.json();
  }

  // ─── Get Ward ─────────────────────────────────────────────────────────────────

  async getWard(code: number) {
    const response = await fetch(`${PROVINCES_API_BASE}/w/${code}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch ward ${code}: ${response.statusText}`);
    }
    return response.json();
  }
}
