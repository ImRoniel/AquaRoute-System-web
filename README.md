# 🌊 AquaRoute Backend: Maritime Telemetry & Logistics Engine

> [cite_start]**The centralized nervous system for real-time maritime tracking and cargo management in archipelagic regions.** [cite: 272, 288]

## 🚀 Overview
[cite_start]AquaRoute's backend is a robust Node.js platform designed to act as a digital middleman for maritime logistics[cite: 276]. [cite_start]It handles secure role-based access [cite: 241][cite_start], processes live telemetry data, and integrates external weather/routing APIs to deliver real-time cargo tracking via unique reference numbers[cite: 288].

## ⚙️ Tech Stack & Architecture
* [cite_start]**Core Environment:** Node.js [cite: 391]
* [cite_start]**Database:** Firebase Firestore (Real-time NoSQL) [cite: 383]
* [cite_start]**Authentication:** JWT (JSON Web Tokens) & bcrypt password hashing [cite: 240]
* [cite_start]**External APIs:** OpenWeather API (Weather), Overpass API (Maritime routes) [cite: 379, 381]
* [cite_start]**Deployment:** Render [cite: 392]
* [cite_start]**Email Services:** NodeMailer (SMTP) for OTPs and recovery [cite: 391]

## 🔑 Key Engineering Features
* [cite_start]**Role-Based Access Control (RBAC):** Secure admin dashboard (rendered via EJS/REST) for port operators to manage vessels, ports, and active cargo[cite: 241, 389].
* [cite_start]**API Rate Limiting:** External calls to OpenWeather are strictly managed using the `Bottleneck` library within `weatherService.js`, ensuring the system respects rate limits and remains cost-effective[cite: 238].
* [cite_start]**Real-time Synchronization:** Powers mobile clients with continuous Firestore snapshot updates for live vessel positioning[cite: 384].
* [cite_start]**Automated ETA Engine:** Computes highly precise arrival times using speed and Haversine distance formulas[cite: 317].

## 🛡️ Security & Scalability
* [cite_start]Enforces strict Firestore Security Rules requiring Firebase Auth tokens on all endpoints to prevent unauthorized data access[cite: 318, 323].
* [cite_start]Designed for horizontal scaling to effortlessly handle concurrent data access via Render and Cloud Databases as the fleet grows[cite: 242].

---
[cite_start]*Developed by Roniel Cuaresma [cite: 254]*