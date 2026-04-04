import ExcelJS from "exceljs";
import prisma from "../config/database.js";
import type { Response } from "express";
import { ReportRepository } from "../repositories/report.repository.js";
import type { CreateReportRequest } from "../dtos/report/create-report.dto.js";
import type { UpdateReportStatusRequest } from "../dtos/report/update-report.dto.js";
import { AppError } from "../utils/customErrors.js";
import { ReportStatus, ListingStatus } from "@prisma/client";

type ReportType = "properties" | "users" | "listings" | "summary";

export class ReportController {
  private readonly reportRepository: ReportRepository;
  constructor() {
    this.reportRepository = new ReportRepository();
  }
  // ─── Helper: Style header row ──────────────────────────────────────────────
  private styleHeaderRow(sheet: ExcelJS.Worksheet) {
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" }, // blue-600
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 30;

    // Borders for header
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "medium" },
        right: { style: "thin" },
      };
    });
  }

  // ─── Helper: Auto-fit column widths ──────────────────────────────────────
  private autoFitColumns(sheet: ExcelJS.Worksheet) {
    sheet.columns.forEach((column) => {
      if (!column || !column.eachCell) return;
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? cell.value.toString() : "";
        maxLength = Math.max(maxLength, cellValue.length + 4);
      });
      column.width = Math.min(maxLength, 50);
    });
  }

  // ─── Helper: Style data rows ─────────────────────────────────────────────
  private styleDataRows(sheet: ExcelJS.Worksheet) {
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      row.alignment = { vertical: "middle", wrapText: true };
      if (rowNumber % 2 === 0) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF1F5F9" }, // slate-100
        };
      }
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    });
  }

  // ─── Map listing status to Vietnamese ─────────────────────────────────────
  private mapListingStatus(status: string): string {
    const map: Record<string, string> = {
      DRAFT: "Nháp",
      PENDING_REVIEW: "Chờ duyệt",
      PUBLISHED: "Đang cho thuê",
      HIDDEN: "Ẩn",
      SOLD: "Đã thuê",
      EXPIRED: "Hết hạn",
      REJECTED: "Từ chối",
    };
    return map[status] || status;
  }

  // ─── Map user status to Vietnamese ────────────────────────────────────────
  private mapUserStatus(status: string): string {
    const map: Record<string, string> = {
      PENDING_VERIFICATION: "Chờ xác minh",
      ACTIVE: "Hoạt động",
      LOCKED: "Bị khóa",
      BANNED: "Bị cấm",
    };
    return map[status] || status;
  }

  // ─── Map account type to Vietnamese ───────────────────────────────────────
  private mapAccountType(type: string): string {
    const map: Record<string, string> = {
      MEMBER: "User",
      AGENT: "Agent",
      ADMIN: "Admin",
    };
    return map[type] || type;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHEET 1: Properties (Báo cáo danh sách bất động sản)
  // ═══════════════════════════════════════════════════════════════════════════
  private async addPropertiesSheet(workbook: ExcelJS.Workbook) {
    const sheet = workbook.addWorksheet("Properties", {
      properties: { tabColor: { argb: "FF2563EB" } },
    });

    sheet.columns = [
      { header: "ID Bất động sản", key: "id" },
      { header: "Tiêu đề", key: "title" },
      { header: "Loại", key: "propertyType" },
      { header: "Địa chỉ", key: "address" },
      { header: "Giá thuê (VNĐ)", key: "price" },
      { header: "Diện tích (m²)", key: "area" },
      { header: "Trạng thái", key: "status" },
      { header: "Ngày đăng", key: "publishedAt" },
      { header: "Chủ sở hữu", key: "owner" },
    ];

    const listings = await prisma.listing.findMany({
      include: {
        propertyType: true,
        user: {
          select: {
            email: true,
            profile: { select: { displayName: true } },
          },
        },
      },
      orderBy: { id: "desc" },
    });

    for (const listing of listings) {
      sheet.addRow({
        id: listing.id.toString(),
        title: listing.title,
        propertyType: listing.propertyType?.name || "",
        address: listing.addressDisplay || "",
        price: listing.price ? Number(listing.price) : 0,
        area: Number(listing.areaGross),
        status: this.mapListingStatus(listing.status),
        publishedAt: listing.publishedAt
          ? new Date(listing.publishedAt).toLocaleDateString("vi-VN")
          : "Chưa đăng",
        owner: listing.user?.profile?.displayName || listing.user?.email || "",
      });
    }

    // Format price column as number
    sheet.getColumn("price").numFmt = "#,##0";
    sheet.getColumn("area").numFmt = "#,##0.00";

    this.styleHeaderRow(sheet);
    this.autoFitColumns(sheet);
    this.styleDataRows(sheet);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHEET 2: Users (Báo cáo người dùng)
  // ═══════════════════════════════════════════════════════════════════════════
  private async addUsersSheet(workbook: ExcelJS.Workbook) {
    const sheet = workbook.addWorksheet("Users", {
      properties: { tabColor: { argb: "FF6366F1" } },
    });

    sheet.columns = [
      { header: "User ID", key: "id" },
      { header: "Họ tên", key: "displayName" },
      { header: "Email", key: "email" },
      { header: "SĐT", key: "phone" },
      { header: "Vai trò", key: "role" },
      { header: "Ngày đăng ký", key: "createdAt" },
      { header: "Trạng thái", key: "status" },
    ];

    const users = await prisma.user.findMany({
      include: {
        profile: { select: { displayName: true } },
      },
      orderBy: { id: "desc" },
    });

    for (const user of users) {
      sheet.addRow({
        id: user.id.toString(),
        displayName: user.profile?.displayName || "",
        email: user.email || "",
        phone: user.phoneNumber || "",
        role: this.mapAccountType(user.accountType),
        createdAt: new Date(user.createdAt).toLocaleDateString("vi-VN"),
        status: this.mapUserStatus(user.status),
      });
    }

    this.styleHeaderRow(sheet);
    this.autoFitColumns(sheet);
    this.styleDataRows(sheet);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHEET 3: Listings (Báo cáo tin đăng)
  // ═══════════════════════════════════════════════════════════════════════════
  private async addListingsSheet(workbook: ExcelJS.Workbook) {
    const sheet = workbook.addWorksheet("Listings", {
      properties: { tabColor: { argb: "FF10B981" } },
    });

    sheet.columns = [
      { header: "ID Tin", key: "id" },
      { header: "Tiêu đề", key: "title" },
      { header: "Người đăng", key: "poster" },
      { header: "Số lượt yêu thích", key: "favorites" },
      { header: "Trạng thái duyệt", key: "status" },
      { header: "Ngày đăng", key: "publishedAt" },
    ];

    const listings = await prisma.listing.findMany({
      include: {
        user: {
          select: {
            email: true,
            profile: { select: { displayName: true } },
          },
        },
        _count: {
          select: { favoritedBy: true },
        },
      },
      orderBy: { id: "desc" },
    });

    for (const listing of listings) {
      sheet.addRow({
        id: listing.id.toString(),
        title: listing.title,
        poster: listing.user?.profile?.displayName || listing.user?.email || "",
        favorites: listing._count?.favoritedBy || 0,
        status: this.mapListingStatus(listing.status),
        publishedAt: listing.publishedAt
          ? new Date(listing.publishedAt).toLocaleDateString("vi-VN")
          : "Chưa đăng",
      });
    }

    this.styleHeaderRow(sheet);
    this.autoFitColumns(sheet);
    this.styleDataRows(sheet);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHEET 4: Summary (Báo cáo tổng hợp)
  // ═══════════════════════════════════════════════════════════════════════════
  private async addSummarySheet(workbook: ExcelJS.Workbook) {
    const sheet = workbook.addWorksheet("Summary", {
      properties: { tabColor: { argb: "FFF59E0B" } },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all summary data
    const [totalUsers, totalListings, listingsThisMonth, topListings] =
      await Promise.all([
        prisma.user.count({ where: { accountType: { not: "ADMIN" as any } } }),
        prisma.listing.count(),
        prisma.listing.count({
          where: {
            publishedAt: { gte: startOfMonth },
          },
        }),
        prisma.listing.findMany({
          include: {
            _count: { select: { favoritedBy: true } },
          },
          orderBy: { favoritedBy: { _count: "desc" } },
          take: 10,
        }),
      ]);

    // ── Summary info section ──
    sheet.columns = [
      { header: "Chỉ số", key: "metric", width: 40 },
      { header: "Giá trị", key: "value", width: 30 },
    ];

    sheet.addRow({ metric: "Tổng số người dùng", value: totalUsers });
    sheet.addRow({ metric: "Tổng số bất động sản", value: totalListings });
    sheet.addRow({
      metric: `Tổng số tin được đăng trong tháng ${now.getMonth() + 1}/${now.getFullYear()}`,
      value: listingsThisMonth,
    });
    sheet.addRow({ metric: "", value: "" }); // blank row
    sheet.addRow({ metric: "TOP 10 BĐS ĐƯỢC YÊU THÍCH NHIỀU NHẤT", value: "" });

    // Top listings
    for (let i = 0; i < topListings.length; i++) {
      const listing = topListings[i];
      if (!listing) continue;
      sheet.addRow({
        metric: `${i + 1}. ${listing.title}`,
        value: `${listing._count?.favoritedBy || 0} lượt yêu thích`,
      });
    }

    this.styleHeaderRow(sheet);

    // Style the "TOP" row
    const topRowIndex = 6; // row 6 (header=1, 3 data + blank = 5)
    const topRow = sheet.getRow(topRowIndex);
    topRow.font = { bold: true, size: 11, color: { argb: "FF1E40AF" } };

    this.styleDataRows(sheet);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN: Generate Excel report with selected sheets
  // ═══════════════════════════════════════════════════════════════════════════
  async generateReport(reportTypes: ReportType[], res: Response) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "WebMoiGioi Admin";
    workbook.created = new Date();

    for (const type of reportTypes) {
      switch (type) {
        case "properties":
          await this.addPropertiesSheet(workbook);
          break;
        case "users":
          await this.addUsersSheet(workbook);
          break;
        case "listings":
          await this.addListingsSheet(workbook);
          break;
        case "summary":
          await this.addSummarySheet(workbook);
          break;
      }
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const fileName = `BaoCao_${dateStr}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  async createReport(reporterId: bigint, data: CreateReportRequest) {
    const listingId = BigInt(data.listingId);

    // Verify listing exists
    const listing = await this.reportRepository.findListingById(listingId);
    if (!listing) {
      throw new AppError("Listing not found", 404);
    }

    // Check if reporter already reported this listing
    const existing = await this.reportRepository.findExistingReport(
      listingId,
      reporterId,
    );
    if (existing) {
      throw new AppError("Bạn đã báo cáo bài đăng này rồi.", 400);
    }

    // Create report
    return this.reportRepository.createReport(
      listingId,
      reporterId,
      data.reasonCode,
      data.description,
    );
  }

  async getAdminReports() {
    return this.reportRepository.findAllReportsWithDetails();
  }

  async updateReportStatus(reportId: bigint, data: UpdateReportStatusRequest) {
    const report = await this.reportRepository.findReportById(reportId);
    if (!report) {
      throw new AppError("Report not found", 404);
    }

    if (data.status === ReportStatus.VERIFIED) {
      return this.reportRepository.updateReportAndListingStatus(
        reportId,
        data.status,
        report.listingId,
        ListingStatus.REJECTED,
      );
    } else {
      return this.reportRepository.updateReportStatus(reportId, data.status);
    }
  }
}
