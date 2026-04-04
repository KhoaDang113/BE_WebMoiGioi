import { ReportRepository } from "../repositories/report.repository.js";
import type { CreateReportRequest } from "../dtos/report/create-report.dto.js";
import type { UpdateReportStatusRequest } from "../dtos/report/update-report.dto.js";
import { AppError } from "../utils/customErrors.js";
import { ReportStatus, ListingStatus } from "../generated/client/client.js";

export class ReportController {
  private reportRepository: ReportRepository;

  constructor() {
    this.reportRepository = new ReportRepository();
  }

  async createReport(reporterId: bigint, data: CreateReportRequest) {
    const listingId = BigInt(data.listingId);

    // Verify listing exists
    const listing = await this.reportRepository.findListingById(listingId);
    if (!listing) {
      throw new AppError("Listing not found", 404);
    }
    
    // Check if reporter already reported this listing
    const existing = await this.reportRepository.findExistingReport(listingId, reporterId);
    if (existing) {
      throw new AppError("Bạn đã báo cáo bài đăng này rồi.", 400);
    }

    // Create report
    return this.reportRepository.createReport(
      listingId,
      reporterId,
      data.reasonCode,
      data.description
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
        ListingStatus.REJECTED
      );
    } else {
      return this.reportRepository.updateReportStatus(reportId, data.status);
    }
  }
}
