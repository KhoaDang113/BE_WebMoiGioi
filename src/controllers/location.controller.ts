import type { Request, Response, NextFunction } from "express";
import { LocationService } from "../services/location.service.js";
import { AppError } from "../utils/customErrors.js";

const locationService = new LocationService();

export class LocationController {
    getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const depth = req.query.depth ? parseInt(String(req.query.depth)) : 1;
            const data = locationService.getAll(depth);
            res.json(data);
        } catch (error) {
            next(error);
        }
    }

    getProvinces(req: Request, res: Response, next: NextFunction) {
        try {
            const search = req.query.search as string | undefined;
            const data = locationService.getProvinces(search);
            res.json(data);
        } catch (error) {
            next(error);
        }
    }

    getProvince(req: Request, res: Response, next: NextFunction) {
        try {
            const code = parseInt(String(req.params.code));
            const depth = req.query.depth ? parseInt(String(req.query.depth)) : 1;
            const data = locationService.getProvince(code, depth);
            if (!data) throw new AppError("Province not found", 404);
            res.json(data);
        } catch (error) {
            next(error);
        }
    }

    getWards(req: Request, res: Response, next: NextFunction) {
        try {
            const search = req.query.search as string | undefined;
            const provinceCode = req.query.province ? parseInt(String(req.query.province)) : undefined;
            const data = locationService.getWards(search, provinceCode);
            res.json(data);
        } catch (error) {
            next(error);
        }
    }

    getWard(req: Request, res: Response, next: NextFunction) {
        try {
            const code = parseInt(String(req.params.code));
            const data = locationService.getWard(code);
            if (!data) throw new AppError("Ward not found", 404);
            res.json(data);
        } catch (error) {
            next(error);
        }
    }
}
