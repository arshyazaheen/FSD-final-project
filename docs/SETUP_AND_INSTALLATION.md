# VaultVerse — Installation, Setup & Deployment Guide

This guide provides end-to-end instructions for installing, configuring, running, and testing the VaultVerse MERN stack application on Windows and within IntelliJ IDEA / WebStorm.

---

## 1. Prerequisites

Ensure the following tools are installed on your workstation:

### 1.1 Node.js LTS
- **Recommended version**: Node.js v20.x or v24.x LTS.
- Download from the official website: [https://nodejs.org](https://nodejs.org).
- Verify in your terminal:
  ```powershell
  node --version
  npm --version
  ```

### 1.2 MongoDB Database
You can use either a local MongoDB installation or MongoDB Atlas (free cloud tier):

#### Option A: Local MongoDB 8.x Community Server
1. Download MongoDB Community Server MSI from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community).
2. Follow the Windows installer, opting to install MongoDB as a Windows Service.
3. Verify the service is running:
   ```powershell
   Get-Service -Name MongoDB
   # Or start it manually:
   net start MongoDB
   ```
4. Default local connection URI: `mongodb://127.0.0.1:27017/vaultverse`

#### Option B: MongoDB Atlas (Cloud)
1. Sign up for free at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a free M0 cluster.
3. Under **Database Access**, create a user with read/write privileges.
4. Under **Network Access**, add your current IP address (or `0.0.0.0/0` for development).
5. Copy your connection string:
   `mongodb+srv://<username>:<password>@cluster0.mongodb.net/vaultverse?retryWrites=true&w=majority`
6. Paste this URI into `server/.env` as `MONGODB_URI`.

*(Note: Automated unit and integration tests use `mongodb-memory-server` and run zero-dependency without needing any MongoDB service running).*

---

## 2. Quick-Start Commands (PowerShell)

```powershell
# Step 1: Open terminal and navigate to the project directory
cd C:\Users\HP\.gemini\antigravity\scratch\vaultverse-mern

# Step 2: Install backend server dependencies
cd server
npm install

# Step 3: Install frontend client dependencies
cd ..\client
npm install

# Step 4: Run the full automated test suite (65 passing tests)
cd ..\server
npm test

# Step 5: Start the backend development server (Port 5000)
npm run dev
# The backend will connect to MongoDB and launch on http://localhost:5000

# Step 6: In a second terminal, start the React client (Port 5173)
cd C:\Users\HP\.gemini\antigravity\scratch\vaultverse-mern\client
npm run dev
```

---

## 3. IntelliJ IDEA / WebStorm Setup Guide

### 3.1 Opening the Project
1. Launch IntelliJ IDEA or WebStorm.
2. Click **File -> Open...**
3. Browse to `C:\Users\HP\.gemini\antigravity\scratch\vaultverse-mern` and select **OK**.
4. Trust the project when prompted.

### 3.2 Configuring the Node.js Interpreter
1. Go to **File -> Settings -> Languages & Frameworks -> Node.js** (or `Ctrl+Alt+S`).
2. Verify that **Node interpreter** is detected (e.g., `C:\Program Files\nodejs\node.exe`).
3. Ensure **Package manager** is set to `npm` (e.g., `C:\Program Files\nodejs\npm.cmd`).

### 3.3 Setting Up Run/Debug Configurations
Click **Add Configuration...** in the top-right toolbar:

#### 1. Backend Server Run Configuration:
- Click **+** and select **npm**.
- **Name**: `VaultVerse Backend`
- **Package.json**: Select `C:\Users\HP\.gemini\antigravity\scratch\vaultverse-mern\server\package.json`
- **Command**: `run`
- **Scripts**: `dev`
- **Environment variables**: Ensure loaded from `.env`.

#### 2. Frontend Client Run Configuration:
- Click **+** and select **npm**.
- **Name**: `VaultVerse Frontend`
- **Package.json**: Select `C:\Users\HP\.gemini\antigravity\scratch\vaultverse-mern\client\package.json`
- **Command**: `run`
- **Scripts**: `dev`

#### 3. Test Runner Configuration:
- Click **+** and select **npm**.
- **Name**: `Run All 65 Tests`
- **Package.json**: Select `C:\Users\HP\.gemini\antigravity\scratch\vaultverse-mern\server\package.json`
- **Command**: `run`
- **Scripts**: `test`

---

## 4. Environment Variables Reference

File: `server/.env`

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Port for the Express.js REST API |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/vaultverse` | MongoDB connection URI |
| `JWT_SECRET` | `vaultverse_production_jwt_secret_key_...` | Cryptographic secret for signing JWTs |
| `JWT_EXPIRES_IN` | `7d` | Token validity duration |
| `VAULT_MASTER_KEY` | `0123456789abcdef...` (64-char hex) | 256-bit Key Encryption Key (KEK) for DEK envelopes |
| `STORAGE_DIR` | `./uploads` | Directory for encrypted ciphertext files |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS frontend origin |
| `NODE_ENV` | `development` | Node environment (`development`, `test`, `production`) |

---

## 5. API Testing via Swagger UI & Postman

1. Open your browser and navigate to:
   ```
   http://localhost:5000/api-docs
   ```
2. **Register a User**:
   - Open `POST /api/auth/register`.
   - Click **Try it out** and execute with name, email, and password.
   - Copy the returned `token`.
3. **Authorize**:
   - Click the green **Authorize** button at the top of the page.
   - Enter `Bearer <your-token>`.
4. **Test Endpoints**:
   - Upload document: `POST /api/documents/upload`
   - Download document: `GET /api/documents/{id}/download`
   - Privacy health check: `GET /api/privacy/overview`
   - Audit integrity: `GET /api/audit/verify`

