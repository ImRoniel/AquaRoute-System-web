<div align="center">

  <h1>⚓ AquaRoute Web Platform</h1>
  <p><strong>Next-Generation Maritime Telemetry, Real-Time Vessel Tracking & Dynamic Logistics Engine</strong></p>

  <p>
    <a href="https://github.com/ImRoniel/AquaRoute-System-web/stargazers"><img src="https://img.shields.io/github/stars/ImRoniel/AquaRoute-System-web?style=for-the-badge&logo=github&color=00B4D8" alt="Stars"></a>
    <a href="https://github.com/ImRoniel/AquaRoute-System-web/network/members"><img src="https://img.shields.io/github/forks/ImRoniel/AquaRoute-System-web?style=for-the-badge&logo=github&color=0077B6" alt="Forks"></a>
    <a href="https://github.com/ImRoniel/AquaRoute-System-web/issues"><img src="https://img.shields.io/github/issues/ImRoniel/AquaRoute-System-web?style=for-the-badge&logo=github&color=90E0EF" alt="Issues"></a>
    <a href="https://github.com/ImRoniel/AquaRoute-System-web/blob/main/LICENSE"><img src="https://img.shields.io/github/license/ImRoniel/AquaRoute-System-web?style=for-the-badge&logo=open-source-initiative&color=7209B7" alt="License"></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
    <img src="https://img.shields.io/badge/Express.js-5.x-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js">
    <img src="https://img.shields.io/badge/Firebase_Firestore-12.x-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase">
    <img src="https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite">
    <img src="https://img.shields.io/badge/EJS-Templating-B52E31?style=for-the-badge&logo=ejs&logoColor=white" alt="EJS">
    <img src="https://img.shields.io/badge/Render-Deployment-46E3B7?style=for-the-badge&logo=render&logoColor=black" alt="Render">
  </p>

</div>

---

## 📖 Overview

**AquaRoute Web Platform** is an enterprise-grade maritime telemetry server, real-time vessel tracking backend, and fleet administration system. Built specifically to tackle the logistical challenges of archipelagic passenger and cargo transit, AquaRoute synthesizes OpenStreetMap live maritime data, dynamic Haversine arrival calculations, OpenWeather forecasts, and real-time Firestore database sync into a centralized management hub.

Port operators, vessel dispatchers, and cargo managers can seamlessly monitor active ferry positions across maritime corridors, estimate dynamic arrival times (ETA), track manifest shipments with unique reference tokens, and broadcast critical weather advisories.

> [!NOTE]
> **AquaRoute** is built on **Node.js 22.x** and **Express 5**, implementing a hybrid storage strategy: **Firebase Firestore** for cloud-synchronized real-time telemetry and **SQLite3** for high-performance administrative authentication and local session management.

---

## ✨ Key Features

<table>
  <tr>
    <td width="50%">
      <h3>🚢 Live Telemetry & OpenStreetMap Ingestion</h3>
      <p>Continuous geospatial ingestion via the OpenStreetMap Overpass API for live ferry route extraction, waypoint positioning, speed calculation (in knots), and trajectory updates.</p>
    </td>
    <td width="50%">
      <h3>⏱️ Dynamic Haversine ETA Engine</h3>
      <p>Adaptive arrival estimation computing vessel velocity, nautical distance, route checkpoints, and historical transit times to predict accurate port arrival schedules.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🌤️ Weather & Wave Advisory System</h3>
      <p>Integrated OpenWeather API ingestion wrapped with <code>Bottleneck</code> rate-limiting to assess wind velocity, directional headings, visibility, and estimated wave heights.</p>
    </td>
    <td width="50%">
      <h3>📦 Manifest Cargo & Reference Tracking</h3>
      <p>Complete cargo lifecycle management allowing operators to assign packages to active vessels, update shipping statuses, and track shipments via unique tracking IDs.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>⚡ Quota-Aware Differential Caching</h3>
      <p>Intelligent physical diffing engine that evaluates spatial movement and status changes before triggering database commits—drastically reducing billable cloud DB writes.</p>
    </td>
    <td width="50%">
      <h3>🔒 Role-Based Access Control & Audit Logs</h3>
      <p>Granular session management backed by <code>bcrypt</code> password hashing, protected Express middleware routes, and immutable administrative audit logs.</p>
    </td>
  </tr>
</table>

---

## 🛠️ Tech Stack

### 🖥️ Backend Framework & Runtime
* **Runtime:** [Node.js 22.x](https://nodejs.org/) (CommonJS modules)
* **Application Framework:** [Express.js 5.x](https://expressjs.com/)
* **Session & Auth Security:** `express-session`, `bcrypt`, `helmet`, `cors`
* **Rate Limiting:** `bottleneck` (1 req/sec API quota enforcement)

### 💾 Database & Data Sync Layer
* **Cloud Database:** [Firebase Firestore](https://firebase.google.com/docs/firestore) (Admin SDK `v13.6.1`) for real-time telemetry, weather, ports, and cargo
* **Local Database:** [SQLite 3](https://sqlite.org/) (`sqlite` / `sqlite3`) for administrator accounts, authentication tables, and local persistent sessions

### 🎨 Frontend & Presentation
* **Templating Engine:** [EJS](https://ejs.co/) (Embedded JavaScript) & `express-handlebars`
* **Static Assets:** Vanilla CSS, JavaScript Fetch API, Responsive Admin Dashboard views

### 📡 External Integrations & Services
* **Marine Telemetry:** OpenStreetMap Overpass API (`https://overpass-api.de/api/interpreter`)
* **Meteorological Data:** OpenWeather Map API (`v2.5/weather`)
* **HTTP Client:** `axios`

---

## 🏗️ Architecture & Flow

AquaRoute employs a modern Service-Controller-Model architecture with decoupled data providers and rate-limited external sync loops:

```mermaid
flowchart TD
    subgraph External Telemetry & APIs
        A["🌐 Overpass API (OpenStreetMap)"]
        B["🌤️ OpenWeatherMap API"]
    end

    subgraph Business Logic & Ingestion Layer
        C["🚢 Ferry Ingestion Service (ferryService.js)"]
        D["⚡ Differential Diff Engine (hasPhysicalDataChanged)"]
        E["🌤️ Rate-Limited Weather Service (Bottleneck)"]
        F["📐 Haversine ETA & Distance Calculator"]
    end

    subgraph Data Persistence Layer
        G[("🔥 Firebase Firestore (Cloud DB)")]
        H[("💾 SQLite 3 (Local DB)")]
    end

    subgraph Express HTTP Routing & Middleware
        I["🛡️ Auth Middleware (isAuthenticated)"]
        J["🕹️ Web & REST Controllers (Express.js)"]
    end

    subgraph UI & Client Touchpoints
        K["📊 Admin Management Dashboard (EJS)"]
        L["📱 AquaRoute Mobile Client (Android)"]
    end

    A -->|Ferry Routes & Coordinates| C
    C --> F
    C --> D
    D -->|Write on Physical Change Only| G

    B -->|Wind, Temp, Pressure| E
    E -->|Rate-Limited Upsert| G

    H <-->|Admin Credentials & Sessions| I
    I --> J
    J <--> G

    J -->|Render Views| K
    G <-->|Real-time Firestore Sync| L
```

---

## 🚀 Getting Started

Follow these instructions to set up the development environment, execute database migrations, and run the **AquaRoute Web Server** locally.

### 📋 Prerequisites

Ensure your development environment meets the following requirements:
* **Node.js:** `v22.x` or higher installed ([Download Node.js](https://nodejs.org/))
* **npm:** Package manager `v10.x` or higher
* **Firebase Project:** A Firebase project with Firestore enabled and a Service Account key ([Firebase Console](https://console.firebase.google.com/))
* **OpenWeather API Key:** Free or Pro API key from [OpenWeatherMap](https://openweathermap.org/api)

---

### 📥 Installation & Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/ImRoniel/AquaRoute-System-web.git
   cd AquaRoute-System-web
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

---

### ⚙️ Environment Configuration

Create a `.env` file in the root directory of the project:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
SESSION_SECRET=your_super_secret_session_key_here

# External APIs
OPENWEATHER_API_KEY=your_openweather_api_key_here

# Firebase Admin Credentials (For Cloud / Render Deployment)
FIREBASE_PROJECT_ID=aquaroute-485505
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@aquaroute-485505.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

> [!TIP]
> For local development, you can place your `serviceAccountKey.json` inside the `config/` directory. The application will automatically detect and prioritize local credentials if present.

---

### 🛠️ Database Setup & Seeding

1. **Initialize Local SQLite Database & Admin User:**
   ```bash
   node scripts/create-admin.js
   ```
   *Default Admin Credentials:* `admin` / `admin123`

2. **Seed Initial Ports into Firestore:**
   ```bash
   node seed_ports.js
   ```

3. **Migrate Port & Cargo Search Indexes (Optional):**
   ```bash
   node scripts/migrateSearchNames.js
   node scripts/migrateCargoSearchNames.js
   ```

---

### 🏃 Running the Application

* **Start Production Server:**
  ```bash
  npm start
  ```

* **Verify Server Output:**
  ```text
  ✅ Using local serviceAccountKey.json
  ✅ Default admin created: admin / admin123
  🚀 Server running on port 3000
  ```

* Access the application in your browser at `http://localhost:3000`.

---

## 📂 Project Structure

```text
AquaRoute-System-web/
├── assets/                         # Static CSS, JavaScript libraries, & public images
├── config/                         # System infrastructure & SDK configurations
│   ├── auth.js                     # Session configuration settings
│   ├── database.js                 # SQLite database connection & table bootstrap
│   ├── debug.js                    # Diagnostic logger utilities
│   └── firebase.js                 # Firebase Admin SDK initialization & Firestore instance
├── controllers/                    # Express HTTP request & business logic controllers
│   ├── authController.js           # Authentication, login, & session teardown
│   ├── cargoController.js          # Cargo tracking, creation, updates, & status logs
│   ├── ferryController.js          # Ferry telemetry management & dashboard rendering
│   ├── logController.js            # System activity audit logs controller
│   ├── portController.js           # Port registry, pagination, & search handlers
│   └── userController.js           # Administrative user management controller
├── midleware/                      # Route guards & authentication middleware
│   └── auth.js                     # Session validation & authorization handler
├── models/                         # Data access layer for Firestore & SQLite
│   ├── admin.js                    # SQLite model for admin accounts
│   ├── cargo.js                    # Firestore model for shipment tracking & stats
│   ├── ferry.js                    # Firestore model for vessel positions & routes
│   ├── log.js                      # Audit log data access model
│   ├── port.js                     # Firestore model for seaport metadata & search
│   └── users.js                    # User profile data access model
├── public/                         # Public client-side assets & stylesheets
├── routes/                         # Web route declarations & RESTful API endpoints
│   └── web.js                      # Express router mapping pages and API controllers
├── scripts/                        # Database seeding, migration, & utility scripts
│   ├── clean_ports.js              # Sanitize raw port coordinate data
│   ├── create-admin.js             # Bootstrap default SQLite administrator account
│   ├── init_firebase.js            # Firestore collection schema bootstrapper
│   ├── migrateCargoSearchNames.js  # Build lowercase search indexes for cargo
│   ├── migrateSearchNames.js       # Build lowercase search indexes for ports
│   ├── migrateUserRoles.js         # Upgrade legacy user permissions
│   ├── port-migration.js           # Bulk port importer script
│   └── test-overpass.js            # Diagnostic runner for Overpass API routes
├── services/                       # Business logic, sync loops, & rate-limited services
│   ├── ferryService.js             # Overpass OSM sync engine & differential diffing
│   ├── portScheduler.js            # Automated background port status sync
│   └── weatherService.js           # Bottleneck rate-limited OpenWeather ingestion
├── utils/                          # Geospatial calculation helpers & API wrappers
│   ├── ferryMovement.js            # Vessel trajectory calculation helpers
│   └── overpassService.js          # Overpass QL query builder for Philippine ferries
├── views/                          # Dynamic EJS templating engine views
│   ├── admin/                      # Admin dashboard, ferry, port, & cargo management pages
│   ├── auth/                       # Login & authentication templates
│   ├── landing/                    # Public landing page template
│   ├── layouts/                    # Main page wrappers & error views
│   └── partials/                   # Reusable UI headers, footers, & navbars
├── database.sqlite                 # Persistent SQLite database file
├── ports_clean.json                # Pre-processed Philippine seaport dataset
├── package.json                    # Dependencies, engine constraints, & scripts
├── server.js                       # Main application entry point & HTTP listener
├── LICENSE                         # Official MIT License terms
└── README.md                       # Master project documentation
```

---

## 🤝 Contributing

Contributions to **AquaRoute Web Platform** are welcome! Follow these steps to submit your improvements:

1. **Fork the Repository** on GitHub.
2. **Create a Feature Branch:**
   ```bash
   git checkout -b feature/maritime-route-optimization
   ```
3. **Commit your Changes:**
   ```bash
   git commit -m "feat: Add dynamic wave threshold warning to weather service"
   ```
4. **Push to the Branch:**
   ```bash
   git push origin feature/maritime-route-optimization
   ```
5. **Open a Pull Request** describing your changes in detail.

---

## 📜 License

Distributed under the **MIT License**.

```text
MIT License

Copyright (c) 2025 Roniel C. Carbon

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

For full details, please refer to the [LICENSE](LICENSE) file.

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/ImRoniel">Roniel C. Carbon</a> & the open-source community.</sub>
</div>
