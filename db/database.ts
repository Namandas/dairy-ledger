// db/database.ts
import * as SQLite from 'expo-sqlite';
import { schema } from './schema';

const DB_NAME = 'dairy.db';
export const db = SQLite.openDatabaseSync(DB_NAME);

export const initDB = () => {
  try {
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      db.execSync(stmt + ';');
    }

    console.log('DB initialized');
  } catch (error) {
    console.error('DB init error:', error);
  }
};
