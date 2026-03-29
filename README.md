# 🌊 AquaRoute Backend: Maritime Telemetry & Logistics Engine

> **The centralized nervous system for real-time maritime tracking and cargo management in archipelagic regions.**

## 🚀 Overview
AquaRoute's backend is a robust Node.js platform designed to act as a digital middleman for maritime logistics. It handles secure role-based access, processes live telemetry data, and integrates external weather/routing APIs to deliver real-time cargo tracking via unique reference numbers.

## ⚙️ Tech Stack & Architecture
* **Core Environment:** Node.js
* **Database:** Firebase Firestore (Real-time NoSQL)
* **Authentication:** JWT (JSON Web Tokens) & bcrypt password hashing
* **External APIs:** OpenWeather API (Weather), Overpass API (Maritime routes)
* **Deployment:** Render
* **Email Services:** NodeMailer (SMTP) for OTPs and recovery

## 🔑 Key Engineering Features
* **Role-Based Access Control (RBAC):** Secure admin dashboard (rendered via EJS/REST) for port operators to manage vessels, ports, and active cargo.
* **API Rate Limiting:** External calls to OpenWeather are strictly managed using the `Bottleneck` library within `weatherService.js`, ensuring the system respects rate limits and remains cost-effective.
* **Real-time Synchronization:** Powers mobile clients with continuous Firestore snapshot updates for live vessel positioning.
* **Automated ETA Engine:** Computes highly precise arrival times using speed and Haversine distance formulas.

## 🛡️ Security & Scalability
* **Endpoint Protection:** Enforces strict Firestore Security Rules requiring Firebase Auth tokens on all endpoints to prevent unauthorized data access.
* **High Availability:** Designed for horizontal scaling to effortlessly handle concurrent data access via Render and Cloud Databases as the fleet grows.

---
*Developed by Roniel Cuaresma - Lead Developer (BSIT)*