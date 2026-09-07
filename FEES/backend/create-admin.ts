import prisma from './src/config/database';
import bcrypt from 'bcryptjs';

async function main() {
  const password = 'Admin@123';
  const passwordHash = await bcrypt.hash(password, 10);

  const school = await prisma.school.upsert({
    where: {
      name: 'Fees Local Test School',
    },
    update: {},
    create: {
      name: 'Fees Local Test School',
      email: 'feeslocal@school.test',
      phone: '9999999999',
      city: 'Nashik',
      state: 'Maharashtra',
      country: 'India',
      status: 'active',
      is_active: true,
      plan_type: 'trial',
      subscription_plan: 'trial',
      subscription_status: 'active',
      max_students: 500,
      max_users: 20,
      created_by: 'local-test',
    },
  });

  const user = await prisma.app_user.upsert({
    where: {
      email: 'admin@feeslocal.com',
    },
    update: {
      password_hash: passwordHash,
      school_id: school.id,
      status: 'active',
    },
    create: {
      school_id: school.id,
      name: 'Local Admin',
      email: 'admin@feeslocal.com',
      password_hash: passwordHash,
      role: 'admin',
      status: 'active',
      created_by: 'local-test',
    },
  });

  console.log('School:', school.name, school.id.toString());
  console.log('User:', user.email, user.id.toString());
  console.log('Password:', password);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });