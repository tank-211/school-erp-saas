import prisma from '../src/config/database';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Starting database seed...');

  // ============================================================
  // SCHOOL
  // ============================================================

  const school = await prisma.school.upsert({
    where: {
      email: 'feeslocal@school.com',
    },
    update: {},
    create: {
      name: 'Fees Local School',
      email: 'feeslocal@school.com',
      phone: '9999999999',
      address: 'Main Road',
      city: 'Nashik',
      state: 'Maharashtra',
      postal_code: '422001',
      country: 'India',
      principal_name: 'School Principal',
      status: 'active',
      is_active: true,
      plan_type: 'trial',
      subscription_plan: 'trial',
      subscription_status: 'active',
    },
  });

  console.log('✓ School:', school.name);

  // ============================================================
  // ADMIN USER
  // ============================================================

  const passwordHash = await bcrypt.hash('Admin@2024', 10);

  const admin = await prisma.app_user.upsert({
    where: {
      email: 'admin@feeslocal.com',
    },
    update: {
      password_hash: passwordHash,
      school_id: school.id,
      status: 'active',
      role: 'admin',
    },
    create: {
      school_id: school.id,
      name: 'Admin User',
      email: 'admin@feeslocal.com',
      password_hash: passwordHash,
      role: 'admin',
      status: 'active',
    },
  });

  console.log('✓ Admin:', admin.email);

  // ============================================================
  // ACADEMIC YEAR
  // ============================================================

  const academicYear = await prisma.academic_year.upsert({
    where: {
      school_id_year_name: {
        school_id: school.id,
        year_name: '2026-2027',
      },
    },
    update: {},
    create: {
      school_id: school.id,
      year_name: '2026-2027',
      start_date: new Date('2026-06-01'),
      end_date: new Date('2027-05-31'),
      is_active: true,
      status: 'active',
      created_by: admin.id.toString(),
    },
  });

  console.log('✓ Academic year:', academicYear.year_name);

  // ============================================================
  // CLASSES
  // ============================================================

  const class10 = await prisma.school_class.upsert({
    where: {
      school_id_class_name: {
        school_id: school.id,
        class_name: '10th',
      },
    },
    update: {},
    create: {
      school_id: school.id,
      class_name: '10th',
      class_numeric_value: 10,
      medium: 'English',
      description: 'Class 10',
    },
  });

  const class11 = await prisma.school_class.upsert({
    where: {
      school_id_class_name: {
        school_id: school.id,
        class_name: '11th',
      },
    },
    update: {},
    create: {
      school_id: school.id,
      class_name: '11th',
      class_numeric_value: 11,
      medium: 'English',
      description: 'Class 11',
    },
  });

  console.log('✓ Classes created');

  // ============================================================
  // SECTIONS
  // ============================================================

  const sectionA = await prisma.section.upsert({
    where: {
      class_id_section_name: {
        class_id: class10.id,
        section_name: 'A',
      },
    },
    update: {},
    create: {
      school_id: school.id,
      class_id: class10.id,
      section_name: 'A',
      capacity: 60,
      class_teacher: 'John Teacher',
    },
  });

  const sectionB = await prisma.section.upsert({
    where: {
      class_id_section_name: {
        class_id: class10.id,
        section_name: 'B',
      },
    },
    update: {},
    create: {
      school_id: school.id,
      class_id: class10.id,
      section_name: 'B',
      capacity: 60,
      class_teacher: 'Jane Teacher',
    },
  });

  console.log('✓ Sections created');

  // ============================================================
  // FEE STRUCTURE
  // ============================================================

  const tuitionFee = await prisma.fee_structure.upsert({
    where: {
      academic_year_id_class_id_fee_type: {
        academic_year_id: academicYear.id,
        class_id: class10.id,
        fee_type: 'Tuition Fee',
      },
    },
    update: {},
    create: {
      school_id: school.id,
      academic_year_id: academicYear.id,
      class_id: class10.id,
      fee_type: 'Tuition Fee',
      amount: 80000,
      due_date: new Date('2026-07-31'),
      description: 'Annual tuition fee',
      is_active: true,
    },
  });

  const libraryFee = await prisma.fee_structure.upsert({
    where: {
      academic_year_id_class_id_fee_type: {
        academic_year_id: academicYear.id,
        class_id: class10.id,
        fee_type: 'Library Fee',
      },
    },
    update: {},
    create: {
      school_id: school.id,
      academic_year_id: academicYear.id,
      class_id: class10.id,
      fee_type: 'Library Fee',
      amount: 15000,
      due_date: new Date('2026-07-31'),
      description: 'Library fee',
      is_active: true,
    },
  });

  const labFee = await prisma.fee_structure.upsert({
    where: {
      academic_year_id_class_id_fee_type: {
        academic_year_id: academicYear.id,
        class_id: class10.id,
        fee_type: 'Laboratory Fee',
      },
    },
    update: {},
    create: {
      school_id: school.id,
      academic_year_id: academicYear.id,
      class_id: class10.id,
      fee_type: 'Laboratory Fee',
      amount: 15000,
      due_date: new Date('2026-07-31'),
      description: 'Laboratory fee',
      is_active: true,
    },
  });

  const examFee = await prisma.fee_structure.upsert({
    where: {
      academic_year_id_class_id_fee_type: {
        academic_year_id: academicYear.id,
        class_id: class10.id,
        fee_type: 'Exam Fee',
      },
    },
    update: {},
    create: {
      school_id: school.id,
      academic_year_id: academicYear.id,
      class_id: class10.id,
      fee_type: 'Exam Fee',
      amount: 10000,
      due_date: new Date('2026-07-31'),
      description: 'Examination fee',
      is_active: true,
    },
  });

  console.log('✓ Fee structures created');

  // ============================================================
  // STUDENTS
  // ============================================================

  const student1 = await prisma.student.upsert({
    where: {
      admission_number: 'ADM001',
    },
    update: {},
    create: {
      school_id: school.id,
      admission_number: 'ADM001',
      first_name: 'Rahul',
      last_name: 'Kumar',
      date_of_birth: new Date('2010-05-15'),
      gender: 'Male',
      email: 'rahul@example.com',
      phone: '9876543210',
      address: 'Main Road',
      city: 'Nashik',
      state: 'Maharashtra',
      postal_code: '422001',
      country: 'India',
      status: 'active',
    },
  });

  const student2 = await prisma.student.upsert({
    where: {
      admission_number: 'ADM002',
    },
    update: {},
    create: {
      school_id: school.id,
      admission_number: 'ADM002',
      first_name: 'Priya',
      last_name: 'Singh',
      date_of_birth: new Date('2010-08-20'),
      gender: 'Female',
      email: 'priya@example.com',
      phone: '9876543211',
      city: 'Nashik',
      state: 'Maharashtra',
      country: 'India',
      status: 'active',
    },
  });

  const student3 = await prisma.student.upsert({
    where: {
      admission_number: 'ADM003',
    },
    update: {},
    create: {
      school_id: school.id,
      admission_number: 'ADM003',
      first_name: 'Arun',
      last_name: 'Patel',
      date_of_birth: new Date('2010-11-10'),
      gender: 'Male',
      email: 'arun@example.com',
      phone: '9876543212',
      city: 'Nashik',
      state: 'Maharashtra',
      country: 'India',
      status: 'active',
    },
  });

  console.log('✓ 3 students created');

  // ============================================================
  // ADMISSIONS
  // ============================================================

  const admission1 = await prisma.admission.create({
    data: {
      school_id: school.id,
      student_id: student1.id,
      academic_year_id: academicYear.id,
      class_id: class10.id,
      section_id: sectionA.id,
      admission_date: new Date('2026-06-10'),
      status: 'active',
      admission_type: 'new',
      registration_number: 'REG001',
    },
  });

  const admission2 = await prisma.admission.create({
    data: {
      school_id: school.id,
      student_id: student2.id,
      academic_year_id: academicYear.id,
      class_id: class10.id,
      section_id: sectionA.id,
      admission_date: new Date('2026-06-10'),
      status: 'active',
      admission_type: 'new',
      registration_number: 'REG002',
    },
  });

  const admission3 = await prisma.admission.create({
    data: {
      school_id: school.id,
      student_id: student3.id,
      academic_year_id: academicYear.id,
      class_id: class10.id,
      section_id: sectionB.id,
      admission_date: new Date('2026-06-10'),
      status: 'active',
      admission_type: 'new',
      registration_number: 'REG003',
    },
  });

  console.log('✓ Admissions created');

  // ============================================================
  // INVOICES
  // ============================================================

  const invoice1 = await prisma.invoice.upsert({
    where: {
      invoice_number: 'INV001',
    },
    update: {},
    create: {
      school_id: school.id,
      student_id: student1.id,
      invoice_number: 'INV001',
      invoice_date: new Date('2026-07-01'),
      due_date: new Date('2026-07-31'),
      total_amount: 120000,
      paid_amount: 60000,
      pending_amount: 60000,
      status: 'partial',
      notes: 'Partial payment received',
      created_by: admin.id.toString(),
    },
  });

  const invoice2 = await prisma.invoice.upsert({
    where: {
      invoice_number: 'INV002',
    },
    update: {},
    create: {
      school_id: school.id,
      student_id: student2.id,
      invoice_number: 'INV002',
      invoice_date: new Date('2026-07-01'),
      due_date: new Date('2026-07-31'),
      total_amount: 120000,
      paid_amount: 120000,
      pending_amount: 0,
      status: 'paid',
      notes: 'Full payment received',
      created_by: admin.id.toString(),
    },
  });

  const invoice3 = await prisma.invoice.upsert({
    where: {
      invoice_number: 'INV003',
    },
    update: {},
    create: {
      school_id: school.id,
      student_id: student3.id,
      invoice_number: 'INV003',
      invoice_date: new Date('2026-07-01'),
      due_date: new Date('2026-07-31'),
      total_amount: 120000,
      paid_amount: 0,
      pending_amount: 120000,
      status: 'overdue',
      notes: 'Payment pending',
      created_by: admin.id.toString(),
    },
  });

  console.log('✓ Invoices created');

  // ============================================================
  // PAYMENTS
  // ============================================================

  const payment1 = await prisma.payment.upsert({
    where: {
      payment_number: 'PAY001',
    },
    update: {},
    create: {
      school_id: school.id,
      student_id: student1.id,
      invoice_id: invoice1.id,
      payment_number: 'PAY001',
      amount: 40000,
      payment_date: new Date('2026-07-10'),
      payment_method: 'ONLINE',
      transaction_id: 'TXN001',
      status: 'completed',
      remarks: 'Online payment',
      received_by: admin.name,
    },
  });

  const payment2 = await prisma.payment.upsert({
    where: {
      payment_number: 'PAY002',
    },
    update: {},
    create: {
      school_id: school.id,
      student_id: student1.id,
      invoice_id: invoice1.id,
      payment_number: 'PAY002',
      amount: 20000,
      payment_date: new Date('2026-08-05'),
      payment_method: 'CHEQUE',
      transaction_id: 'CHQ001',
      cheque_number: 'CHQ001',
      bank_name: 'HDFC Bank',
      status: 'completed',
      remarks: 'Cheque payment',
      received_by: admin.name,
    },
  });

  const payment3 = await prisma.payment.upsert({
    where: {
      payment_number: 'PAY003',
    },
    update: {},
    create: {
      school_id: school.id,
      student_id: student2.id,
      invoice_id: invoice2.id,
      payment_number: 'PAY003',
      amount: 120000,
      payment_date: new Date('2026-07-15'),
      payment_method: 'ONLINE',
      transaction_id: 'TXN002',
      status: 'completed',
      remarks: 'Full payment',
      received_by: admin.name,
    },
  });

  console.log('✓ 3 payments created');

  // ============================================================
  // REFUND REQUEST
  // ============================================================

  await prisma.refund_request.create({
    data: {
      school_id: school.id,
      student_id: student2.id,
      payment_id: payment3.id,
      amount: 10000,
      reason: 'Excess payment',
      description: 'Refund requested for excess payment',
      status: 'PENDING',
      notes: 'Sample refund request',
    },
  });

  console.log('✓ Refund request created');

  console.log('');
  console.log('========================================');
  console.log('✅ DATABASE SEED COMPLETED');
  console.log('========================================');
  console.log('School: Fees Local School');
  console.log('Students: 3');
  console.log('Invoices: 3');
  console.log('Payments: 3');
  console.log('Refund requests: 1');
  console.log('Collected: ₹180,000');
  console.log('Pending: ₹180,000');
  console.log('Admin: admin@feeslocal.com');
  console.log('Password: Admin@2024');
  console.log('========================================');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });