const mongoose = require('mongoose');
const User = require('../models/User');
const Resource = require('../models/Resource');
const bcrypt = require('bcryptjs');
// use global fetch available in Node 18+
const fetch = global.fetch.bind(global);

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/study_platform';
const API_BASE = 'http://localhost:5000/api';

function extractCookie(headers) {
  const sc = headers.get && headers.get('set-cookie');
  if (!sc) return '';
  return sc.split(';')[0];
}

(async () => {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    // Ensure test users exist by registering via API (keeps server-side normalization consistent)
    const adminEmail = 'smoke-admin@example.com';
    const adminPass = 'AdminPass123!';
    const userEmail = 'smoke-user@example.com';
    const userPass = 'UserPass123!';

    async function registerUser(email, password, name) {
      // try register via API; if exists, ignore errors and ensure password via DB
      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name })
        });
        const body = await res.json();
        if (res.ok) {
          console.log('Registered via API:', email);
        } else {
          console.log('Register API response for', email, ':', body.error?.message || body.message || res.status);
        }
      } catch (e) {
        console.log('Register API error (ignored if already exists):', e.message);
      }

      // Ensure password set in DB for deterministic login
      const hash = await bcrypt.hash(password, 12);
      const u = await User.findOne({ email });
      if (u) {
        u.password = hash;
        await u.save();
        console.log('Ensured DB password for', email);
      }
      return await User.findOne({ email });
    }

    const admin = await registerUser(adminEmail, adminPass, 'Smoke Admin');
    // make sure admin role is set
    if (admin) {
      admin.role = 'admin';
      await admin.save();
      console.log('Ensured admin role for', adminEmail);
      const adminCheck = await User.findOne({ email: adminEmail }).lean();
      console.log('Admin in DB role:', adminCheck?.role);
    }

    const user = await registerUser(userEmail, userPass, 'Smoke User');

    // Helper to login and get cookie
    async function loginAndGetCookie(email, password) {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      const cookie = extractCookie(res.headers);
      return { ok: res.ok, body, cookie };
    }

    // Login as user
    const userFromDb = await User.findOne({ email: userEmail }).lean();
    console.log('User in DB before login:', !!userFromDb, userFromDb?._id);
    const userLogin = await loginAndGetCookie(userEmail, userPass);
    if (!userLogin.ok) throw new Error('User login failed: ' + JSON.stringify(userLogin.body));
    const userCookie = userLogin.cookie;
    console.log('User logged in, cookie length:', userCookie.length);
    console.log('User login returned user role:', userLogin.body.user?.role);

    // Create two resources as user via API (link type)
    async function createLinkResource(title) {
      const res = await fetch(`${API_BASE}/resources/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userCookie },
        body: JSON.stringify({ title, description: 'Smoke test', subject: 'Other', type: 'link', url: 'https://example.com' })
      });
      const body = await res.json();
      return { ok: res.ok, body };
    }

    const uniqueSuffix = Date.now().toString().slice(-6);
    const r1 = await createLinkResource(`Smoke Test Resource A ${uniqueSuffix}`);
    console.log('Create A:', r1.ok, r1.body && r1.body.resource && r1.body.resource._id);

    const r2 = await createLinkResource(`Smoke Test Resource B ${uniqueSuffix}`);
    console.log('Create B:', r2.ok, r2.body && r2.body.resource && r2.body.resource._id);

    const resAId = r1.body?.resource?._id;
    const resBId = r2.body?.resource?._id;

    // Login as admin
    // attempt admin login with retries to ensure DB role is picked up
    let adminLogin = null;
    let adminCookie = '';
    for (let i = 0; i < 3; i++) {
      adminLogin = await loginAndGetCookie(adminEmail, adminPass);
      if (adminLogin.ok && adminLogin.body && adminLogin.body.user && adminLogin.body.user.role === 'admin') {
        adminCookie = adminLogin.cookie;
        break;
      }
      // if login succeeded but role not admin, re-try after short delay
      if (adminLogin.ok) {
        console.log('Login returned role:', adminLogin.body.user?.role, 'retrying...');
      }
      await new Promise(r => setTimeout(r, 800));
    }
    if (!adminLogin || !adminLogin.ok || adminLogin.body.user?.role !== 'admin') {
      throw new Error('Admin login failed or did not acquire admin role: ' + JSON.stringify(adminLogin && adminLogin.body));
    }
    console.log('Admin logged in, cookie length:', adminCookie.length);
    console.log('Admin login returned user role:', adminLogin.body.user?.role);

    // Verify /api/auth/me returns current user for admin cookie
    const meRes = await fetch(`${API_BASE}/auth/me`, { headers: { Cookie: adminCookie } });
    const meBody = await meRes.json();
    console.log('/auth/me for admin:', meRes.status, meBody.user?.role);

    // Approve resource A
    const approveRes = await fetch(`${API_BASE}/resources/${resAId}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie }
    });
    console.log('Approve A status:', approveRes.status);
    console.log('Approve A body:', await approveRes.json());

    // Reject resource B with reason
    const rejectRes = await fetch(`${API_BASE}/resources/${resBId}/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ reason: 'Not suitable for platform' })
    });
    console.log('Reject B status:', rejectRes.status);
    console.log('Reject B body:', await rejectRes.json());

    // User deletes their approved resource A
    const deleteByUser = await fetch(`${API_BASE}/resources/${resAId}`, {
      method: 'DELETE',
      headers: { Cookie: userCookie }
    });
    console.log('User delete A status:', deleteByUser.status, await deleteByUser.json());

    // Admin deletes resource B
    const deleteByAdmin = await fetch(`${API_BASE}/resources/${resBId}`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });
    console.log('Admin delete B status:', deleteByAdmin.status, await deleteByAdmin.json());

    // Final resource counts
    const all = await Resource.find({}).lean();
    console.log('Remaining resources count:', all.length);

    console.log('Smoke test completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Smoke test failed:', err);
    process.exit(1);
  }
})();
