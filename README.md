# 🔐 Secure Examination Workflow and Question Paper Management System

A secure, role-based web application built using the **PERN Stack (PostgreSQL, Express.js, React.js, Node.js)** to streamline the complete examination workflow—from exam scheduling and question paper creation to review, approval, and secure release.

The system ensures **confidentiality, integrity, and accountability** throughout the examination process by implementing role-based access control, encrypted question paper storage, audit logging, and outcome-based evaluation through Course Outcome (CO) mapping.

---

## 📖 Project Overview

Traditional examination systems often rely on manual processes that are vulnerable to unauthorized access, last-minute modifications, and inconsistent question paper quality.

This project digitizes the entire examination workflow while ensuring:

- Secure question paper management
- Controlled access based on user roles
- Structured review process
- Outcome-Based Education (OBE) compliance
- Complete audit trail of examination activities
- Time-controlled release of approved question papers

---

## ✨ Features

### 📅 Examination Management

- Create and schedule examinations
- Configure examination pattern
- Define date, duration, and total marks
- Lock examination configuration after confirmation

### 📝 Secure Question Paper Creation

- Prepare question papers according to the approved syllabus
- Organize questions into multiple sections
- Assign marks for each question
- Automatic total mark validation
- Map every question with:
  - Unit Number
  - Course Outcome (CO1–CO4)
  - Difficulty Level

### ✅ Question Paper Review

- Reviewer-only access
- Read-only review interface
- Approve question paper
- Reject with comments
- Request revisions

### 🎯 Course Outcome (CO) Mapping

Each question is mapped to a Course Outcome:

- **CO1** – Remember & Understand
- **CO2** – Apply Concepts
- **CO3** – Analyze & Solve Problems
- **CO4** – Design, Evaluate & Think Critically

### 🔒 Security

- Role-Based Access Control (RBAC)
- JWT Authentication
- Secure password hashing
- Encrypted question paper storage
- Time-controlled access
- Audit logging
- Paper locking after submission
- Controlled paper release at exam time

### ⚙ Workflow Automation

```text
Administrator
      │
      ▼
Create Examination
      │
      ▼
Assign Question Setter
      │
      ▼
Question Paper Preparation
      │
      ▼
Secure Submission
      │
      ▼
Reviewer Evaluation
      │
      ▼
Approve / Reject
      │
      ▼
Administrator Approval
      │
      ▼
Question Paper Locked
      │
      ▼
Released During Examination
```

---

## 🛠 Technology Stack

### Frontend

- React.js
- React Router
- JavaScript
- CSS
- Axios

### Backend

- Node.js
- Express.js
- JWT Authentication
- bcrypt
- Crypto Module

### Database

- PostgreSQL

### AI Integration

- Ollama
- Llama 3.2

---

## 👥 User Roles

### 👨‍💼 Administrator

- Create examinations
- Assign question setters
- Assign reviewers
- Manage users
- Final approval
- Release question papers

### 👨‍🏫 Faculty / Question Setter

- Create question papers
- Select syllabus
- Add questions
- Map Course Outcomes
- Submit papers

### 👨‍🔬 Reviewer

- Review submitted papers
- Validate syllabus coverage
- Verify paper pattern
- Approve
- Reject
- Request modifications

### 🏛 Head of Department (HOD)

- Monitor workflow
- Return finalized papers
- Trigger answer key generation
- View audit logs

---

## 📁 Project Structure

```text
project-root
│
├── backend
│   ├── controllers
│   ├── middleware
│   ├── models
│   ├── routes
│   ├── utils
│   ├── config
│   └── server.js
│
├── frontend
│   ├── src
│   ├── components
│   ├── pages
│   ├── assets
│   └── App.jsx
│
└── README.md
```

---

# 🚀 Getting Started

## Prerequisites

Make sure the following are installed:

- Node.js (v18 or later recommended)
- npm
- PostgreSQL
- Ollama (optional, for AI answer key generation)

---

## 📥 Clone the Repository

```bash
git clone <repository-url>

cd <repository-name>
```

---

## 📦 Install Dependencies

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd ../frontend
npm install
```

---

## ▶ Start the Backend Server

```bash
cd backend
node server.js
```

---

## ▶ Start the Frontend

Open a new terminal.

```bash
cd frontend
npm run dev
```

---

## ⚙ Environment Variables

Create a `.env` file inside the **backend** directory.

Example:

```env
PORT=5000

DATABASE_URL=your_postgresql_connection_string

JWT_SECRET=your_jwt_secret

EMAIL=your_email

EMAIL_PASSWORD=your_email_password

OLLAMA_URL=http://127.0.0.1:11434

OLLAMA_MODEL=llama3.2
```

---

# 🤖 Ollama Setup

This project supports **local AI-powered answer key generation** using Ollama.

### Step 1

Install and start Ollama.

### Step 2

Pull the required model.

```bash
ollama pull llama3.2
```

### Step 3 (Optional)

Configure the following environment variables:

```env
OLLAMA_URL=http://127.0.0.1:11434

OLLAMA_MODEL=llama3.2
```

---

## 📌 Return Finalized Paper Endpoint

```
POST /api/hod/panel/papers/:id/return-to-faculties
```

This endpoint:

- Marks the paper as **returned_to_faculties**
- Generates an AI-based answer key using Ollama
- Makes the finalized paper available to faculty members

---

## 🔐 Authentication

The application implements:

- JWT Authentication
- Role-Based Authorization
- Secure Password Hashing
- Protected API Routes

---

## 🛡 Security Features

- Encrypted question paper storage
- Secure authentication
- Role-based permissions
- Audit logging
- Time-controlled paper release
- Paper locking after submission
- Secure approval workflow

---

## 🚀 Future Enhancements

- Two-Factor Authentication (2FA)
- Digital Signature Verification
- Email Notifications
- Real-time Workflow Tracking
- Bloom's Taxonomy Mapping
- Automatic CO Analytics
- PDF Encryption
- Cloud Deployment
- Multi-University Support

---

## 🔑 Demo Login Credentials

**The credentials for each role are available directly on the Login Page.**

For each account:

- **Username:** The text before the "/" in the displayed email.
- **Password:** The text after the "/" in the displayed email.

---

## 📜 License

This project is developed for educational and academic purposes.

---

## 👨‍💻 Contributors

Developed as part of a Full Stack Web Development project focusing on secure examination workflow, question paper management, academic quality assurance, and secure role-based access control.
