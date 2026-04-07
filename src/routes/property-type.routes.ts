import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { PropertyTypeController } from "../controllers/property-type.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { AccountType } from "@prisma/client";

const router = express.Router();
const propertyTypeController = new PropertyTypeController();

// Publicly or Authenticated accessible route to get property types
// Agent and standard users need this to populate dropdowns etc.
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await propertyTypeController.getAll();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Admin only routes
router.use(authMiddleware);
router.use(authorize(AccountType.ADMIN));

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    const data = await propertyTypeController.create(name);
    res
      .status(201)
      .json({ success: true, message: "Tạo danh mục thành công", data });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { name } = req.body;
    const data = await propertyTypeController.update(id, name);
    res
      .status(200)
      .json({ success: true, message: "Cập nhật danh mục thành công", data });
  } catch (error) {
    next(error);
  }
});

router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await propertyTypeController.delete(id);
      res.status(200).json({ success: true, message: "Xóa danh mục thành công" });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
