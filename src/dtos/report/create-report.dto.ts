import { z } from "zod";
import { ReportReason } from "@prisma/client";

export const CreateReportRequestSchema = z.object({
  listingId: z.string().min(1, "Listing ID is required"),
  reasonCode: z.nativeEnum(ReportReason, {
    message: "Invalid reason code",
  }),
  description: z.string().optional(),
});

export type CreateReportRequest = z.infer<typeof CreateReportRequestSchema>;
