import type { Request, Response, NextFunction } from "express";
import { LocationService } from "../services/location.service.js";
import { AppError } from "../utils/customErrors.js";

const locationService = new LocationService();

export class LocationController {
    async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const depth = req.query.depth ? parseInt(String(req.query.depth)) : 1;
            const data = await locationService.getAll(depth);
            res.json(data);
        } catch (error) {
            next(error);
        }
    }

    async getProvinces(req: Request, res: Response, next: NextFunction) {
        try {
            const search = req.query.search as string | undefined;
            const data = await locationService.getProvinces(search);
            res.json(data);
        } catch (error) {
            next(error);
        }
    }

    async getProvince(req: Request, res: Response, next: NextFunction) {
        try {
            const code = parseInt(String(req.params.code));
            const depth = req.query.depth ? parseInt(String(req.query.depth)) : 1;
            const data = await locationService.getProvince(code, depth);
            if (!data) throw new AppError("Province not found", 404);
            res.json(data);
        } catch (error) {
            next(error);
        }
    }

    async getWards(req: Request, res: Response, next: NextFunction) {
        try {
            const search = req.query.search as string | undefined;
            const provinceCode = req.query.province ? parseInt(String(req.query.province)) : undefined;
            const data = await locationService.getWards(search, provinceCode);
            res.json(data);
        } catch (error) {
            next(error);
        }
    }

    async getWard(req: Request, res: Response, next: NextFunction) {
        try {
            const code = parseInt(String(req.params.code));
            const data = await locationService.getWard(code);
            if (!data) throw new AppError("Ward not found", 404);
            res.json(data);
        } catch (error) {
            next(error);
        }
    }
}
