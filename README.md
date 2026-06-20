# AquaPulse 💧 — Community Water Health Intelligence Platform

> Real-time IoT water quality monitoring for rural communities using ESP32 sensors, MERN stack, and Socket.IO

---

## Features

- **🔬 Real-time Monitoring** — pH, turbidity, and temperature via ESP32 sensors
- **🚨 Instant Alerts** — WHO-standard safety classification with automatic alerts
- **📊 Analytics** — 7/30-day trend charts, village health scores
- **🌐 Multilingual** — English, Hindi (हिन्दी), Telugu (తెలుగు)
- **👥 Role-based Access** — Admin and Health Worker roles
- **📡 WebSocket** — Socket.IO for real-time dashboard updates
- **🗺️ Village Management** — Multi-village, multi-source tracking

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Recharts, Socket.IO client |
| Backend | Node.js, Express.js, Socket.IO |
| Database | MongoDB Atlas (M0 free tier) |
| Auth | JWT (access + refresh tokens) |
| IoT | ESP32 → REST POST |
| Styling | Vanilla CSS (glassmorphism) |

## Quick Start

### 1. MongoDB Atlas Setup
1. Create free M0 cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create database user
3. Whitelist `0.0.0.0/0` in Network Access (or your IP)
4. Copy connection string

### 2. Backend
```bash
cd server
cp .env.example .env
# Edit .env and paste your MONGO_URI
npm install
npm run seed   # Populate demo data
npm run dev    # Start server on :5000
```

### 3. Frontend
```bash
cd client
npm install
npm run dev    # Start on :5173
```

### 4. Login (Demo Credentials)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@aquapulse.in | Admin@1234 |
| Health Worker | priya@aquapulse.in | Worker@1234 |

## ESP32 Integration
See [README_ESP32.md](./README_ESP32.md) for the complete Arduino sketch and wiring guide.

## Environment Variables

### Server (.env)
```env
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_secret
JWT_REFRESH_SECRET=your_refresh_secret
CLIENT_URL=http://localhost:5173
DEVICE_API_KEY=aquapulse_device_secret_key_2024
NODE_ENV=development
```

### Client (.env)
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

## Deployment (Free Tier)

| Service | Platform | Free Tier |
|---------|----------|-----------|
| Backend | Render.com | 512MB RAM, sleeps after 15min |
| Frontend | Vercel | Unlimited bandwidth |
| Database | MongoDB Atlas M0 | 512MB storage |

## Project Structure
```
aqua_vedesh/
├── server/
│   ├── config/         # DB + Socket.IO setup
│   ├── controllers/    # Route handlers
│   ├── middleware/     # JWT auth + device auth
│   ├── models/         # MongoDB schemas
│   ├── routes/         # Express routes
│   ├── services/       # Safety classifier
│   ├── utils/          # Seed script
│   └── index.js
├── client/
│   └── src/
│       ├── components/ # Reusable UI components
│       ├── contexts/   # Auth + Socket + i18n
│       ├── i18n/       # EN/HI/TE translations
│       ├── pages/      # Page components
│       └── services/   # API layer
├── README.md
└── README_ESP32.md
```

---
Built for community health workers across rural Telangana 🇮🇳
