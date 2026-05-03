import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the db file is created in the api directory
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize schema
db.serialize(() => {
  // Raw Ingredients Table
  db.run(`
    CREATE TABLE IF NOT EXISTS RawIngredient (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      quantity INTEGER DEFAULT 0,
      expirationDate TEXT
    )
  `);

  // Canned Batch Table
  db.run(`
    CREATE TABLE IF NOT EXISTS CannedBatch (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipeName TEXT NOT NULL,
      quantity INTEGER DEFAULT 0,
      jarSize TEXT,
      dateCanned TEXT,
      expirationDate TEXT
    )
  `);

  // Empty Jar Table
  db.run(`
    CREATE TABLE IF NOT EXISTS EmptyJar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      size TEXT UNIQUE NOT NULL,
      quantity INTEGER DEFAULT 0
    )
  `);

  // Recipe Table
  db.run(`
    CREATE TABLE IF NOT EXISTS Recipe (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      sourceUrl TEXT,
      imagePath TEXT
    )
  `);

  // Initialize empty jars if they don't exist
  const sizes = ['Half-Pint', 'Pint', 'Quart'];
  sizes.forEach(size => {
    db.run(`INSERT OR IGNORE INTO EmptyJar (size, quantity) VALUES (?, ?)`, [size, 0]);
  });
});

export default db;
