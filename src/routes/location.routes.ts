import { Router, type Request, type Response, type NextFunction } from "express";
import { LocationController } from "../controllers/location.controller.js";
import { AppError } from "../utils/customErrors.js";

const router = Router();
const locationController = new LocationController();

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const depth = req.query.depth ? parseInt(String(req.query.depth)) : 1;
    const data = await locationController.getAll(depth);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/p", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const data = await locationController.getProvinces(search);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/p/:code", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = parseInt(String(req.params.code));
    const depth = req.query.depth ? parseInt(String(req.query.depth)) : 1;
    const data = await locationController.getProvince(code, depth);
    if (!data) throw new AppError("Province not found", 404);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/w", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const provinceCode = req.query.province ? parseInt(String(req.query.province)) : undefined;
    const data = await locationController.getWards(search, provinceCode);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/w/:code", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = parseInt(String(req.params.code));
    const data = await locationController.getWard(code);
    if (!data) throw new AppError("Ward not found", 404);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
