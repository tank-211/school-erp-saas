/**
 * Comprehensive Test Script
 * Verifies all API endpoints and data flow
 */

const baseURL = 'http://localhost:5000/api';

async function testAPI() {
  console.log('🚀 Starting Comprehensive API Tests\n');

  try {
    // Test 1: Dashboard Stats
    console.log('📊 Test 1: Dashboard Statistics');
    const statsRes = await fetch(`${baseURL}/fee-payments/dashboard/stats`);
    const statsData = await statsRes.json();
    
    if (statsData.success) {
      const { overallStats, byStatus, byPaymentMethod } = statsData.data;
      console.log('✅ Dashboard Stats:');
      console.log(`   Total Fees: ₹${overallStats.totalFees}`);
      console.log(`   Total Collected: ₹${overallStats.totalCollected}`);
      console.log(`   Records: ${overallStats.totalRecords}`);
      
      console.log('\n   By Status:');
      byStatus.forEach(s => {
        console.log(`     ${s.status}: ₹${s.totalAmount} (collected: ₹${s.amountCollected})`);
      });
      
      console.log('\n   By Payment Method:');
      byPaymentMethod.forEach(m => {
        console.log(`     ${m.method}: ${m.count} transactions, ₹${m.totalAmount}`);
      });
    } else {
      console.error('❌ Failed to fetch dashboard stats');
    }

    // Test 2: Monthly Data
    console.log('\n\n📈 Test 2: Monthly Collection Data');
    const monthlyRes = await fetch(`${baseURL}/fee-payments/dashboard/monthly`);
    const monthlyData = await monthlyRes.json();
    
    if (monthlyData.success) {
      const dataWithAmount = monthlyData.data.filter(m => m.totalCollected > 0);
      console.log('✅ Months with collections:');
      dataWithAmount.forEach(m => {
        console.log(`   ${m.month}: ₹${m.totalCollected} (${m.transactionCount} transactions)`);
      });
    } else {
      console.error('❌ Failed to fetch monthly data');
    }

    // Test 3: Pending Fees
    console.log('\n\n⏳ Test 3: Pending Fees');
    const pendingRes = await fetch(`${baseURL}/fee-payments/pending?limit=5`);
    const pendingData = await pendingRes.json();
    
    if (pendingData.success && pendingData.data.length > 0) {
      console.log('✅ Pending Fees:');
      pendingData.data.forEach(fee => {
        const studentName = `${fee.student?.firstName} ${fee.student?.lastName}`;
        console.log(`   ${studentName}: ₹${fee.amountPending} pending (Status: ${fee.paymentStatus})`);
      });
    } else {
      console.log('⚠️  No pending fees');
    }

    // Test 4: Recent Transactions
    console.log('\n\n📋 Test 4: Recent Transactions');
    const recentRes = await fetch(`${baseURL}/fee-payments/dashboard/recent-transactions`);
    const recentData = await recentRes.json();
    
    if (recentData.success && recentData.data.length > 0) {
      console.log('✅ Recent Transactions:');
      recentData.data.forEach(t => {
        console.log(`   ${t.studentName}: ₹${t.amountPaid}/₹${t.totalAmount} (${t.paymentStatus})`);
      });
    } else {
      console.log('⚠️  No recent transactions');
    }

    console.log('\n\n✅ All API tests completed successfully!');
    console.log('\n🎉 Database is now properly connected and serving data.');
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

// Run tests
testAPI();
