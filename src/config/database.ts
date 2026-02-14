import { AppError } from "../utils/customErrors.js";
import { PrismaClient } from "../generated/client/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new AppError(
    "DATABASE_URL is not defined in environment variables",
    404,
    "DB_URL_NOT_FOUND",
  );
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({ adapter });

export default prisma;
