import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { ReportController } from "../controllers/report.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { AccountType } from "../generated/client/client.js";
import { AppError } from "../utils/customErrors.js";

const router = Router();
const reportController = new ReportController();

// All report routes require admin auth
router.use(authMiddleware);
router.use(authorize(AccountType.ADMIN));

/**
 * POST /api/v1/reports/export
 * Body: { types: ['properties', 'users', 'listings', 'summary'] }
 * Returns: Excel file download
 */
router.post(
  "/export",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { types } = req.body;

      if (!types || !Array.isArray(types) || types.length === 0) {
        throw new AppError(
          "Vui lòng chọn ít nhất một loại báo cáo để xuất",
          400,
        );
      }

      const validTypes = ["properties", "users", "listings", "summary"];
      for (const t of types) {
        if (!validTypes.includes(t)) {
          throw new AppError(`Loại báo cáo không hợp lệ: ${t}`, 400);
        }
      }

      await reportController.generateReport(types, res);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
