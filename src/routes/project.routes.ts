import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { ProjectController } from '../controllers/project.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import upload from '../middlewares/upload.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { AccountType } from '@prisma/client';
import { AppError } from '../utils/customErrors.js';

const router = Router();
const projectController = new ProjectController();

// ─── Public Routes ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/projects/public
 * Get all approved projects for public viewing.
 */
router.get('/public', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await projectController.getPublicProjects();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/projects/public/:id
 * Get a single approved project for public viewing.
 */
router.get('/public/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!id) throw new AppError('Project ID is required', 400);
    const data = await projectController.getPublicProjectById(id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// All routes below require authentication
router.use(authMiddleware);

// ─── Agent Routes ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/projects/agent/my-projects
 * Get all projects belonging to the current agent.
 */
router.get(
  '/agent/my-projects',
  authorize(AccountType.AGENT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await projectController.getMyProjects(req.user!.userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/v1/projects/agent/my-approved
 * Get only approved projects for dropdown select when creating listing.
 */
router.get(
  '/agent/my-approved',
  authorize(AccountType.AGENT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await projectController.getMyApprovedProjects(req.user!.userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/projects/agent
 * Create a new project (with up to 10 images).
 */
router.post(
  '/agent',
  authorize(AccountType.AGENT),
  upload.array('images', 10),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[];
      const data = await projectController.createProject(
        req.user!.userId,
        req.body,
        files,
      );
      res.status(201).json({ success: true, message: 'Tạo dự án thành công', data });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/v1/projects/agent/:id
 * Get a single project by ID (owned by agent).
 */
router.get(
  '/agent/:id',
  authorize(AccountType.AGENT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Project ID is required', 400);
      const data = await projectController.getProjectById(req.user!.userId, id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/v1/projects/agent/:id
 * Update a project (with optional new images).
 */
router.put(
  '/agent/:id',
  authorize(AccountType.AGENT),
  upload.array('images', 10),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Project ID is required', 400);
      const files = req.files as Express.Multer.File[];
      const data = await projectController.updateProject(
        req.user!.userId,
        id,
        req.body,
        files,
      );
      res.status(200).json({ success: true, message: 'Cập nhật dự án thành công', data });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /api/v1/projects/agent/:id
 * Delete a project owned by the agent.
 */
router.delete(
  '/agent/:id',
  authorize(AccountType.AGENT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Project ID is required', 400);
      await projectController.deleteProject(req.user!.userId, id);
      res.status(200).json({ success: true, message: 'Xoá dự án thành công' });
    } catch (error) {
      next(error);
    }
  },
);

// ─── Admin Routes ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/projects/admin
 * Get all projects.
 */
router.get(
  '/admin',
  authorize(AccountType.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await projectController.adminGetAllProjects();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/v1/projects/admin/:id/status
 * Update project approval status.
 */
router.put(
  '/admin/:id/status',
  authorize(AccountType.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      if (!id) throw new AppError('Project ID is required', 400);
      if (!status) throw new AppError('Status is required', 400);
      
      const data = await projectController.adminUpdateProjectStatus(id, status);
      res.status(200).json({ success: true, message: 'Cập nhật trạng thái duyệt dự án thành công', data });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
