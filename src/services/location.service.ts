import fs from 'fs';
import path from 'path';




export class LocationService {
    private data: any[];

    constructor() {
        const filePath = path.join(process.cwd(), 'src', 'data', 'location_data.json');
        const raw = fs.readFileSync(filePath, 'utf-8');
        this.data = JSON.parse(raw);
    }

    getAll(depth: number = 1) {
        if (depth === 1) {
            return this.data.map(p => ({
                ...p,
                districts: p.districts.map((d: any) => {
                    const { wards, ...rest } = d;
                    return rest;
                })
            }));
        }
        return this.data;
    }

    getProvinces(search?: string) {
        let list = this.data.map(p => ({
            name: p.name,
            code: p.code,
            division_type: p.division_type,
            codename: p.codename,
            phone_code: p.phone_code
        }));
        if (search) {
            const s = search.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(s) || p.codename.includes(s));
        }
        return list;
    }

    getProvince(code: number, depth: number = 1) {
        const p = this.data.find(p => p.code === code);
        if (!p) return null;

        if (depth === 1) {
            return {
                ...p,
                districts: p.districts.map((d: any) => {
                    const { wards, ...rest } = d;
                    return rest;
                })
            };
        }
        return p;
    }

    getWards(search?: string, provinceCode?: number) {
        let wards: any[] = [];
        this.data.forEach(p => {
            if (provinceCode && p.code !== provinceCode) return;
            p.districts.forEach((d: any) => {
                if (d.wards) {
                    const mapped = d.wards.map((w: any) => ({
                        ...w,
                        district_name: d.name // Append parent district name
                    }));
                    wards.push(...mapped);
                }
            });
        });

        if (search) {
            const s = search.toLowerCase();
            wards = wards.filter(w => w.name.toLowerCase().includes(s) || w.codename.includes(s));
        }
        return wards;
    }

    getWard(code: number) {
        let foundWard = null;
        for (const p of this.data) {
            for (const d of p.districts) {
                if (d.wards) {
                    const w = d.wards.find((w: any) => w.code === code);
                    if (w) {
                        foundWard = w;
                        break;
                    }
                }
            }
            if (foundWard) break;
        }
        return foundWard;
    }
}
