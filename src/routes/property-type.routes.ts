import express from "express";
import { 
  getAllPropertyTypes, 
  createPropertyType, 
  updatePropertyType, 
  deletePropertyType 
} from "../controllers/property-type.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { AccountType } from "@prisma/client";

const router = express.Router();

// Publicly or Authenticated accessible route to get property types
// Agent and standard users need this to populate dropdowns etc.
router.get("/", getAllPropertyTypes);

// Admin only routes
router.use(authMiddleware);
router.use(authorize(AccountType.ADMIN));

router.post("/", createPropertyType);
router.put("/:id", updatePropertyType);
router.delete("/:id", deletePropertyType);

export default router;
