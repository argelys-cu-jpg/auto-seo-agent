export async function isDatabaseReady(): Promise<boolean> {
  try {
    const dbModule = await import("@cookunity-seo-agent/db");
    const prisma = dbModule.prisma;
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
