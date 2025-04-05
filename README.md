# Financial Tracker

A financial tracking application with features for managing accounts, transactions, and financial goals.

## PostgreSQL Migration

This project has been migrated from in-memory storage (MemStorage) to PostgreSQL for persistent data storage.

### Setup Instructions

1. **Prerequisites**
   - PostgreSQL installed and running
   - Node.js and npm installed

2. **Environment Configuration**
   - Create a `.env` file in the project root with the following content:
     ```
     DATABASE_URL=postgresql://username:password@localhost:5432/transactions
     STORAGE_TYPE=postgres
     ```
   - Replace `username` and `password` with your PostgreSQL credentials
   - The database name is set to `transactions` (make sure this database exists in your PostgreSQL instance)

3. **Database Setup**
   - Create the database if it doesn't exist:
     ```sql
     CREATE DATABASE transactions;
     ```
   - Run the database migration:
     ```bash
     npm run db:push
     ```

4. **Running the Application**
   - Start the development server:
     ```bash
     npm run dev
     ```
   - The application will be available at http://localhost:3000

### Storage Implementation

The application can use two storage implementations:

1. **In-Memory Storage (MemStorage)**
   - Data is stored in memory and will be lost when the application restarts
   - Used when `STORAGE_TYPE` is not set to `postgres`

2. **PostgreSQL Storage (PostgresStorage)**
   - Data is stored in a PostgreSQL database
   - Used when `STORAGE_TYPE` is set to `postgres`

### Switching Between Storage Implementations

To switch between storage implementations, change the `STORAGE_TYPE` environment variable:

- For PostgreSQL storage: `STORAGE_TYPE=postgres`
- For in-memory storage: `STORAGE_TYPE=memory` or leave it unset

### Database Schema

The database schema includes the following tables:

- **accounts**: Stores financial accounts (savings, checking, credit, investment)
- **transactions**: Stores financial transactions (income, expense)
- **financial_goals**: Stores financial goals and progress
- **users**: Stores user information

### Rollback Strategy

If you need to revert to in-memory storage:

1. Set `STORAGE_TYPE=memory` in the `.env` file
2. Restart the application

## Development

- **Install Dependencies**
  ```bash
  npm install
  ```

- **Run Development Server**
  ```bash
  npm run dev
  ```

- **Build for Production**
  ```bash
  npm run build
  ```

- **Start Production Server**
  ```bash
  npm start