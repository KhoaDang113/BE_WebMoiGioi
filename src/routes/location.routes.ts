import { Router } from "express";
import { LocationController } from "../controllers/location.controller.js";

const router = Router();
const locationController = new LocationController();

router.get("/", locationController.getAll.bind(locationController));
router.get("/p", locationController.getProvinces.bind(locationController));
router.get("/p/:code", locationController.getProvince.bind(locationController));
router.get("/w", locationController.getWards.bind(locationController));
router.get("/w/:code", locationController.getWard.bind(locationController));

export default router;
