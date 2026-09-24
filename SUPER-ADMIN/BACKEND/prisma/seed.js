require("dotenv").config();

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME || "Super Admin";

  if (!email) {
    throw new Error("SUPER_ADMIN_EMAIL is missing from .env");
  }

  if (!password) {
    throw new Error("SUPER_ADMIN_PASSWORD is missing from .env");
  }

  const existing = await prisma.service_provider_staff.findUnique({
    where: {
      email,
    },
  });

  // Generate the password hash BEFORE checking whether
  // the account already exists.
  const passwordHash = await bcrypt.hash(password, 10);

  if (existing) {
    await prisma.service_provider_staff.update({
      where: {
        email,
      },
      data: {
        full_name: name,
        password_hash: passwordHash,
        internal_role: "super_admin",
        is_active: true,
      },
    });

    console.log("✅ Existing Super Admin password updated successfully.");
    return;
  }

  await prisma.service_provider_staff.create({
    data: {
      full_name: name,
      email,
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