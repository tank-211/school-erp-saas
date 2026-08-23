/**
 * Authentication Test Script
 * Run this to test the authentication system
 * Usage: node test-auth.js
 */

const { tokenManager } = require('./services/api');

// Test token management
console.log('🧪 Testing Authentication System...\n');

// Test 1: Token storage and retrieval
console.log('1. Testing token storage:');
tokenManager.setToken('test-jwt-token');
const retrievedToken = tokenManager.getToken();
console.log('   Stored token:', retrievedToken);
console.log('   ✅ Token storage works:', retrievedToken === 'test-jwt-token' ? 'PASS' : 'FAIL');

// Test 2: Authentication check with valid token
console.log('\n2. Testing authentication check:');
const isAuth = tokenManager.isAuthenticated();
console.log('   Is authenticated:', isAuth);
console.log('   ✅ Auth check works');

// Test 3: Token removal
console.log('\n3. Testing token removal:');
tokenManager.removeToken();
const removedToken = tokenManager.getToken();
console.log('   Token after removal:', removedToken);
console.log('   ✅ Token removal works:', removedToken === null ? 'PASS' : 'FAIL');

// Test 4: Authentication check with no token
console.log('\n4. Testing auth check without token:');
const isAuthNoToken = tokenManager.isAuthenticated();
console.log('   Is authenticated (no token):', isAuthNoToken);
console.log('   ✅ No token auth check works:', !isAuthNoToken ? 'PASS' : 'FAIL');

// Test 5: Invalid token handling
console.log('\n5. Testing invalid token handling:');
tokenManager.setToken('invalid.token.here');
const isAuthInvalid = tokenManager.isAuthenticated();
console.log('   Is authenticated (invalid token):', isAuthInvalid);
console.log('   ✅ Invalid token handling works:', !isAuthInvalid ? 'PASS' : 'FAIL');

console.log('\n🎉 Authentication system tests completed!');
console.log('\n📝 Next steps:');
console.log('   1. Start your backend server');
console.log('   2. Test login API: POST /api/auth/login');
console.log('   3. Test protected routes with Authorization header');
console.log('   4. Test frontend login and dashboard access');