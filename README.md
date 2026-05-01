# 🏥 HealthTech MVP — Unified Health Record Access System

A production-ready backend for securely accessing and uploading patient medical records across hospitals, featuring OTP-based patient auth, JWT doctor auth, AI-powered emergency summaries (Groq), and blockchain record integrity (Polygon).

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Node.js + Express.js |
| Database | PostgreSQL + Prisma ORM |
| Patient Auth | Phone + OTP (mock) |
| Doctor Auth | JWT (bcrypt hashed passwords) |
| AI Summarizer | Groq REST API (Llama 3.3 70B) |
| Blockchain | Polygon Amoy Testnet (ethers.js) |
| File Upload | Multer (PDF, PNG, JPEG — 10MB max) |
| Hashing | SHA-256 (Node.js crypto) |

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL database
- (Optional) Groq API key for AI summaries
- (Optional) Polygon Amoy wallet + deployed contract for blockchain

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database URL and API keys
```

### 4. Setup Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed sample data
npm run prisma:seed
```

### 5. Start Server

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Server starts at `http://localhost:3000`

---

## Smart Contract Deployment

1. Open [Remix IDE](https://remix.ethereum.org)
2. Copy `contracts/RecordRegistry.sol` into Remix
3. Compile with Solidity 0.8.19+
4. Deploy to **Polygon Amoy Testnet**
5. Copy the deployed contract address to `.env` as `CONTRACT_ADDRESS`
6. Add your wallet private key to `.env` as `WALLET_PRIVATE_KEY`

> Get Amoy testnet MATIC from the [Polygon Faucet](https://faucet.polygon.technology/)

---

## API Reference

### 🔐 Authentication (Patient OTP)

#### Send OTP
```bash
POST /auth/send-otp

# Request
curl -X POST http://localhost:3000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210"}'

# Response (200)
{
  "success": true,
  "message": "OTP sent successfully (check server console for mock OTP).",
  "data": {
    "id": 1,
    "phoneNumber": "+919876543210",
    "expiresAt": "2024-01-01T00:05:00.000Z"
  }
}
```

#### Verify OTP
```bash
POST /auth/verify-otp

# Request (use the OTP from server console)
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "otp": "123456"}'

# Response (200)
{
  "success": true,
  "message": "OTP verified successfully.",
  "data": {
    "verified": true,
    "patientExists": true,
    "token": "eyJhbGciOi...",
    "patient": {
      "id": "uuid-here",
      "name": "Aarav Sharma",
      "phoneNumber": "+919876543210",
      "age": 45,
      "gender": "Male"
    }
  }
}
```

---

### 👤 Patient

#### Create Patient
```bash
POST /patient/create

curl -X POST http://localhost:3000/patient/create \
  -H "Content-Type: application/json" \
  -d '{"name": "New Patient", "phoneNumber": "+919999999999", "age": 28, "gender": "Female"}'
```

#### Get Profile (requires patient JWT)
```bash
GET /patient/profile

curl http://localhost:3000/patient/profile \
  -H "Authorization: Bearer <patient-token>"
```

---

### 👨‍⚕️ Doctor

#### Register
```bash
POST /doctor/register

curl -X POST http://localhost:3000/doctor/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Test",
    "hospitalName": "City Hospital",
    "email": "test@hospital.com",
    "password": "securepass123"
  }'
```

#### Login
```bash
POST /doctor/login

curl -X POST http://localhost:3000/doctor/login \
  -H "Content-Type: application/json" \
  -d '{"email": "rajesh@apollo.com", "password": "doctor123"}'

# Response (200)
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "eyJhbGciOi...",
    "doctor": {
      "id": "uuid",
      "name": "Dr. Rajesh Kumar",
      "hospitalName": "Apollo Hospital",
      "email": "rajesh@apollo.com"
    }
  }
}
```

---

### 📋 Medical Records

#### Upload Record (doctor auth required)
```bash
POST /records/upload

curl -X POST http://localhost:3000/records/upload \
  -H "Authorization: Bearer <doctor-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "<patient-uuid>",
    "diagnosis": "Acute Bronchitis",
    "medications": ["Amoxicillin 500mg", "Cough Syrup"],
    "allergies": ["Penicillin"],
    "notes": "Patient presents with persistent cough for 5 days."
  }'

# Response (201)
{
  "success": true,
  "message": "Medical record uploaded successfully.",
  "data": {
    "record": {
      "id": "uuid",
      "diagnosis": "Acute Bronchitis",
      "hash": "a1b2c3d4e5...",
      "blockchainTxHash": "0x1234...",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### Upload with File
```bash
curl -X POST http://localhost:3000/records/upload \
  -H "Authorization: Bearer <doctor-token>" \
  -F "patientId=<patient-uuid>" \
  -F "diagnosis=X-Ray Report" \
  -F "medications=[]" \
  -F "allergies=[]" \
  -F "file=@/path/to/xray.pdf"
```

#### Get Patient Records (auth + consent required)
```bash
GET /records/:patientId

# As patient (own records):
curl http://localhost:3000/records/<patient-uuid> \
  -H "Authorization: Bearer <patient-token>"

# As doctor (needs patient consent token):
curl http://localhost:3000/records/<patient-uuid> \
  -H "Authorization: Bearer <doctor-token>" \
  -H "x-consent-token: <patient-token>"
```

---

### 🤖 AI Emergency Summary

#### Emergency Summary (default)
```bash
GET /summary/:patientId

curl http://localhost:3000/summary/<patient-uuid> \
  -H "Authorization: Bearer <doctor-token>"

# Response (200)
{
  "success": true,
  "message": "Emergency summary generated.",
  "data": {
    "patient": { "id": "uuid", "name": "Aarav Sharma", "age": 45 },
    "summaryType": "emergency",
    "recordCount": 2,
    "summary": {
      "criticalAllergies": ["Penicillin", "Sulfa drugs"],
      "activeMedications": ["Metformin 500mg", "Amlodipine 5mg"],
      "recentDiagnoses": ["Type 2 Diabetes", "Hypertension"],
      "riskFlags": ["Drug interaction: monitor renal function"],
      "quickSummary": "45-year-old male with controlled diabetes and newly diagnosed hypertension...",
      "emergencyNotes": "Avoid Penicillin-class antibiotics. Monitor BP closely."
    }
  }
}
```

#### Detailed Summary
```bash
curl http://localhost:3000/summary/<patient-uuid>?type=detailed \
  -H "Authorization: Bearer <doctor-token>"
```

---

## Project Structure

```
├── contracts/
│   └── RecordRegistry.sol        # Solidity smart contract
├── src/
│   ├── app.js                    # Express app configuration
│   ├── server.js                 # Entry point
│   ├── config/index.js           # Environment config
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema
│   │   └── seed.js               # Sample data
│   ├── controllers/
│   │   ├── authController.js     # OTP + patient handlers
│   │   ├── doctorController.js   # Doctor auth handlers
│   │   ├── recordController.js   # Record CRUD handlers
│   │   └── summaryController.js  # AI summary handler
│   ├── routes/                   # Express route definitions
│   ├── services/
│   │   ├── otpService.js         # Mock OTP logic
│   │   ├── tokenService.js       # JWT helpers
│   │   ├── hashingService.js     # SHA-256 hashing
│   │   ├── blockchainService.js  # Polygon integration
│   │   └── summaryService.js     # Groq AI summarizer
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT guards
│   │   ├── consentMiddleware.js  # Patient consent
│   │   └── errorHandler.js       # Global error handler
│   ├── utils/                    # Prisma client + response helpers
│   └── uploads/                  # File storage
├── .env.example
├── package.json
└── README.md
```

---

## Seed Data Credentials

| Role | Email / Phone | Password |
|------|---------------|----------|
| Doctor 1 | rajesh@apollo.com | doctor123 |
| Doctor 2 | meera@fortis.com | doctor123 |
| Patient 1 | +919876543210 | (use OTP) |
| Patient 2 | +919876543211 | (use OTP) |

---

## License

MIT
