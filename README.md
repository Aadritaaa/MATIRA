# MATIRA — Direct B2B Agricultural Marketplace
**CSE 3200 Software Development Project II**

Connecting Farmers and Cooperatives directly with Local Business Buyers.

---

## 🏗️ Architecture Overview

* **Frontend:** Vanilla HTML5, CSS3, JavaScript (Fetch API + LocalStorage JWT handling)
* **Backend:** Node.js + Express.js (Modular MVC architecture)
* **Database:** Single MySQL database (`matira_db`) with relational integrity

---

## 👥 Module Distribution

* **Developer 1 (Person 1):** Authentication + Seller + Product Management
* **Developer 2 (Person 2):** Buyer + Marketplace
* **Developer 3 (Person 3):** Deal Management + AI Reference-Price Advisory

---

## 🚀 Setup and Run Instructions

### 1. Prerequisites
* Node.js (v18+)
* MySQL / XAMPP running on port `3306`

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup
Ensure MySQL is running and import the schema and seed data:
```bash
mysql -u root < database/schema.sql
mysql -u root < database/seed.sql
```

### 4. Configure Environment
Verify `.env` has appropriate configuration:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=matira_db
DB_PORT=3306
JWT_SECRET=matira_secret_jwt_key_2026_cse3200
```

### 5. Start the Server
```bash
npm start
```
* **Landing Page:** `http://localhost:5000/pages/index.html`
* **Register:** `http://localhost:5000/pages/register.html`
* **Login:** `http://localhost:5000/pages/login.html`
* **Seller Dashboard:** `http://localhost:5000/pages/seller-dashboard.html`
