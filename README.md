# 🔐 Auth Service — Microservice

A dedicated authentication and user management microservice built with **Node.js**, **Express.js**, and **MongoDB**.

The service provides user registration, authentication, email account verification, profile management, JWT-based authentication, and role-based access control for four user roles:

* **User / Citizen**
* **Admin**
* **Manager**
* **Technician**

---

## 📑 Table of Contents

* [🚀 Features](#-features)
* [🛠️ Tech Stack](#️-tech-stack)
* [📋 Prerequisites](#-prerequisites)
* [📦 Installation](#-installation)
* [⚙️ Environment Configuration](#️-environment-configuration)
* [🔌 API Documentation](#-api-documentation)

  * [System & Health Check](#1-system--health-check)
  * [Registration](#2-registration)
  * [Authentication](#3-authentication)
  * [Account Verification](#4-account-verification)
  * [User Management](#5-user-management)
* [🛡️ Security](#️-security)
* [▶️ Running the Application](#️-running-the-application)
* [🌐 Deployment](#-deployment)

---

## 🚀 Features

### 🔐 Authentication

* Dedicated registration endpoints for each user role
* Dedicated login endpoints for each user role
* Password hashing using `bcryptjs`
* JWT-based authentication
* JWT expiration after **7 days**
* Email-based account verification
* Verification tokens with a **24-hour expiration period**

### 👥 User Roles

The service supports four roles:

| Role         | Description            |
| ------------ | ---------------------- |
| `USER`       | Regular user / citizen |
| `ADMIN`      | System administrator   |
| `MANAGER`    | Infrastructure manager |
| `TECHNICIAN` | Field technician       |

Each role is stored in its own MongoDB model/collection.

### 👤 User Management

* Register new users
* Register administrators using a secret Admin PIN
* Admin-controlled Manager registration
* Admin-controlled Technician registration
* Update user information
* Update user profiles
* Change user roles
* Change account status
* Delete user accounts
* Update passwords
* Manage phone numbers
* Manage role-specific information such as department and specialization

### 🛡️ Security

* Password hashing with `bcryptjs`
* JWT authentication
* Role-based authorization
* Authentication rate limiting
* HTTP security headers using Helmet
* CORS configuration
* Email verification tokens
* Self-or-Admin authorization

---

# 🛠️ Tech Stack

| Technology       | Purpose                              |
| ---------------- | ------------------------------------ |
| **Node.js**      | JavaScript runtime                   |
| **Express.js**   | REST API framework                   |
| **MongoDB**      | Database                             |
| **Mongoose**     | MongoDB ODM                          |
| **bcryptjs**     | Password hashing                     |
| **jsonwebtoken** | JWT authentication                   |
| **crypto**       | Secure verification token generation |
| **Helmet**       | HTTP security headers                |
| **CORS**         | Cross-origin request handling        |

---

# 📋 Prerequisites

Before running the service, make sure you have:

### Node.js

Node.js **16 or newer**.

### MongoDB

A MongoDB database is required.

Supported configurations include:

* Local MongoDB
* MongoDB Atlas

---

# 📦 Installation

## 1. Clone the repository

```bash
git clone <your-repository-url>
```

## 2. Enter the project directory

```bash
cd auth-service
```

## 3. Install dependencies

```bash
npm install
```

---

# ⚙️ Environment Configuration

Create a `.env` file in the root directory:

```env
PORT=8001
NODE_ENV=development

MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/auth_db

JWT_SECRET=your_secure_jwt_secret
ADMIN_PIN=your_admin_registration_pin
```

## Environment Variables

| Variable     | Description                                | Example                       |
| ------------ | ------------------------------------------ | ----------------------------- |
| `PORT`       | Port used by the application               | `8001`                        |
| `NODE_ENV`   | Application environment                    | `development`                 |
| `MONGO_URI`  | MongoDB connection string                  | `mongodb+srv://...`           |
| `JWT_SECRET` | Secret used to sign JWT tokens             | `your_secure_jwt_secret`      |
| `ADMIN_PIN`  | Secret PIN required for Admin registration | `your_admin_registration_pin` |

> ⚠️ **Security:** Never commit your `.env` file, MongoDB credentials, JWT secret, or Admin PIN to a public repository.

Add the following to `.gitignore`:

```gitignore
.env
```

---

# 🔌 API Documentation

Base URL for local development:

```text
http://localhost:8001
```

## Endpoint Overview

| Method   | Endpoint                        | Access             | Rate Limit | Description                         |
| -------- | ------------------------------- | ------------------ | ---------- | ----------------------------------- |
| `GET`    | `/`                             | Public             | No         | Basic service status                |
| `GET`    | `/api/auth/health`              | Public             | No         | Authentication service health check |
| `POST`   | `/api/auth/register/user`       | Public             | Yes        | Register a User / Citizen           |
| `POST`   | `/api/auth/register/admin`      | Public + Admin PIN | Yes        | Register an Admin                   |
| `POST`   | `/api/auth/register/manager`    | Admin              | Yes        | Register a Manager                  |
| `POST`   | `/api/auth/register/technician` | Admin              | Yes        | Register a Technician               |
| `POST`   | `/api/auth/login/user`          | Public             | Yes        | Login as User / Citizen             |
| `POST`   | `/api/auth/login/admin`         | Public             | Yes        | Login as Admin                      |
| `POST`   | `/api/auth/login/manager`       | Public             | Yes        | Login as Manager                    |
| `POST`   | `/api/auth/login/technician`    | Public             | Yes        | Login as Technician                 |
| `GET`    | `/api/auth/verify`              | Public             | No         | Verify an account                   |
| `PUT`    | `/api/auth/users/:userId`       | Admin              | No         | Update a user by ID                 |
| `DELETE` | `/api/auth/users/:userId`       | Admin              | No         | Delete a user by ID                 |
| `PUT`    | `/api/auth/users/email/:email`  | Self / Admin       | No         | Update a user profile               |
| `DELETE` | `/api/auth/users/email/:email`  | Self / Admin       | No         | Delete a user account               |

---

# 🟢 Endpoint Details

## 1. System & Health Check

### `GET /`

**Access:** Public

Returns the basic status of the authentication service.

### `GET /api/auth/health`

**Access:** Public

Returns the health status of the authentication service.

---

# 2. Registration

All registration requests require the following basic information:

* `name`
* `email`
* `password`
* `phone` or `phoneNumber`

## The service normalizes email addresses to lowercase and stores the contact number in both `phone` and `phoneNumber` fields for schema compatibility.

## Register User / Citizen

```http
POST /api/auth/register/user
```

**Access:** Public

### Request Body

```json
{
  "name": "Example Citizen",
  "email": "user@example.com",
  "password": "Password123",
  "phoneNumber": "081234567890"
}
```

---

## Register Admin

```http
POST /api/auth/register/admin
```

**Access:** Public + Admin PIN

Admin registration requires the `ADMIN_PIN` environment variable value.

### Request Body

```json
{
  "name": "System Administrator",
  "email": "admin@example.com",
  "password": "Password123",
  "phoneNumber": "081234567890",
  "adminPin": "YOUR_ADMIN_PIN"
}
```

The Admin PIN is checked against `process.env.ADMIN_PIN`.

---

## Register Manager

```http
POST /api/auth/register/manager
```

**Access:** Admin only

Requires an Admin JWT:

```http
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

### Request Body

```json
{
  "name": "Infrastructure Manager",
  "email": "manager@example.com",
  "password": "Password123",
  "phoneNumber": "081234567890",
  "department": "Infrastructure"
}
```

---

## Register Technician

```http
POST /api/auth/register/technician
```

**Access:** Admin only

Requires an Admin JWT:

```http
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

### Request Body

```json
{
  "name": "Field Technician",
  "email": "technician@example.com",
  "password": "Password123",
  "phoneNumber": "081234567890",
  "specialization": "Electrical Infrastructure"
}
```

## The registration handler supports optional `department` and `specialization` fields.

# 3. Authentication

The service provides dedicated login endpoints for each role.

### Login Endpoints

```http
POST /api/auth/login/user
POST /api/auth/login/admin
POST /api/auth/login/manager
POST /api/auth/login/technician
```

**Access:** Public

### Request Body

```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

### Successful Response

```json
{
  "message": "Login berhasil",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60d5ec49f1a2c80015f8e9a1",
    "name": "Example User",
    "email": "user@example.com",
    "phone": "081234567890",
    "phoneNumber": "081234567890",
    "role": "USER",
    "status": "ACTIVE"
  }
}
```

The login process:

1. Finds the user in the collection associated with the requested role.
2. Compares the submitted password with the stored password hash.
3. Generates a JWT.
4. Returns the authenticated user's information.

The JWT contains:

```json
{
  "id": "USER_ID",
  "email": "user@example.com",
  "name": "Example User",
  "role": "USER"
}
```

The token is configured to expire after **7 days**.

Use the returned token for protected endpoints:

```http
Authorization: Bearer <JWT_TOKEN>
```

---

# 4. Account Verification

## `GET /api/auth/verify`

**Access:** Public

Account verification is performed using a verification token sent through email.

### Query Parameter

```text
?token=VERIFICATION_TOKEN
```

### Example

```http
GET /api/auth/verify?token=abc123
```

During registration, the service generates a cryptographically secure verification token and sets its expiration to **24 hours**.

The verification process searches across all supported role collections:

* Admin
* Manager
* Technician
* User

If a valid token is found:

* The account status is changed to `ACTIVE`
* The verification token is removed
* The token expiration value is removed

---

# 5. User Management

## Update User by ID

```http
PUT /api/auth/users/:userId
```

**Access:** Admin only

### URL Parameter

```text
userId
```

Requires:

```http
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

The Admin can update:

* Name
* Role
* Status
* Phone number
* Department
* Specialization

If the Admin changes the user's role, the service creates the user in the new role's collection and removes the original document from the previous collection.

---

## Delete User by ID

```http
DELETE /api/auth/users/:userId
```

**Access:** Admin only

Requires:

```http
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

The service searches the supported role collections and deletes the matching user.

---

## Update User Profile

```http
PUT /api/auth/users/email/:email
```

**Access:** Account owner or Admin

### URL Parameter

```text
email
```

Requires:

```http
Authorization: Bearer <JWT_TOKEN>
```

Supported profile fields include:

* Name
* Password
* Phone number
* Department
* Specialization

If a new password is supplied, it is hashed with `bcryptjs` before being stored.

---

## Delete User Account

```http
DELETE /api/auth/users/email/:email
```

**Access:** Account owner or Admin

Requires:

```http
Authorization: Bearer <JWT_TOKEN>
```

### URL Parameter

```text
email
```

The service searches the supported role collections and removes the matching account.

---

# 🛡️ Security

## Password Hashing

Passwords are never stored directly.

The service uses `bcryptjs` to generate a salt and hash passwords before storing them in MongoDB.

During login, the submitted password is compared against the stored `passwordHash`.

---

## JWT Authentication

Authenticated requests use the Bearer token format:

```http
Authorization: Bearer <JWT_TOKEN>
```

JWT payloads contain:

* User ID
* Email
* Name
* Role

The token expires after seven days.

---

## Role-Based Access Control

The service separates users into four roles:

```text
USER
ADMIN
MANAGER
TECHNICIAN
```

Administrative operations require an Admin account, while self-service operations can be performed by the account owner.

---

## Account Verification

New accounts receive a cryptographically generated verification token.

Verification tokens:

```text
Random token
        │
        ▼
Stored in MongoDB
        │
        ├── Valid for 24 hours
        │
        ▼
Verification email
        │
        ▼
GET /api/auth/verify?token=...
        │
        ▼
Account → ACTIVE
```

---

## Rate Limiting

Authentication endpoints should be protected by the configured rate limiter to reduce:

* Brute-force login attempts
* Excessive authentication requests
* Automated abuse

The documented configuration is:

```text
100 requests / 15 minutes / IP address
```

> Rate limiting is an additional abuse-prevention mechanism and should not be considered complete DDoS protection.

---

## CORS

The service can be configured to allow requests from trusted frontend applications.

Example development origins:

```text
http://localhost:3000
http://localhost:5173
http://localhost:8080
```

Production frontend origins should be explicitly configured according to the deployed application.

---

## Helmet

The application uses **Helmet** to provide security-related HTTP headers and reduce exposure to common web security risks.

---

# ▶️ Running the Application

## Development

Run using `nodemon`:

```bash
npm run dev
```

Or run directly with Node.js:

```bash
node server.js
```

The service runs on:

```text
http://localhost:8001
```

---

## Production

Run:

```bash
npm start
```

The application can also be configured for serverless deployment.

---

# 🌐 Deployment

The service can be deployed in a traditional Node.js environment or a serverless environment.

### Local Architecture

```text
┌──────────────┐
│    Client    │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│  Express.js API  │
│   Auth Service   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│     MongoDB      │
└──────────────────┘
```

### Serverless Architecture

```text
┌──────────────┐
│    Client    │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Serverless Host  │
│     Vercel       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Express.js Auth │
│     Service      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   MongoDB Atlas  │
└──────────────────┘
```

---

# 📁 Supported User Data

The authentication service supports common user information:

```text
name
email
passwordHash
phone
phoneNumber
role
status
verificationToken
tokenExpiresAt
department
specialization
```

Role-specific fields such as `department` and `specialization` can be supplied where applicable.

---

# 📌 Project Summary

This Auth Service provides a centralized authentication layer for applications that require multiple user roles and controlled access.

### Core capabilities

```text
Registration
     │
     ▼
Email Verification
     │
     ▼
Authentication
     │
     ▼
JWT Token
     │
     ▼
Role-Based Access
     │
     ├── USER
     ├── ADMIN
     ├── MANAGER
     └── TECHNICIAN
```

It is designed to function as an independent authentication microservice that can be consumed by multiple frontend or backend services.

---

## 📄 License

This project is intended for educational and development purposes.

Add a license such as **MIT**, **Apache-2.0**, or another appropriate license if you plan to distribute the repository publicly.
