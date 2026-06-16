import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("demo1234", 10);

  const agency = await prisma.agency.upsert({
    where: { id: "demo-agency" },
    update: {},
    create: { id: "demo-agency", name: "Agencia Demo" },
  });

  await prisma.user.upsert({
    where: { email: "agencia@5stars.local" },
    update: {},
    create: { email: "agencia@5stars.local", passwordHash: hash, role: "AGENCY_ADMIN", agencyId: agency.id },
  });

  const business = await prisma.business.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      id: "demo-business",
      name: "Restaurante Demo",
      slug: "demo",
      googleReviewUrl: "https://www.google.com/search?q=restaurante+demo",
      starThreshold: 5,
      agencyId: agency.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "negocio@5stars.local" },
    update: {},
    create: { email: "negocio@5stars.local", passwordHash: hash, role: "BUSINESS_ADMIN", businessId: business.id },
  });

  const sellerUser = await prisma.user.upsert({
    where: { email: "vendedor@5stars.local" },
    update: {},
    create: { email: "vendedor@5stars.local", passwordHash: hash, role: "SELLER", businessId: business.id },
  });

  await prisma.seller.upsert({
    where: { businessId_slug: { businessId: business.id, slug: "juan" } },
    update: { userId: sellerUser.id },
    create: { name: "Juan", slug: "juan", businessId: business.id, userId: sellerUser.id },
  });

  const existingQuestions = await prisma.question.count({ where: { businessId: business.id } });
  if (existingQuestions === 0) {
    await prisma.question.create({
      data: { businessId: business.id, text: "¿Cómo te atendieron?", type: "TEXT", order: 0 },
    });
    await prisma.question.create({
      data: { businessId: business.id, text: "¿Volverías?", type: "MULTIPLE_CHOICE", options: ["Sí", "No"], order: 1 },
    });
  }

  console.log("Demo listo:");
  console.log("  Super admin:    admin@5stars.local / admin1234");
  console.log("  Agencia:        agencia@5stars.local / demo1234");
  console.log("  Negocio:        negocio@5stars.local / demo1234");
  console.log("  Vendedor:       vendedor@5stars.local / demo1234");
  console.log("  Link público:   /r/demo  y  /r/demo/juan");
}

main().finally(() => prisma.$disconnect());
