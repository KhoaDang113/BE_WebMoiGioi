import { z } from "zod";
import { ReportStatus } from "@prisma/client";

export const UpdateReportStatusRequestSchema = z.object({
  status: z.nativeEnum(ReportStatus, {
    message: "Invalid or missing report status",
  }),
});

export type UpdateReportStatusRequest = z.infer<typeof UpdateReportStatusRequestSchema>;
