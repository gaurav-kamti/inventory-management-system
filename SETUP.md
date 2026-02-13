# 🚀 Setup Guide - Inventory Management System

## Prerequisites

Before you begin, ensure you have:
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)

## Installation Steps

### 1. Install Backend Dependencies

Open your terminal in the project root directory and run:

```bash
npm install
```

This will install all backend dependencies including Express, Sequelize, SQLite, JWT, bcrypt, etc.

### 2. Install Frontend Dependencies

Navigate to the client folder and install frontend dependencies:

```bash
cd client
npm install
cd ..
```

This installs React, Vite, React Router, and Axios.

### 3. Seed the Database

Create the database with sample data:

```bash
npm run seed
```

This will:
- Create the SQLite database
- Set up all tables (Users, Products, Categories, Brands, Customers, Sales, etc.)
- Add sample data:
  - Admin user (username: `admin`, password: `admin123`)
  - 3 categories (Electronics, Clothing, Food & Beverages)
  - 3 brands (Samsung, Nike, Coca-Cola)
  - 4 sample products
  - 2 sample customers

### 4. Start the Application

Run both backend and frontend servers:

```bash
npm run dev
```

This command starts:
- **Backend server** on `http://localhost:5000`
- **Frontend server** on `http://localhost:5173`

Your browser should automatically open to `http://localhost:5173`

## Login

Use these credentials to log in:
- **Username:** `admin`
- **Password:** `admin123`

## Troubleshooting

### Port Already in Use

If port 5000 or 5173 is already in use:

1. Edit `.env` file to change backend port:
```
PORT=5001
```

2. Edit `client/vite.config.js` to change frontend port:
```javascript
server: {
  port: 5174,
  // ...
}
```

### Database Issues

If you encounter database errors, delete the database and reseed:

```bash
# Windows
del database.sqlite
npm run seed

# Mac/Linux
rm database.sqlite
npm run seed
```

### Module Not Found Errors

Make sure you've installed dependencies in both root and client folders:

```bash
npm install
cd client
npm install
cd ..
```

## Project Structure

```
inventory-management-system/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── utils/         # API utilities
│   │   └── App.jsx        # Main app component
│   └── package.json
├── server/                # Node.js backend
│   ├── config/           # Database configuration
│   ├── models/           # Sequelize models
│   ├── routes/           # API routes
│   ├── middleware/       # Auth middleware
│   └── index.js          # Server entry point
├── .env                  # Environment variables
├── package.json          # Backend dependencies
└── README.md
```

## Available Scripts

- `npm run dev` - Start both frontend and backend
- `npm run server` - Start backend only
- `npm run client` - Start frontend only
- `npm run seed` - Seed database with sample data
- `npm run build` - Build frontend for production
- `npm start` - Start production server

## Next Steps

After logging in, you can:

1. **Dashboard** - View business overview and statistics
2. **POS** - Make sales with multiple payment options
3. **Products** - Add and manage inventory
4. **Purchases** - Manage supplier bills and stock entry
5. **Customers** - Manage customer accounts and credit
6. **Sales** - View sales history and transactions
7. **Vouchers** - Record receipts and payments

## Features to Explore

- ✅ Add new products with categories and brands
- ✅ Make sales with cash, card, credit, or partial payments
- ✅ Track customer credit and outstanding balances
- ✅ Monitor low stock alerts
- ✅ Adjust inventory levels
- ✅ Record customer payments
- ✅ Universal Printing (Invoices, Purchase Bills, Vouchers)
- ✅ Purchase Management with stock updates
- ✅ Voucher System for complete financial tracking

Enjoy using your Inventory Management System! 🎉
