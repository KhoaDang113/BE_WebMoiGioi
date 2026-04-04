import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { ReportController } from "../controllers/report.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { CreateReportRequestSchema } from "../dtos/report/create-report.dto.js";
import { UpdateReportStatusRequestSchema } from "../dtos/report/update-report.dto.js";
import { Validator } from "../utils/validator.js";
import { AccountType } from "@prisma/client";
import { AppError } from "../utils/customErrors.js";

const router = Router();
const reportController = new ReportController();

// All report routes require authentication
router.use(authMiddleware);

/**
 * POST /api/v1/reports/export
 * Body: { types: ['properties', 'users', 'listings', 'summary'] }
 * Returns: Excel file download
 */
router.post(
  "/export",
  authorize(AccountType.ADMIN),
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
  }
);

router.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = Validator.validate(CreateReportRequestSchema, req.body);
      const newReport = await reportController.createReport(BigInt(req.user!.userId), data);
      res.status(201).json({
        success: true,
        message: "Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét sớm nhất.",
        data: newReport,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/admin/pending",
  authorize(AccountType.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await reportController.getAdminReports();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/admin/:id/status",
  authorize(AccountType.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError("Report ID is required", 400);
      const data = Validator.validate(UpdateReportStatusRequestSchema, req.body);
      const updated = await reportController.updateReportStatus(BigInt(id), data);
      res.status(200).json({ success: true, message: "Status updated successfully", data: updated });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
