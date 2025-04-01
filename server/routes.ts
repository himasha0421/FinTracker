import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertAccountSchema,
  insertTransactionSchema,
  insertFinancialGoalSchema,
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();

  // === Account Routes ===

  // Get all accounts
  router.get("/accounts", async (req: Request, res: Response) => {
    try {
      const accounts = await storage.getAccounts();
      res.json(accounts);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching accounts", error: String(error) });
    }
  });

  // Get account by id
  router.get("/accounts/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const account = await storage.getAccount(id);

      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      res.json(account);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching account", error: String(error) });
    }
  });

  // Create a new account
  router.post("/accounts", async (req: Request, res: Response) => {
    try {
      const accountData = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount(accountData);
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Invalid account data",
          error: fromZodError(error).message,
        });
      }
      res
        .status(500)
        .json({ message: "Error creating account", error: String(error) });
    }
  });

  // Update an account
  router.patch("/accounts/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const accountData = insertAccountSchema.partial().parse(req.body);

      const updatedAccount = await storage.updateAccount(id, accountData);

      if (!updatedAccount) {
        return res.status(404).json({ message: "Account not found" });
      }

      res.json(updatedAccount);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Invalid account data",
          error: fromZodError(error).message,
        });
      }
      res
        .status(500)
        .json({ message: "Error updating account", error: String(error) });
    }
  });

  // Delete an account
  router.delete("/accounts/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAccount(id);

      if (!success) {
        return res.status(404).json({ message: "Account not found" });
      }

      res.status(204).end();
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error deleting account", error: String(error) });
    }
  });

  // Get total balance
  router.get("/balance", async (req: Request, res: Response) => {
    try {
      const totalBalance = await storage.getTotalBalance();
      res.json({ balance: totalBalance });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching balance", error: String(error) });
    }
  });

  // === Transaction Routes ===

  // Get all transactions or with limit
  router.get("/transactions", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit
        ? parseInt(req.query.limit as string)
        : undefined;
      const transactions = await storage.getTransactions(limit);
      res.json(transactions);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching transactions", error: String(error) });
    }
  });

  // Get transaction by id
  router.get("/transactions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const transaction = await storage.getTransaction(id);

      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      res.json(transaction);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching transaction", error: String(error) });
    }
  });

  // Get transactions by account id
  router.get(
    "/accounts/:id/transactions",
    async (req: Request, res: Response) => {
      try {
        const accountId = parseInt(req.params.id);
        const transactions = await storage.getTransactionsByAccount(accountId);
        res.json(transactions);
      } catch (error) {
        res
          .status(500)
          .json({
            message: "Error fetching account transactions",
            error: String(error),
          });
      }
    },
  );

  // Create a new transaction
  router.post("/transactions", async (req: Request, res: Response) => {
    try {
      // Convert string date to Date object if present with timezone handling
      const requestData = { ...req.body };
      if (requestData.date && typeof requestData.date === 'string') {
        // Parse the date string in YYYY-MM-DD format
        // Add 12 hours to ensure the date doesn't shift due to timezone
        const [year, month, day] = requestData.date.split('-').map(Number);
        if (year && month && day) {
          const adjustedDate = new Date(year, month - 1, day, 12, 0, 0);
          console.log("Original date string:", requestData.date, "Parsed date:", adjustedDate);
          requestData.date = adjustedDate;
        } else {
          // Fallback if the format is not as expected
          requestData.date = new Date(requestData.date);
        }
      }
      
      const transactionData = insertTransactionSchema.parse(requestData);
      const transaction = await storage.createTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({
          message: "Invalid transaction data",
          error: fromZodError(error).message,
          details: error.errors,
        });
      }
      res
        .status(500)
        .json({ message: "Error creating transaction", error: String(error) });
    }
  });

  // Update a transaction
  router.patch("/transactions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      console.log("Updating transaction:", id, "with data:", req.body);

      // Convert string date to Date object if present with timezone handling
      const requestData = { ...req.body };
      if (requestData.date && typeof requestData.date === 'string') {
        // Parse the date string in YYYY-MM-DD format
        // Add 12 hours to ensure the date doesn't shift due to timezone
        const [year, month, day] = requestData.date.split('-').map(Number);
        if (year && month && day) {
          const adjustedDate = new Date(year, month - 1, day, 12, 0, 0);
          console.log("Original date string:", requestData.date, "Parsed date:", adjustedDate);
          requestData.date = adjustedDate;
        } else {
          // Fallback if the format is not as expected
          requestData.date = new Date(requestData.date);
        }
      }

      const transactionData = insertTransactionSchema.partial().parse(requestData);
      console.log("Validated transaction data:", transactionData);

      const updatedTransaction = await storage.updateTransaction(
        id,
        transactionData,
      );

      if (!updatedTransaction) {
        console.log("Transaction not found:", id);
        return res.status(404).json({ message: "Transaction not found" });
      }

      console.log("Successfully updated transaction:", updatedTransaction);
      res.json(updatedTransaction);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({
          message: "Invalid transaction data",
          error: fromZodError(error).message,
          details: error.errors,
        });
      }
      console.error("Error updating transaction:", error);
      res
        .status(500)
        .json({ message: "Error updating transaction", error: String(error) });
    }
  });

  // Delete a transaction
  router.delete("/transactions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTransaction(id);

      if (!success) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      res.status(204).end();
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error deleting transaction", error: String(error) });
    }
  });

  // === Financial Goal Routes ===

  // Get all financial goals
  router.get("/goals", async (req: Request, res: Response) => {
    try {
      const goals = await storage.getFinancialGoals();
      res.json(goals);
    } catch (error) {
      res
        .status(500)
        .json({
          message: "Error fetching financial goals",
          error: String(error),
        });
    }
  });

  // Get financial goal by id
  router.get("/goals/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const goal = await storage.getFinancialGoal(id);

      if (!goal) {
        return res.status(404).json({ message: "Financial goal not found" });
      }

      res.json(goal);
    } catch (error) {
      res
        .status(500)
        .json({
          message: "Error fetching financial goal",
          error: String(error),
        });
    }
  });

  // Create a new financial goal
  router.post("/goals", async (req: Request, res: Response) => {
    try {
      // Convert string date to Date object if present
      const requestData = { ...req.body };
      if (requestData.targetDate && typeof requestData.targetDate === 'string') {
        requestData.targetDate = new Date(requestData.targetDate);
      }
      
      const goalData = insertFinancialGoalSchema.parse(requestData);
      const goal = await storage.createFinancialGoal(goalData);
      res.status(201).json(goal);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({
          message: "Invalid financial goal data",
          error: fromZodError(error).message,
          details: error.errors,
        });
      }
      res
        .status(500)
        .json({
          message: "Error creating financial goal",
          error: String(error),
        });
    }
  });

  // Update a financial goal
  router.patch("/goals/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Convert string date to Date object if present
      const requestData = { ...req.body };
      if (requestData.targetDate && typeof requestData.targetDate === 'string') {
        requestData.targetDate = new Date(requestData.targetDate);
      }
      
      const goalData = insertFinancialGoalSchema.partial().parse(requestData);

      const updatedGoal = await storage.updateFinancialGoal(id, goalData);

      if (!updatedGoal) {
        return res.status(404).json({ message: "Financial goal not found" });
      }

      res.json(updatedGoal);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({
          message: "Invalid financial goal data",
          error: fromZodError(error).message,
          details: error.errors,
        });
      }
      res
        .status(500)
        .json({
          message: "Error updating financial goal",
          error: String(error),
        });
    }
  });

  // Delete a financial goal
  router.delete("/goals/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteFinancialGoal(id);

      if (!success) {
        return res.status(404).json({ message: "Financial goal not found" });
      }

      res.status(204).end();
    } catch (error) {
      res
        .status(500)
        .json({
          message: "Error deleting financial goal",
          error: String(error),
        });
    }
  });

  // Register API routes with /api prefix
  app.use("/api", router);

  const httpServer = createServer(app);
  return httpServer;
}
