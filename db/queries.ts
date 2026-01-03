// db/queries.ts
import { db } from './database';

/**
 * Run a SELECT query and return typed rows.
 * Uses Expo SQLite sync API.
 */
export function runQuery<T = any>(
  sql: string,
  params: any[] = []
): T[] {
  try {
    return db.getAllSync<T>(sql, params);
  } catch (error) {
    console.error('runQuery error:', { sql, params, error });
    return [];
  }
}

/**
 * Run INSERT / UPDATE / DELETE queries.
 */
export function runExecute(
  sql: string,
  params: any[] = []
): void {
  try {
    db.runSync(sql, params);
  } catch (error) {
    console.error('runExecute error:', { sql, params, error });
    throw error;
  }
}

/* ======================================================
   Customers
   ====================================================== */

export function fetchAllCustomers(): {
  id: number;
  name: string;
}[] {
  return runQuery(
    'SELECT id, name FROM customers ORDER BY name'
  );
}

export function insertCustomer(name: string): void {
  runExecute(
    'INSERT INTO customers (name) VALUES (?)',
    [name]
  );
}

export function deleteCustomer(id: number): void {
  runExecute(
    'DELETE FROM customers WHERE id = ?',
    [id]
  );
}

/* ======================================================
   Products & Sales
   ====================================================== */

export function fetchAllProducts(): {
  id: number;
  name: string;
  unit: string;
  base_price: number;
}[] {
  return runQuery(
    'SELECT id, name, unit, base_price FROM products ORDER BY name'
  );
}

export function fetchCustomerPrice(customer_id: number, product_id: number): number | null {
  const rows = runQuery<{ custom_price: number }>(
    'SELECT custom_price FROM customer_prices WHERE customer_id = ? AND product_id = ?',
    [customer_id, product_id]
  );
  if (rows.length === 0) return null;
  return rows[0].custom_price;
}

export function insertSale(customer_id: number, date: string): number {
  runExecute(
    'INSERT INTO sales (customer_id, date, total) VALUES (?, ?, 0)',
    [customer_id, date]
  );
  const rows = runQuery<{ id: number }>('SELECT last_insert_rowid() as id');
  return rows[0]?.id ?? 0;
}

export function insertSaleItem(sale_id: number, product_id: number, quantity: number, price_used: number): void {
  runExecute(
    'INSERT INTO sale_items (sale_id, product_id, quantity, price_used) VALUES (?, ?, ?, ?)',
    [sale_id, product_id, quantity, price_used]
  );
}

export function updateSaleTotal(sale_id: number, total: number): void {
  runExecute(
    'UPDATE sales SET total = ? WHERE id = ?',
    [total, sale_id]
  );
}

/**
 * Upsert (create or update) a sale atomically for a customer/date pair.
 * `items` is an array of { product_id, quantity, price }
 */
export function upsertDailySale(customer_id: number, date: string, items: { product_id: number; quantity: number; price: number }[]): void {
  const saleRows = runQuery<{ id: number }>('SELECT id FROM sales WHERE customer_id = ? AND date = ?', [customer_id, date]);
  const total = items.reduce((s, it) => s + (it.quantity * it.price), 0);

  const statements: { sql: string; params?: any[] }[] = [];
  statements.push({ sql: 'BEGIN TRANSACTION' });

  if (saleRows.length > 0) {
    const sid = saleRows[0].id;
    statements.push({ sql: 'DELETE FROM sale_items WHERE sale_id = ?', params: [sid] });

    for (const it of items) {
      statements.push({ sql: 'INSERT INTO sale_items (sale_id, product_id, quantity, price_used) VALUES (?, ?, ?, ?)', params: [sid, it.product_id, it.quantity, it.price] });
    }

    statements.push({ sql: 'UPDATE sales SET total = ? WHERE id = ?', params: [total, sid] });
  } else {
    statements.push({ sql: 'INSERT INTO sales (customer_id, date, total) VALUES (?, ?, ?)', params: [customer_id, date, total] });

    for (const it of items) {
      statements.push({ sql: 'INSERT INTO sale_items (sale_id, product_id, quantity, price_used) VALUES ((SELECT id FROM sales ORDER BY id DESC LIMIT 1), ?, ?, ?)', params: [it.product_id, it.quantity, it.price] });
    }
  }

  statements.push({ sql: 'COMMIT' });
  runBatch(statements);
}

/* ======================================================
   Products CRUD
   ====================================================== */

export function insertProduct(name: string, unit: string, base_price: number): void {
  runExecute(
    'INSERT INTO products (name, unit, base_price) VALUES (?, ?, ?)',
    [name, unit, base_price]
  );
}

export function fetchProductById(id: number): { id: number; name: string; unit: string; base_price: number } | null {
  const rows = runQuery<{ id: number; name: string; unit: string; base_price: number }>(
    'SELECT id, name, unit, base_price FROM products WHERE id = ?',
    [id]
  );
  return rows.length ? rows[0] : null;
}

export function updateProduct(id: number, name: string, unit: string, base_price: number): void {
  runExecute(
    'UPDATE products SET name = ?, unit = ?, base_price = ? WHERE id = ?',
    [name, unit, base_price, id]
  );
}

export function deleteProduct(id: number): void {
  runExecute(
    'DELETE FROM products WHERE id = ?',
    [id]
  );
}

/**
 * Fetch current stock per product using a single optimized SQL query.
 * current_stock = SUM(stock_in) - SUM(quantity sold)
 */
export function fetchInventoryPerProduct(): {
  id: number;
  name: string;
  unit: string;
  current_stock: number;
}[] {
  const sql = `
    SELECT
      p.id,
      p.name,
      p.unit,
      COALESCE((SELECT SUM(stock_in) FROM inventory WHERE product_id = p.id), 0)
        - COALESCE((SELECT SUM(si.quantity) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE si.product_id = p.id), 0)
        AS current_stock
    FROM products p
    ORDER BY p.name
  `;
  // Ensure numbers returned for current_stock by mapping on the JS side if needed
  const rows = runQuery<any>(sql);
  return rows.map((r: any) => ({ id: r.id, name: r.name, unit: r.unit, current_stock: Number(r.current_stock ?? 0) }));
}

/**
 * Convenience: return summary and low-stock items given a threshold.
 */
export function fetchInventorySummary(threshold = 2): {
  total_products: number;
  low_stock_count: number;
  low_stock_items: { id: number; name: string; unit: string; current_stock: number }[];
} {
  const rows = fetchInventoryPerProduct();
  const total = rows.length;
  const low = rows.filter(r => (r.current_stock ?? 0) <= threshold).map(r => ({ id: r.id, name: r.name, unit: r.unit, current_stock: Number(r.current_stock) }));
  return { total_products: total, low_stock_count: low.length, low_stock_items: low };
}

/**
 * Fetch incoming inventory rows for a specific date.
 */
export function fetchIncomingByDate(date: string): {
  id: number;
  product_id: number;
  stock_in: number;
}[] {
  // Use rowid AS id to be compatible with DBs that may not have an explicit `id` column
  return runQuery(
    'SELECT rowid AS id, product_id, stock_in FROM inventory WHERE date = ?',
    [date]
  );
}

/**
 * Compute leftover (current stock) up to and including a given date for every product.
 * Returns rows with product_id and leftover value.
 */
export function fetchLeftoverUpToDate(date: string): { product_id: number; leftover: number }[] {
  const sql = `
    SELECT
      p.id AS product_id,
      COALESCE((SELECT SUM(stock_in) FROM inventory WHERE product_id = p.id AND date <= ?), 0)
        - COALESCE((SELECT SUM(si.quantity) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE si.product_id = p.id AND s.date <= ?), 0)
        AS leftover
    FROM products p
  `;
  return runQuery(sql, [date, date]);
}

/**
 * Upsert incoming inventory entries for a given date.
 * `entries` is array of { product_id, stock_in }
 */
export function upsertIncomingForDate(date: string, entries: { product_id: number; stock_in: number }[]): void {
  const statements: { sql: string; params?: any[] }[] = [];
  statements.push({ sql: 'BEGIN TRANSACTION' });

  for (const e of entries) {
    // Use rowid to find existing row (works even if the table lacks an explicit `id` column)
    const exists = runQuery<{ id: number }>('SELECT rowid AS id FROM inventory WHERE product_id = ? AND date = ?', [e.product_id, date]);
    if (exists.length > 0) {
      statements.push({ sql: 'UPDATE inventory SET stock_in = ? WHERE rowid = ?', params: [e.stock_in, exists[0].id] });
    } else {
      statements.push({ sql: 'INSERT INTO inventory (product_id, date, stock_in) VALUES (?, ?, ?)', params: [e.product_id, date, e.stock_in] });
    }
  }

  statements.push({ sql: 'COMMIT' });
  runBatch(statements);
}

/* ======================================================
   Utility helpers
   ====================================================== */

/**
 * Execute multiple statements safely (pseudo-transaction).
 * SQLite sync API auto-locks per statement.
 */
export function runBatch(statements: {
  sql: string;
  params?: any[];
}[]): void {
  try {
    for (const { sql, params = [] } of statements) {
      db.runSync(sql, params);
    }
  } catch (error) {
    console.error('runBatch error:', error);
    throw error;
  }
}
