import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: Database | null = null;

export async function initializeDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  db = await open({
    filename: path.join(__dirname, "../data.db"),
    driver: sqlite3.Database,
  });

  await db.exec("PRAGMA foreign_keys = ON");

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      firstName TEXT,
      lastName TEXT,
      role TEXT NOT NULL DEFAULT 'candidate',
      company TEXT,
      phone TEXT,
      bio TEXT,
      avatar TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      userId TEXT NOT NULL,
      location TEXT NOT NULL,
      type TEXT NOT NULL,
      salary TEXT NOT NULL,
      description TEXT NOT NULL,
      requirements TEXT NOT NULL,
      posted TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      jobId TEXT NOT NULL,
      userId TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      resume TEXT,
      coverLetter TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (jobId) REFERENCES jobs(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      logo TEXT,
      website TEXT,
      industry TEXT,
      size TEXT,
      phone TEXT,
      verified BOOLEAN DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS blogs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT,
      image TEXT,
      tags TEXT,
      published BOOLEAN DEFAULT 0,
      views INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS case_studies (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      client TEXT NOT NULL,
      challenge TEXT NOT NULL,
      solution TEXT NOT NULL,
      results TEXT NOT NULL,
      image TEXT,
      tags TEXT,
      published BOOLEAN DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT NOT NULL,
      eventDate TEXT NOT NULL,
      eventTime TEXT NOT NULL,
      image TEXT,
      capacity INTEGER,
      registered INTEGER DEFAULT 0,
      published BOOLEAN DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      content TEXT NOT NULL,
      image TEXT,
      rating INTEGER,
      published BOOLEAN DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS featured_jobs (
      id TEXT PRIMARY KEY,
      jobId TEXT NOT NULL,
      featured BOOLEAN DEFAULT 1,
      featuredUntil TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (jobId) REFERENCES jobs(id)
    );
  `);

  return db;
}

export async function getDatabase(): Promise<Database> {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}
