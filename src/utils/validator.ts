
import type { ZodType } from "zod";
import { AppError } from "./customErrors.js";

export class Validator {
  static validate<T>(schema: ZodType<T>, data: unknown): T {
    const result = schema.safeParse(data);

    if (!result.success) {
      const errorMessages = result.error.issues
        .map((issue) => issue.message)
        .join(", ");
      
      throw new AppError(errorMessages, 400, "VALIDATION_ERROR");
    }

    return result.data;
  }
}
