import { ListingStatus, ListingType, PriceUnit } from "@prisma/client";
import { AppError } from "../utils/customErrors.js";
import { UploadService } from "../services/upload.service.js";
import prisma from "../config/database.js";
import { generateSlug } from "../utils/generateSlug.js";

export class ListingController {
  private readonly uploadService: UploadService;

  constructor() {
    this.uploadService = new UploadService();
  }

  // ─── Get Property Types ───────────────────────────────────────────────────────

  async getPropertyTypes() {
    return prisma.propertyType.findMany({ orderBy: { id: "asc" } });
  }

  // ─── Get Listing By Id ────────────────────────────────────────────────────────

  async getListingById(userId: string | bigint, listingId: string | bigint) {
    const listing = await prisma.listing.findUnique({
      where: { id: BigInt(listingId) },
      include: { media: true },
    });
    if (!listing) throw new AppError("Listing not found", 404);
    if (listing.userId !== BigInt(userId))
      throw new AppError("Permission denied", 403);
    return listing;
  }

  // ─── Create Listing ───────────────────────────────────────────────────────────

  async createListing(
    userId: string | bigint,
    data: any,
    files?: Express.Multer.File[],
  ) {
    if (
      !data.title ||
      !data.price ||
      !data.addressDisplay ||
      !data.propertyTypeId ||
      !data.provinceCode ||
      !data.wardCode
    ) {
      throw new AppError(
        "Missing essential listing information (title, price, address, type, location)",
        400,
      );
    }

    const priceNum = parseFloat(data.price);

    // Validate project ownership if projectId is provided
    if (data.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: BigInt(data.projectId) },
      });
      if (!project) throw new AppError("Dự án không tồn tại", 404);
      if (project.userId !== BigInt(userId))
        throw new AppError(
          "Bạn không có quyền liên kết tin đăng với dự án này",
          403,
        );
    }

    return prisma.$transaction(async (tx) => {
      const newListing = await tx.listing.create({
        data: {
          userId: BigInt(userId),
          title: data.title,
          slug: generateSlug(data.title),
          listingType: ListingType.SALE,
          propertyTypeId: parseInt(data.propertyTypeId),
          provinceCode: data.provinceCode,
          provinceName: data.provinceName || "",
          districtCode: data.districtCode || "",
          districtName: data.districtName || "",
          wardCode: data.wardCode,
          wardName: data.wardName || "",
          provinceSlug: data.provinceSlug || null,
          districtSlug: data.districtSlug || null,
          wardSlug: data.wardSlug || null,
          addressDisplay: data.addressDisplay,
          price: priceNum,
          priceUnit: PriceUnit.VND,
          areaGross: data.areaGross ? parseFloat(data.areaGross) : 50,
          ...(data.projectId ? { projectId: BigInt(data.projectId) } : {}),
          attributes: {
            ...(data.description ? { description: data.description } : {}),
            ...(data.beds ? { beds: parseInt(data.beds) } : {}),
            ...(data.rooms ? { rooms: parseInt(data.rooms) } : {}),
          },
          status: ListingStatus.PENDING_REVIEW,
        },
      });

      if (files && files.length > 0) {
        const uploadPromises = files.map((file, i) =>
          this.uploadService
            .uploadImage(file.buffer, { folder: "property_listings" })
            .then((url) =>
              tx.listingMedia.create({
                data: {
                  listingId: newListing.id,
                  mediaType: "IMAGE",
                  originalUrl: url,
                  isPrimary: i === 0,
                  sortOrder: i,
                },
              }),
            ),
        );
        await Promise.all(uploadPromises);
      }

      return newListing;
    });
  }

  // ─── Get My Listings ──────────────────────────────────────────────────────────

  async getMyListings(userId: string | bigint) {
    return prisma.listing.findMany({
      where: { userId: BigInt(userId) },
      include: { media: { where: { isPrimary: true }, take: 1 } },
      orderBy: { id: "desc" },
      take: 50,
    });
  }

  // ─── Update Listing ───────────────────────────────────────────────────────────

  async updateListing(
    userId: string | bigint,
    listingId: string | bigint,
    data: any,
    files?: Express.Multer.File[],
  ) {
    const existing = await this.getListingById(userId, listingId);

    const attrBase =
      typeof existing.attributes === "object" && existing.attributes
        ? (existing.attributes as any)
        : {};

    const updateData: any = {};
    if (data.title) updateData.title = data.title;
    if (data.propertyTypeId)
      updateData.propertyTypeId = parseInt(data.propertyTypeId);
    if (data.addressDisplay) updateData.addressDisplay = data.addressDisplay;
    if (data.price) updateData.price = parseFloat(data.price);
    if (data.areaGross) updateData.areaGross = parseFloat(data.areaGross);

    const newAttributes: any = { ...attrBase };
    if (data.description !== undefined)
      newAttributes.description = data.description;
    if (data.beds !== undefined) {
      if (data.beds) newAttributes.beds = parseInt(data.beds);
      else delete newAttributes.beds;
    }
    if (data.rooms !== undefined) {
      if (data.rooms) newAttributes.rooms = parseInt(data.rooms);
      else delete newAttributes.rooms;
    }
    updateData.attributes = newAttributes;

    if (data.provinceCode) updateData.provinceCode = data.provinceCode;
    if (data.provinceName) updateData.provinceName = data.provinceName;
    if (data.districtCode) updateData.districtCode = data.districtCode;
    if (data.districtName) updateData.districtName = data.districtName;
    if (data.wardCode) updateData.wardCode = data.wardCode;
    if (data.wardName) updateData.wardName = data.wardName;
    if (data.provinceSlug) updateData.provinceSlug = data.provinceSlug;
    if (data.districtSlug) updateData.districtSlug = data.districtSlug;
    if (data.wardSlug) updateData.wardSlug = data.wardSlug;

    if (data.projectId !== undefined) {
      if (data.projectId) {
        const project = await prisma.project.findUnique({
          where: { id: BigInt(data.projectId) },
        });
        if (!project) throw new AppError("Dự án không tồn tại", 404);
        if (project.userId !== BigInt(userId))
          throw new AppError(
            "Bạn không có quyền liên kết tin đăng với dự án này",
            403,
          );
        updateData.projectId = BigInt(data.projectId);
      } else {
        updateData.projectId = null;
      }
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.listing.update({
        where: { id: BigInt(listingId) },
        data: updateData,
      });

      if (files && files.length > 0) {
        await tx.listingMedia.deleteMany({
          where: { listingId: BigInt(listingId) },
        });
        const uploadPromises = files.map((file, i) =>
          this.uploadService
            .uploadImage(file.buffer, { folder: "property_listings" })
            .then((url) =>
              tx.listingMedia.create({
                data: {
                  listingId: updated.id,
                  mediaType: "IMAGE",
                  originalUrl: url,
                  isPrimary: i === 0,
                  sortOrder: i,
                },
              }),
            ),
        );
        await Promise.all(uploadPromises);
      }

      return updated;
    });
  }

  // ─── Delete Listing ───────────────────────────────────────────────────────────

  async deleteListing(userId: string | bigint, listingId: string | bigint) {
    const listing = await prisma.listing.findUnique({
      where: { id: BigInt(listingId) },
    });
    if (!listing) throw new AppError("Listing not found", 404);
    if (listing.userId !== BigInt(userId))
      throw new AppError("Permission denied", 403);
    await prisma.listing.delete({ where: { id: BigInt(listingId) } });
    return true;
  }

  // ─── Update Listing Status ────────────────────────────────────────────────────

  async updateListingStatus(
    userId: string | bigint,
    listingId: string | bigint,
    status: ListingStatus,
  ) {
    const listing = await prisma.listing.findUnique({
      where: { id: BigInt(listingId) },
    });
    if (!listing) throw new AppError("Listing not found", 404);
    if (listing.userId !== BigInt(userId))
      throw new AppError("Permission denied", 403);
    return prisma.listing.update({
      where: { id: BigInt(listingId) },
      data: { status },
    });
  }

  // ─── Admin: Get Pending Listings ──────────────────────────────────────────────

  async getAdminPendingListings() {
    return prisma.listing.findMany({
      where: { status: ListingStatus.PENDING_REVIEW },
      include: {
        user: { select: { email: true } },
        media: { take: 1 },
      },
      orderBy: { id: "desc" },
    });
  }

  async getAdminAllListings() {
    return prisma.listing.findMany({
      include: {
        user: { select: { email: true } },
        media: { take: 1 },
        propertyType: true,
      },
      orderBy: { id: "desc" },
      take: 100, // Limit for now, can add pagination later
    });
  }

  // ─── Admin: Update Listing Status ────────────────────────────────────────────

  async updateListingStatusByAdmin(
    listingId: string | bigint,
    status: ListingStatus,
  ) {
    const listing = await prisma.listing.findUnique({
      where: { id: BigInt(listingId) },
    });
    if (!listing) throw new AppError("Listing not found", 404);
    return prisma.listing.update({
      where: { id: BigInt(listingId) },
      data: { status },
    });
  }

  // ─── Get Public Listings ──────────────────────────────────────────────────────

  async getPublicListings() {
    return prisma.listing.findMany({
      where: { status: ListingStatus.PUBLISHED },
      include: {
        media: true,
        propertyType: true,
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { id: "desc" },
      take: 20,
    });
  }

  // ─── Get Public Listing By Id ────────────────────────────────────────────────
  async getPublicListingById(listingId: string | bigint) {
    let idBigInt: bigint | undefined = undefined;
    try {
      idBigInt = BigInt(listingId as any);
    } catch {}

    const listing = await prisma.listing.findFirst({
      where: {
        ...(idBigInt !== undefined
          ? { id: idBigInt }
          : { slug: listingId as string }),
        status: ListingStatus.PUBLISHED,
      },
      include: {
        media: true,
        propertyType: true,
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!listing) throw new AppError("Không tìm thấy bất động sản", 404);
    return listing;
  }

  // ─── Admin: Get Dashboard Stats ───────────────────────────────────────────────

  async getDashboardStats() {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Lấy tổng số tin đăng
    const totalListings = await prisma.listing.count();

    // Lấy số tin đăng đang chờ duyệt
    const pendingListings = await prisma.listing.count({
      where: { status: "PENDING_REVIEW" as any },
    });

    // Lấy tổng số bài đăng theo tháng trong năm hiện tại
    // Dùng COALESCE để tính cả listing chưa published (dùng thời điểm hiện tại làm fallback)
    const rawResult = await prisma.$queryRaw<
      { month: number; total: bigint }[]
    >`
      SELECT EXTRACT(MONTH FROM COALESCE(published_at, NOW()))::int AS month,
             COUNT(*)::bigint AS total
      FROM listings
      WHERE EXTRACT(YEAR FROM COALESCE(published_at, NOW())) = ${currentYear}
      GROUP BY month
      ORDER BY month ASC
    `;

    // Tạo mảng đủ từ T1 đến tháng hiện tại
    const currentMonth = now.getMonth() + 1; // 1-indexed
    const postsByMonth: { name: string; total: number }[] = [];
    for (let m = 1; m <= currentMonth; m++) {
      const found = rawResult.find((r) => r.month === m);
      postsByMonth.push({
        name: `T${m}`,
        total: found ? Number(found.total) : 0,
      });
    }

    return { totalListings, pendingListings, postsByMonth };
  }
}
