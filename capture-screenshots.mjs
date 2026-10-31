import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = path.resolve('C:\\Users\\HP\\.gemini\\antigravity\\scratch\\vaultverse-mern\\chrome-temp');
const SCREENSHOT_DIR = path.resolve('C:\\Users\\HP\\.gemini\\antigravity\\scratch\\vaultverse-mern\\docs\\screenshots');
const DEBUG_PORT = 9222;

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

console.log('Starting Headless Chrome with Remote Debugging...');
const chromeProcess = spawn(CHROME_PATH, [
  `--remote-debugging-port=${DEBUG_PORT}`,
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--window-size=1400,900',
  `--user-data-dir=${USER_DATA_DIR}`,
  'about:blank',
]);

chromeProcess.on('error', (err) => {
  console.error('Failed to spawn Chrome:', err);
  process.exit(1);
});

// Wait for Chrome remote debugging endpoint
async function waitForChrome(retries = 20) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (res.ok) return await res.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Chrome remote debugging did not respond');
}

// Simple CDP client over native WebSocket
class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async close() {
    if (this.ws) this.ws.close();
  }
}

async function capture() {
  await waitForChrome();
  console.log('Chrome remote debugging ready!');

  // Get existing page target from list
  const listRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  const list = await listRes.json();
  const target = list.find((t) => t.type === 'page') || list[0];
  const cdp = new CDPClient(target.webSocketDebuggerUrl);
  await cdp.connect();
  console.log('Connected to Chrome DevTools Protocol');

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1400,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Helper to navigate and take screenshot
  async function takeScreenshot(url, filename, waitMs = 1200) {
    console.log(`Navigating to ${url}...`);
    await cdp.send('Page.navigate', { url });
    await new Promise((r) => setTimeout(r, waitMs));
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const filePath = path.join(SCREENSHOT_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    console.log(`Saved screenshot: ${filename} (${Math.round(data.length * 0.75 / 1024)} KB)`);
  }

  // 1. Landing Page
  await takeScreenshot('http://localhost:5173/', '01-landing-page.png', 1500);

  // 2. Login Page
  await takeScreenshot('http://localhost:5173/login', '02-login-page.png', 1000);

  // 3. Register Page
  await takeScreenshot('http://localhost:5173/register', '03-register-page.png', 1000);

  // Login via API to get valid JWT token
  console.log('Authenticating user to capture authenticated SaaS views...');
  const testEmail = 'demo.security.officer@vaultverse.io';
  const testPassword = 'EnterpriseStrongPassword#2026!';
  let token = null;
  let userStr = '';

  let loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });

  if (!loginRes.ok) {
    const regRes = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Alexander Vance',
        email: testEmail,
        password: testPassword,
      }),
    });
    const regData = await regRes.json();
    token = regData.token;
    userStr = JSON.stringify(regData.user);
  } else {
    const loginData = await loginRes.json();
    token = loginData.token;
    userStr = JSON.stringify(loginData.user);
  }

  // Also upload a sample document, configure emergency profile, and trusted contact if new
  const authHeaders = { Authorization: `Bearer ${token}` };
  try {
    const formData = new FormData();
    formData.append('file', new Blob(['CONFIDENTIAL ASSET SPECIFICATION\nClient: Enterprise Security\nSSN: 123-45-6789\nCard: 4532015012345671'], { type: 'text/plain' }), 'financial_report_2026.txt');
    formData.append('title', 'Financial Security Audit Report');
    formData.append('category', 'FINANCIAL');
    formData.append('tags', 'financial,audit,confidential');
    await fetch('http://localhost:5000/api/documents/upload', { method: 'POST', headers: authHeaders, body: formData });

    await fetch('http://localhost:5000/api/emergency/profile', {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bloodType: 'O+',
        allergies: ['Penicillin', 'Sulfa drugs'],
        medications: ['Metformin 500mg twice daily'],
        chronicConditions: ['Type 1 Diabetes'],
        primaryPhysician: { name: 'Dr. Gregory House', phone: '+1-555-0199', clinic: 'Princeton Clinic' },
        emergencyInstructions: 'Carrier of medical alert bracelet.',
      }),
    });

    await fetch('http://localhost:5000/api/trusted-contacts', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactName: 'Dr. Sarah Connor',
        contactEmail: 'sarah.connor@emergency-care.org',
        phone: '+1-555-0144',
        relationship: 'PHYSICIAN',
        securityNote: 'Hospital chief emergency officer',
        permissions: {
          canViewEmergencyProfile: true,
          canRequestEmergencyAccess: true,
          canDownloadDocuments: true,
          allowedCategories: ['EMERGENCY', 'MEDICAL', 'IDENTITY'],
        },
      }),
    });
  } catch (seedErr) {
    console.warn('Seed warning:', seedErr.message);
  }

  // Inject token into localStorage
  await cdp.send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('vaultverse_token', ${JSON.stringify(token)});
      localStorage.setItem('vaultverse_user', ${JSON.stringify(userStr)});
    `,
  });

  // 4. Dashboard
  await takeScreenshot('http://localhost:5173/dashboard', '04-dashboard.png', 2000);

  // 5. Documents Vault
  await takeScreenshot('http://localhost:5173/documents', '05-documents-vault.png', 1500);

  // 6. Upload Page
  await takeScreenshot('http://localhost:5173/upload', '06-upload-document.png', 1200);

  // 7. Privacy Posture & Sandbox
  await takeScreenshot('http://localhost:5173/privacy', '07-privacy-posture.png', 1500);

  // 8. Emergency Medical Profile
  await takeScreenshot('http://localhost:5173/emergency', '08-emergency-profile.png', 1500);

  // 9. Trusted Contacts Management
  await takeScreenshot('http://localhost:5173/trusted-contacts', '09-trusted-contacts.png', 1500);

  // 10. Secure Sharing
  await takeScreenshot('http://localhost:5173/sharing', '10-secure-sharing.png', 1500);

  // 11. Emergency Access Requests
  await takeScreenshot('http://localhost:5173/access-requests', '11-access-requests.png', 1500);

  // 12. Forensic Audit Log & Hash Chain
  await takeScreenshot('http://localhost:5173/audit', '12-audit-chain.png', 1500);

  // 13. Profile & Settings
  await takeScreenshot('http://localhost:5173/profile', '13-user-profile.png', 1200);

  // 14. Swagger Interactive OpenAPI Documentation
  await takeScreenshot('http://localhost:5000/api-docs', '14-swagger-docs.png', 2000);

  await cdp.close();
  console.log('\nAll screenshots captured successfully!');
  chromeProcess.kill();
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  chromeProcess.kill();
  process.exit(1);
});
