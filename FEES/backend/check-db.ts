import prisma from './src/config/database';

async function checkDatabase() {
  try {
    console.log('🔍 Checking database records...\n');

    // Check students
    const studentCount = await prisma.student.count();
    console.log(`✓ Students: ${studentCount}`);

    // Check fee payments
    const feePaymentCount = await prisma.feePayment.count();
    console.log(`✓ Fee Payments: ${feePaymentCount}`);

    // Check payments
    const paymentCount = await prisma.payment.count();
    console.log(`✓ Payment Transactions: ${paymentCount}`);

    // Check courses
    const courseCount = await prisma.course.count();
    console.log(`✓ Courses: ${courseCount}`);

    // Check fee structures
    const feeStructureCount = await prisma.feeStructure.count();
    console.log(`✓ Fee Structures: ${feeStructureCount}`);

    console.log('\n📊 Fee Payment Status Breakdown:');
    const feePaymentsByStatus = await prisma.feePayment.groupBy({
      by: ['paymentStatus'],
      _count: true,
      _sum: { totalAmount: true, amountPaid: true },
    });

    feePaymentsByStatus.forEach((item) => {
      console.log(
        `   ${item.paymentStatus}: ${item._count} records, ₹${item._sum.totalAmount || 0} total, ₹${item._sum.amountPaid || 0} collected`
      );
    });

    console.log('\n💳 Payment Methods:');
    const paymentsByMethod = await prisma.payment.groupBy({
      by: ['paymentMethod'],
      _count: true,
      _sum: { amount: true },
    });

    paymentsByMethod.forEach((item) => {
      console.log(`   ${item.paymentMethod}: ${item._count} transactions, ₹${item._sum.amount || 0}`);
    });

    console.log('\n✅ Database verification complete!');
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
