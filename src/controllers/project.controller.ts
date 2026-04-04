import { ProjectApprovalStatus } from "@prisma/client";
import { AppError } from "../utils/customErrors.js";
import { UploadService } from "../services/upload.service.js";
import prisma from "../config/database.js";
import { generateSlug } from "../utils/generateSlug.js";

export class ProjectController {
  private readonly uploadService: UploadService;

  constructor() {
    this.uploadService = new UploadService();
  }

  /**
   * Create a new project (Agent only).
   * Default approvalStatus = PENDING_REVIEW.
   */
  async createProject(
    userId: string | bigint,
    data: any,
    files?: Express.Multer.File[],
  ) {
    if (!data.name) {
      throw new AppError("Tên dự án là bắt buộc", 400);
    }

    return prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          userId: BigInt(userId),
          name: data.name,
          slug: generateSlug(data.name),
          investorName: data.investorName || null,
          provinceCode: data.provinceCode || null,
          provinceName: data.provinceName || null,
          wardCode: data.wardCode || null,
          wardName: data.wardName || null,
          addressText: data.addressText || null,
          totalArea: data.totalArea ? parseFloat(data.totalArea) : null,
          status: data.status || null,
          approvalStatus: ProjectApprovalStatus.PENDING_REVIEW,
          description: data.description || null,
        },
      });

      if (files && files.length > 0) {
        const uploadPromises = files.map((file, i) =>
          this.uploadService
            .uploadImage(file.buffer, { folder: "projects" })
            .then((url) =>
              tx.projectMedia.create({
                data: {
                  projectId: newProject.id,
                  originalUrl: url,
                  isPrimary: i === 0,
                  sortOrder: i,
                },
              }),
            ),
        );
        await Promise.all(uploadPromises);
      }

      return tx.project.findUnique({
        where: { id: newProject.id },
        include: { media: true },
      });
    });
  }

  /**
   * Get all projects belonging to the current agent.
   */
  async getMyProjects(userId: string | bigint) {
    return prisma.project.findMany({
      where: { userId: BigInt(userId) },
      include: {
        media: { where: { isPrimary: true }, take: 1 },
        _count: { select: { listings: true } },
      },
      orderBy: { id: "desc" },
    });
  }

  /**
   * Get a single project by ID, owned by the agent.
   */
  async getProjectById(userId: string | bigint, projectId: string | bigint) {
    const project = await prisma.project.findUnique({
      where: { id: BigInt(projectId) },
      include: { media: true },
    });
    if (!project) throw new AppError("Dự án không tồn tại", 404);
    if (project.userId !== BigInt(userId))
      throw new AppError("Bạn không có quyền truy cập dự án này", 403);
    return project;
  }

  /**
   * Update a project owned by the agent.
   */
  async updateProject(
    userId: string | bigint,
    projectId: string | bigint,
    data: any,
    files?: Express.Multer.File[],
  ) {
    await this.getProjectById(userId, projectId);

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.investorName !== undefined)
      updateData.investorName = data.investorName;
    if (data.provinceCode !== undefined)
      updateData.provinceCode = data.provinceCode;
    if (data.provinceName !== undefined)
      updateData.provinceName = data.provinceName;
    if (data.wardCode !== undefined) updateData.wardCode = data.wardCode;
    if (data.wardName !== undefined) updateData.wardName = data.wardName;
    if (data.addressText !== undefined)
      updateData.addressText = data.addressText;
    if (data.totalArea !== undefined)
      updateData.totalArea = data.totalArea ? parseFloat(data.totalArea) : null;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id: BigInt(projectId) },
        data: updateData,
      });

      if (files && files.length > 0) {
        await tx.projectMedia.deleteMany({
          where: { projectId: BigInt(projectId) },
        });
        const uploadPromises = files.map((file, i) =>
          this.uploadService
            .uploadImage(file.buffer, { folder: "projects" })
            .then((url) =>
              tx.projectMedia.create({
                data: {
                  projectId: updated.id,
                  originalUrl: url,
                  isPrimary: i === 0,
                  sortOrder: i,
                },
              }),
            ),
        );
        await Promise.all(uploadPromises);
      }

      return tx.project.findUnique({
        where: { id: updated.id },
        include: { media: true },
      });
    });
  }

  /**
   * Delete a project owned by the agent.
   */
  async deleteProject(userId: string | bigint, projectId: string | bigint) {
    await this.getProjectById(userId, projectId);
    await prisma.project.delete({ where: { id: BigInt(projectId) } });
    return true;
  }

  /**
   * Get only APPROVED projects belonging to an agent.
   * Used when creating listings to pick a project.
   */
  async getMyApprovedProjects(userId: string | bigint) {
    return prisma.project.findMany({
      where: {
        userId: BigInt(userId),
        approvalStatus: ProjectApprovalStatus.APPROVED,
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  // ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

  /**
   * Get all APPROVED projects for public viewing.
   */
  async getPublicProjects() {
    return prisma.project.findMany({
      where: {
        approvalStatus: ProjectApprovalStatus.APPROVED,
      },
      include: {
        media: {
          orderBy: { sortOrder: "asc" },
          take: 5,
        },
        _count: { select: { listings: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get a single APPROVED project by ID (or slug) for public viewing.
   */
  async getPublicProjectById(idOrSlug: string) {
    const isId = /^\d+$/.test(idOrSlug);
    const project = await prisma.project.findFirst({
      where: {
        AND: [
          isId ? { id: BigInt(idOrSlug) } : { slug: idOrSlug },
          { approvalStatus: ProjectApprovalStatus.APPROVED },
        ],
      },
      include: {
        media: { orderBy: { sortOrder: "asc" } },
        listings: {
          include: {
            media: {
              where: { isPrimary: true },
              take: 1,
            },
            propertyType: true,
            user: {
              select: {
                profile: { select: { displayName: true } },
              },
            },
          },
          orderBy: { id: "desc" },
        },
      },
    });

    if (!project) {
      throw new AppError("Dự án không tồn tại hoặc chưa được duyệt", 404);
    }

    return project;
  }

  // ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

  /**
   * Get all projects for Admin dashboard.
   */
  async adminGetAllProjects() {
    return prisma.project.findMany({
      include: {
        media: { where: { isPrimary: true }, take: 1 },
        user: {
          select: {
            email: true,
            profile: {
              select: { displayName: true },
            },
          },
        },
        _count: { select: { listings: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Update project approval status (Admin).
   */
  async adminUpdateProjectStatus(
    projectId: string | bigint,
    status: ProjectApprovalStatus,
  ) {
    if (!Object.values(ProjectApprovalStatus).includes(status)) {
      throw new AppError("Trạng thái không hợp lệ", 400);
    }

    const project = await prisma.project.findUnique({
      where: { id: BigInt(projectId) },
    });

    if (!project) throw new AppError("Dự án không tồn tại", 404);

    return prisma.project.update({
      where: { id: BigInt(projectId) },
      data: { approvalStatus: status },
      include: {
        user: {
          select: {
            email: true,
            profile: {
              select: { displayName: true },
            },
          },
        },
      },
    });
  }
}
