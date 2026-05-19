const mongoose = require('mongoose');
const User = require('../models/User');
const Resource = require('../models/Resource');
const bcrypt = require('bcryptjs');

const BASE_URL = 'http://localhost:5000/api';

// Test users and resources
const testData = {
  admin: { email: 'final-admin@example.com', password: 'TestPass123!', name: 'Final Admin' },
  user1: { email: 'final-user1@example.com', password: 'TestPass123!', name: 'Final User 1' },
  user2: { email: 'final-user2@example.com', password: 'TestPass123!', name: 'Final User 2' }
};

let cookies = {};

async function login(type) {
  const user = testData[type];
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password })
  });
  const data = await res.json();
  if (!data.success) throw new Error(`Login failed for ${type}`);
  const setCookie = res.headers.get('set-cookie');
  cookies[type] = setCookie ? [setCookie] : [];
  return data.user;
}

async function registerUser(type, roleOverride = null) {
  const user = testData[type];
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password, name: user.name })
  });
  const data = await res.json();
  if (!data.success) throw new Error(`Register failed for ${type}`);
  
  // If admin, update role in DB
  if (roleOverride) {
    await User.findByIdAndUpdate(data.user._id, { role: roleOverride });
  }
  
  return data.user;
}

async function uploadResource(userType, data) {
  const res = await fetch(`${BASE_URL}/resources/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookies[userType].join('; ') },
    body: JSON.stringify(data)
  });
  return await res.json();
}

async function rejectResource(adminType, resourceId, reason) {
  const res = await fetch(`${BASE_URL}/resources/${resourceId}/reject`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookies[adminType].join('; ') },
    body: JSON.stringify({ rejectionReason: reason })
  });
  return await res.json();
}

async function deleteResource(userType, resourceId) {
  const res = await fetch(`${BASE_URL}/resources/${resourceId}`, {
    method: 'DELETE',
    headers: { 'Cookie': cookies[userType].join('; ') }
  });
  return await res.json();
}

async function getResources(userType) {
  const res = await fetch(`${BASE_URL}/resources`, {
    headers: { 'Cookie': cookies[userType].join('; ') }
  });
  return await res.json();
}

async function runTests() {
  try {
    console.log('\n=== FINAL SMOKE TEST ===\n');
    
    // Setup: Clear and create test users
    console.log('1️⃣ Setting up test data...');
    await User.deleteMany({ email: /^final-/ });
    await Resource.deleteMany({}); // Clear all resources
    
    
    const adminUser = await registerUser('admin', 'admin');
    const user1 = await registerUser('user1');
    const user2 = await registerUser('user2');
    console.log('✓ Test users created');
    
    // Login all users
    console.log('\n2️⃣ Logging in users...');
    const adminLogin = await login('admin');
    const user1Login = await login('user1');
    console.log(`✓ Admin logged in with role: ${adminLogin.role}`);
    console.log(`✓ User1 logged in with role: ${user1Login.role}`);
    
    // TEST 1: Single-click upload creates one record
    console.log('\n3️⃣ TEST 1 - Single-click upload (no duplicates)...');
    const uploadRes = await uploadResource('user1', {
      title: 'Test PDF',
      description: 'A test PDF resource',
      subject: 'Math',
      type: 'pdf',
      url: 'http://example.com/test.pdf'
    });
    if (uploadRes.success) {
      const resourceId = uploadRes.resource._id;
      const allResources = await getResources('user1');
      const duplicates = allResources.resources.filter(r => r.title === 'Test PDF' && r.uploadedBy === user1Login._id).length;
      if (duplicates === 1) {
        console.log(`✓ Single upload creates exactly 1 record (not duplicated)`);
      } else {
        console.log(`✗ FAILED: Found ${duplicates} records instead of 1`);
      }
    } else {
      console.log(`✗ FAILED: Upload failed - ${uploadRes.error.message}`);
    }
    
    // TEST 2: Admin can reject resources
    console.log('\n4️⃣ TEST 2 - Admin reject button...');
    const resourceToReject = (await getResources('user1')).resources.find(r => r.title === 'Test PDF');
    if (resourceToReject) {
      const rejectRes = await rejectResource('admin', resourceToReject._id, 'Inappropriate content');
      if (rejectRes.success) {
        console.log(`✓ Admin successfully rejected resource`);
        const updated = await Resource.findById(resourceToReject._id);
        if (updated.status === 'rejected' && updated.rejectionReason === 'Inappropriate content') {
          console.log(`✓ Resource status changed to 'rejected' with reason saved`);
        } else {
          console.log(`✗ FAILED: Status or reason not updated correctly`);
        }
      } else {
        console.log(`✗ FAILED: Reject failed - ${rejectRes.error.message}`);
      }
    }
    
    // TEST 3: Delete feature (user and admin)
    console.log('\n5️⃣ TEST 3 - Delete feature...');
    // Create resource for user deletion test
    const delRes = await uploadResource('user2', {
      title: 'Delete Test',
      description: 'A test resource to delete',
      subject: 'Science',
      type: 'video',
      url: 'http://example.com/test.mp4'
    });
    
    if (delRes.success) {
      const deleteResult = await deleteResource('user2', delRes.resource._id);
      if (deleteResult.success) {
        console.log(`✓ User can delete own resource`);
        const exists = await Resource.findById(delRes.resource._id);
        if (!exists) {
          console.log(`✓ Resource successfully removed from database`);
        } else {
          console.log(`✗ FAILED: Resource still exists in database`);
        }
      } else {
        console.log(`✗ FAILED: Delete failed - ${deleteResult.error.message}`);
      }
    }
    
    // Create and delete as admin
    console.log('\n6️⃣ Testing admin delete permission...');
    const adminDelRes = await uploadResource('user1', {
      title: 'Admin Delete Test',
      description: 'A test resource for admin to delete',
      subject: 'History',
      type: 'link',
      url: 'http://example.com/test'
    });
    
    if (adminDelRes.success) {
      const adminDeleteResult = await deleteResource('admin', adminDelRes.resource._id);
      if (adminDeleteResult.success) {
        console.log(`✓ Admin can delete other user's resource`);
      } else {
        console.log(`✗ FAILED: Admin delete failed - ${adminDeleteResult.error.message}`);
      }
    }
    
    console.log('\n=== TESTS COMPLETE ===\n');
    
  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Run tests
mongoose.connect('mongodb://localhost:27017/study_platform').then(() => {
  runTests();
}).catch(err => {
  console.error('MongoDB connection failed:', err);
  process.exit(1);
});
