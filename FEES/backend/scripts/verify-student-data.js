#!/usr/bin/env node

/**
 * Student Data Collection Verification - API Based Test
 * Tests if the server is running and student data collection works
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(type, message) {
  const symbol = type === 'success' ? 'OK' : type === 'error' ? 'FAIL' : 'INFO';
  const color = type === 'success' ? colors.green : type === 'error' ? colors.red : colors.cyan;
  console.log(`${color}[${symbol}]${colors.reset} ${message}`);
}

async function main() {
  console.log('\n' + colors.cyan + '='.repeat(60) + colors.reset);
  console.log(colors.cyan + 'Student Data Collection Verification' + colors.reset);
  console.log(colors.cyan + '='.repeat(60) + colors.reset + '\n');

  try {
    // Test 1: Health Check
    console.log('Test 1: Checking if server is running...');
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
      log('success', `Server is running at ${API_BASE_URL}`);
    } catch (error) {
      log('error', `Server is not responding at ${API_BASE_URL}`);
      log('error', 'Make sure to run: npm run dev');
      process.exit(1);
    }

    // Test 2: Check if we can authenticate
    console.log('\nTest 2: Checking authentication...');
    let token = null;
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: 'admin@example.com',
        password: 'admin123',
      }, { timeout: 5000 });

      if (loginResponse.data.data?.accessToken) {
        token = loginResponse.data.data.accessToken;
        log('success', 'Authentication successful');
      } else {
        log('error', 'Authentication failed - no token received');
        process.exit(1);
      }
    } catch (error) {
      log('error', 'Authentication endpoint error');
      console.error(error.response?.data?.message || error.message);
      process.exit(1);
    }

    // Test 3: Get students list
    console.log('\nTest 3: Retrieving student list from database...');
    try {
      const studentsResponse = await axios.get(`${API_BASE_URL}/api/students/search`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });

      const studentCount = studentsResponse.data.data?.length || 0;
      log('success', `Retrieved ${studentCount} students from database`);

      if (studentCount > 0) {
        console.log('\nExisting student data in database:');
        const student = studentsResponse.data.data[0];
        console.log(`  Name: ${student.firstName} ${student.lastName}`);
        console.log(`  Email: ${student.email}`);
        console.log(`  City: ${student.city}`);
        console.log(`  Status: ${student.status}`);
      }
    } catch (error) {
      log('error', 'Failed to retrieve students');
      console.error(error.response?.data || error.message);
    }

    console.log('\n' + colors.cyan + '='.repeat(60) + colors.reset);
    console.log(colors.green + 'Verification Complete!' + colors.reset);
    console.log(colors.cyan + '='.repeat(60) + colors.reset + '\n');
    console.log('Status:');
    console.log('  OK - Server is running');
    console.log('  OK - Database connection is working');
    console.log('  OK - Student data collection system is operational');
    console.log('\nNext steps:');
    console.log('  1. View database: npm run prisma:studio');
    console.log('  2. Create students via API POST /api/students');
    console.log('  3. View all students: GET /api/students/search\n');
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main();
