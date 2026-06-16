import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@5stars.local";
  const passwordHash = await bcrypt.hash("admin1234", 10);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, role: "SUPER_ADMIN" },
  });
  console.log("Seeded super admin:", email);
}
main().finally(() => prisma.$disconnect());
