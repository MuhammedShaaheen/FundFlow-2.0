import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("funds.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    place TEXT NOT NULL,
    contact TEXT,
    amount REAL NOT NULL,
    paid_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'unpaid',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migration: Add paid_amount if it doesn't exist
try {
  db.exec("ALTER TABLE collections ADD COLUMN paid_amount REAL DEFAULT 0");
} catch (e) {
  // Column likely already exists
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/collections", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM collections ORDER BY created_at DESC").all();
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/collections", (req, res) => {
    const { name, place, contact, amount, paid_amount, status } = req.body;
    
    // Server-side validation
    const numAmount = parseFloat(amount);
    let numPaid = parseFloat(paid_amount) || 0;

    if (status === 'paid') numPaid = numAmount;
    else if (status === 'unpaid') numPaid = 0;
    else if (status === 'partial') {
      if (numPaid >= numAmount) return res.status(400).json({ error: "Partial payment cannot exceed or equal total amount" });
      if (numPaid < 0) return res.status(400).json({ error: "Paid amount cannot be negative" });
    }

    try {
      const info = db.prepare(
        "INSERT INTO collections (name, place, contact, amount, paid_amount, status) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(name, place, contact, numAmount, numPaid, status);
      res.json({ id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/collections/:id", (req, res) => {
    const { id } = req.params;
    const { name, place, contact, amount, paid_amount, status } = req.body;

    // Server-side validation
    const numAmount = parseFloat(amount);
    let numPaid = parseFloat(paid_amount) || 0;

    if (status === 'paid') numPaid = numAmount;
    else if (status === 'unpaid') numPaid = 0;
    else if (status === 'partial') {
      if (numPaid >= numAmount) return res.status(400).json({ error: "Partial payment cannot exceed or equal total amount" });
      if (numPaid < 0) return res.status(400).json({ error: "Paid amount cannot be negative" });
    }

    try {
      db.prepare(
        "UPDATE collections SET name = ?, place = ?, contact = ?, amount = ?, paid_amount = ?, status = ? WHERE id = ?"
      ).run(name, place, contact, numAmount, numPaid, status, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/collections/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM collections WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Dashboard Stats
  app.get("/api/stats", (req, res) => {
    try {
      const totalPaid = db.prepare("SELECT SUM(paid_amount) as total FROM collections").get() as any;
      const totalTarget = db.prepare("SELECT SUM(amount) as total FROM collections").get() as any;
      
      const countTotal = db.prepare("SELECT COUNT(*) as count FROM collections").get() as any;
      const countCollected = db.prepare("SELECT COUNT(*) as count FROM collections WHERE paid_amount > 0").get() as any;
      const countPending = db.prepare("SELECT COUNT(*) as count FROM collections WHERE status != 'paid'").get() as any;

      const placeStats = db.prepare(`
        SELECT place, SUM(amount) as total, 
        SUM(paid_amount) as paid,
        SUM(amount - paid_amount) as unpaid
        FROM collections 
        GROUP BY place
        ORDER BY total DESC
      `).all();

      const leaderboard = db.prepare(`
        SELECT name, place, amount, paid_amount, status
        FROM collections 
        ORDER BY amount DESC 
        LIMIT 10
      `).all();

      res.json({
        totalPaid: totalPaid.total || 0,
        totalUnpaid: (totalTarget.total || 0) - (totalPaid.total || 0),
        totalTarget: totalTarget.total || 0,
        countTotal: countTotal.count || 0,
        countCollected: countCollected.count || 0,
        countPending: countPending.count || 0,
        placeStats,
        leaderboard
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/collections/bulk", (req, res) => {
    const collections = req.body;
    if (!Array.isArray(collections)) {
      return res.status(400).json({ error: "Invalid data format" });
    }

    const insert = db.prepare(
      "INSERT INTO collections (name, place, contact, amount, paid_amount, status) VALUES (?, ?, ?, ?, ?, ?)"
    );

    const transaction = db.transaction((data) => {
      for (const item of data) {
        const amount = parseFloat(item.amount) || 0;
        const status = item.status || "unpaid";
        let paid_amount = parseFloat(item.paid_amount) || 0;
        
        if (status === 'paid') paid_amount = amount;
        else if (status === 'unpaid') paid_amount = 0;
        else if (status === 'partial') {
          if (paid_amount >= amount) {
            paid_amount = amount;
          }
        }

        insert.run(
          item.name,
          item.place,
          item.contact || "",
          amount,
          paid_amount,
          status
        );
      }
    });

    try {
      transaction(collections);
      res.json({ success: true, count: collections.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
