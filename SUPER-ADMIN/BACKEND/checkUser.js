const prisma = require('./config/prisma');

async function main() {
  const users = await prisma.service_provider_staff.findMany({
    select: {
      id: true,
      full_name: true,
      email: true,
      password_hash: true,
      is_active: true,
      internal_role: true,
    },
  });

  console.log(users);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });