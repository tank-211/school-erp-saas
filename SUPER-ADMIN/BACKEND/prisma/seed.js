require("dotenv").config();

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;

  const existing = await prisma.service_provider_staff.findUnique({
    where: { email },
  });

  if (existing) {
    console.log("✅ Super Admin already exists.");
    return;
  }

  const passwordHash = await bcrypt.hash(
    process.env.SUPER_ADMIN_PASSWORD,
    10
  );

  await prisma.service_provider_staff.create({
    data: {
      full_name: process.env.SUPER_ADMIN_NAME,
      email: process.env.SUPER_ADMIN_EMAIL,
      password_hash: passwordHash,
      internal_role: "super_admin",
      is_active: true,
    },
  });

  console.log("✅ Super Admin created successfully.");
}

async function main() {
  console.log("🌱 Running database seed...");
  await seedSuperAdmin();
  console.log("🎉 Seed completed.");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });