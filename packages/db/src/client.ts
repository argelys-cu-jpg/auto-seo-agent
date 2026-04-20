import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPool?: unknown;
};
const require = createRequire(import.meta.url);

function tryCreatePgAdapter(connectionString: string) {
  try {
    const { PrismaPg } = require("@prisma/adapter-pg") as { PrismaPg: new (pool: unknown) => unknown };
    const { Pool } = require("pg") as {
      Pool: new (options: { connectionString: string; max: number }) => unknown;
    };

    const pool =
      globalForPrisma.prismaPool ??
      new Pool({
        connectionString,
        max: process.env.NODE_ENV === "production" ? 5 : 10,
      });

    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prismaPool = pool;
    }

    return { adapter: new PrismaPg(pool) };
  } catch {
    return null;
  }
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to initialize Prisma.");
  }

  const adapterBundle = tryCreatePgAdapter(connectionString);

  if (adapterBundle) {
    return new PrismaClient({
      adapter: adapterBundle.adapter as never,
      log: ["warn", "error"],
    });
  }

  return new PrismaClient({ log: ["warn", "error"] });
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
