import prisma from "../config/database.js";
import { ReportReason, ReportStatus, type Report, ListingStatus } from "@prisma/client";

export class ReportRepository {
  async createReport(
    listingId: bigint,
    reporterId: bigint,
    reasonCode: ReportReason,
    description?: string,
  ): Promise<Report> {
    return prisma.report.create({
      data: {
        listingId,
        reporterId,
        reasonCode,
        description: description ?? null,
      },
    });
  }

  async findExistingReport(listingId: bigint, reporterId: bigint): Promise<Report | null> {
    return prisma.report.findFirst({
      where: {
        listingId,
        reporterId,
      },
    });
  }

  async findListingById(id: bigint) {
    return prisma.listing.findUnique({
      where: { id },
      select: { id: true, status: true }
    });
  }

  async findAllReportsWithDetails() {
    return prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        listing: {
          select: { title: true, status: true, slug: true }
        },
        reporter: {
          select: { email: true, profile: { select: { displayName: true } } }
        }
      }
    });
  }

  async findReportById(id: bigint) {
    return prisma.report.findUnique({ where: { id } });
  }

  async updateReportAndListingStatus(reportId: bigint, newReportStatus: ReportStatus, listingId: bigint, newListingStatus: ListingStatus) {
    const [report] = await prisma.$transaction([
      prisma.report.update({ where: { id: reportId }, data: { status: newReportStatus } }),
      prisma.listing.update({ where: { id: listingId }, data: { status: newListingStatus } })
    ]);
    return report;
  }

  async updateReportStatus(id: bigint, status: ReportStatus) {
    return prisma.report.update({
      where: { id },
      data: { status }
    });
  }
}
