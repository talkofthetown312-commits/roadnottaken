import initSqlJs, { Database } from 'sql.js';
import { MenuItem } from './types.js';

export const CATALOG_ITEMS: MenuItem[] = [
  {
    item_id: 'item-001',
    name: 'Paneer Butter Masala',
    category: 'North Indian',
    price: 340,
    is_veg: true,
    station: 'KITCHEN',
    description: 'Cottage cheese cubes tossed in rich tomato-cashew satin gravy'
  },
  {
    item_id: 'item-002',
    name: 'Dal Makhani',
    category: 'North Indian',
    price: 280,
    is_veg: true,
    station: 'KITCHEN',
    description: 'Slow-cooked black lentils simmered overnight with churned butter'
  },
  {
    item_id: 'item-003',
    name: 'Butter Naan',
    category: 'Tandoor',
    price: 65,
    is_veg: true,
    station: 'TANDOOR',
    description: 'Leavened flatbread baked crisp in charcoal clay tandoor'
  },
  {
    item_id: 'item-004',
    name: 'Chicken Dum Biryani',
    category: 'Rice & Biryani',
    price: 420,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Aromatic aged basmati rice cooked on dum with marinated chicken'
  },
  {
    item_id: 'item-005',
    name: 'Paneer Tikka (6 Pcs)',
    category: 'Tandoor',
    price: 320,
    is_veg: true,
    station: 'TANDOOR',
    description: 'Spiced yogurt marinated paneer skewers with bell peppers'
  },
  {
    item_id: 'item-006',
    name: 'Fresh Mango Lassi',
    category: 'Beverages',
    price: 140,
    is_veg: true,
    station: 'BAR',
    description: 'Thick churned sweet yogurt blended with Alphonso pulp'
  },
  {
    item_id: 'item-007',
    name: 'Cutting Masala Chai',
    category: 'Beverages',
    price: 60,
    is_veg: true,
    station: 'BAR',
    description: 'Brewed Assam tea leaves with crushed ginger and green cardamom'
  },
  {
    item_id: 'item-008',
    name: 'Gulab Jamun (2 Pcs)',
    category: 'Desserts',
    price: 110,
    is_veg: true,
    station: 'KITCHEN',
    description: 'Golden mawa dumplings soaked in warm saffron-cardamom syrup'
  }
];

let dbInstance: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // 1. Local Edge Tables (Exact SQLite schemas from Part 1)
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id TEXT PRIMARY KEY,
      outlet_id TEXT NOT NULL,
      terminal_id TEXT NOT NULL,
      invoice_number TEXT UNIQUE,
      table_id TEXT,
      order_status TEXT NOT NULL CHECK(order_status IN ('PENDING', 'PREPARING', 'COMPLETED', 'CANCELLED')),
      order_type TEXT NOT NULL CHECK(order_type IN ('DINE_IN', 'TAKEAWAY', 'DELIVERY')),
      payment_method TEXT DEFAULT 'CASH' CHECK(payment_method IN ('CASH', 'UPI', 'CARD', 'AGGREGATOR')),
      customer_id TEXT,
      customer_phone TEXT,
      customer_name TEXT,
      loyalty_points_redeemed INTEGER DEFAULT 0,
      loyalty_points_earned INTEGER DEFAULT 0,
      upi_utr_reference TEXT,
      sub_total DECIMAL(10, 2) NOT NULL,
      tax_total DECIMAL(10, 2) NOT NULL,
      discount_total DECIMAL(10, 2) DEFAULT 0.00,
      grand_total DECIMAL(10, 2) NOT NULL,
      sync_status TEXT DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      order_item_id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      unit_price DECIMAL(10, 2) NOT NULL,
      sub_total DECIMAL(10, 2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_orders_sync_status ON orders(sync_status);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
  `);

  // 2. Inventory & Recipe Bill of Materials (BOM) Tables
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      ingredient_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      current_stock REAL NOT NULL,
      reorder_level REAL NOT NULL,
      cost_per_unit DECIMAL(10, 2) NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recipe_bom (
      item_id TEXT NOT NULL,
      ingredient_id TEXT NOT NULL,
      quantity_required REAL NOT NULL,
      PRIMARY KEY (item_id, ingredient_id),
      FOREIGN KEY (ingredient_id) REFERENCES inventory_items(ingredient_id)
    );
  `);

  // 3. Cashier Shifts & Cash Management Tables (Milestone 9)
  db.run(`
    CREATE TABLE IF NOT EXISTS cashier_shifts (
      shift_id TEXT PRIMARY KEY,
      terminal_id TEXT NOT NULL,
      cashier_name TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('OPEN', 'CLOSED')),
      opening_float DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      cash_in_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      cash_out_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      cash_sales DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      upi_sales DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      card_sales DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      aggregator_sales DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      total_sales DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      order_count INTEGER NOT NULL DEFAULT 0,
      expected_cash DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      actual_cash_counted DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      variance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      variance_reason TEXT,
      z_report_number TEXT,
      z_report_text TEXT,
      opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      sync_status TEXT DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED'))
    );

    CREATE TABLE IF NOT EXISTS shift_cash_adjustments (
      adjustment_id TEXT PRIMARY KEY,
      shift_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('CASH_IN', 'CASH_OUT')),
      amount DECIMAL(10, 2) NOT NULL,
      reason TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shift_id) REFERENCES cashier_shifts(shift_id) ON DELETE CASCADE
    );
  `);

  // 4. Dining Floor Tables (Milestone 10)
  db.run(`
    CREATE TABLE IF NOT EXISTS dining_tables (
      table_id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      section TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('AVAILABLE', 'OCCUPIED', 'BILLED')),
      active_order_id TEXT,
      merged_with_table_id TEXT,
      guest_count INTEGER NOT NULL DEFAULT 0,
      occupied_since DATETIME
    );
  `);

  // 5. Hardware Print Spooler Log Table
  db.run(`
    CREATE TABLE IF NOT EXISTS print_spool_jobs (
      job_id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      job_type TEXT NOT NULL CHECK(job_type IN ('KOT', 'RECEIPT', 'Z_REPORT')),
      target_printer TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('SENT', 'FAILED', 'RETRYING')),
      formatted_text TEXT NOT NULL,
      hex_preview TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. Cloud Core Storage Ledger (Simulating PostgreSQL multi-outlet core)
  db.run(`
    CREATE TABLE IF NOT EXISTS cloud_orders (
      order_id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      outlet_id TEXT NOT NULL,
      terminal_id TEXT NOT NULL,
      invoice_number TEXT UNIQUE,
      table_id TEXT,
      order_status TEXT NOT NULL,
      order_type TEXT NOT NULL,
      payment_method TEXT DEFAULT 'CASH',
      sub_total DECIMAL(10, 2) NOT NULL,
      tax_total DECIMAL(10, 2) NOT NULL,
      discount_total DECIMAL(10, 2) DEFAULT 0.00,
      grand_total DECIMAL(10, 2) NOT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cloud_order_items (
      order_item_id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10, 2) NOT NULL,
      sub_total DECIMAL(10, 2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES cloud_orders(order_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS webhook_logs (
      webhook_id TEXT PRIMARY KEY,
      aggregator TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      signature_valid INTEGER NOT NULL,
      order_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 7. Customer CRM, Loyalty Wallet & Dynamic UPI Payment Intents (Milestone 11)
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      customer_id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      loyalty_points INTEGER NOT NULL DEFAULT 0,
      lifetime_spend DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      visit_count INTEGER NOT NULL DEFAULT 0,
      tier TEXT NOT NULL DEFAULT 'SILVER' CHECK(tier IN ('SILVER', 'GOLD', 'PLATINUM')),
      last_visit_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS loyalty_ledger (
      ledger_id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      points_delta INTEGER NOT NULL,
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('EARN', 'REDEEM', 'BONUS')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
    );

    CREATE TABLE IF NOT EXISTS upi_payment_intents (
      intent_id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL,
      merchant_vpa TEXT NOT NULL,
      merchant_name TEXT NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      upi_uri TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('AWAITING_PAYMENT', 'VERIFIED', 'EXPIRED')),
      utr_number TEXT,
      payer_vpa TEXT,
      soundbox_announcement TEXT,
      verified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedInitialShift(db);

  // Seed Initial Inventory Items & Recipe BOM
  seedInventory(db);

  // Seed Dining Floor Plan & Running Table Orders
  seedInitialTables(db);

  // Seed Regular Customers & Loyalty Profiles
  seedInitialCustomers(db);

  dbInstance = db;
  return dbInstance;
}

function seedInventory(db: Database) {
  const check = db.exec("SELECT COUNT(*) as count FROM inventory_items");
  const count = check[0]?.values[0]?.[0] as number;
  if (count > 0) return;

  const ingredients = [
    { id: 'ing-paneer', name: 'Fresh Malai Paneer', unit: 'g', stock: 12500, reorder: 3000, cost: 0.45 },
    { id: 'ing-butter', name: 'Amul Salted Butter', unit: 'g', stock: 8000, reorder: 2000, cost: 0.60 },
    { id: 'ing-cream', name: 'Fresh Dairy Cream', unit: 'ml', stock: 6500, reorder: 1500, cost: 0.35 },
    { id: 'ing-flour', name: 'Maida Wheat Flour', unit: 'g', stock: 25000, reorder: 5000, cost: 0.08 },
    { id: 'ing-chicken', name: 'Fresh Boneless Chicken', unit: 'g', stock: 14000, reorder: 4000, cost: 0.38 },
    { id: 'ing-rice', name: 'Aged Basmati Rice', unit: 'g', stock: 30000, reorder: 6000, cost: 0.12 },
    { id: 'ing-dal', name: 'Black Urad Dal', unit: 'g', stock: 15000, reorder: 3500, cost: 0.16 },
    { id: 'ing-curd', name: 'Whole Milk Curd', unit: 'g', stock: 11000, reorder: 2500, cost: 0.09 },
    { id: 'ing-mango', name: 'Alphonso Mango Puree', unit: 'ml', stock: 5000, reorder: 1200, cost: 0.55 },
    { id: 'ing-box', name: 'Eco-Craft Meal Box', unit: 'pcs', stock: 450, reorder: 100, cost: 12.00 }
  ];

  for (const ing of ingredients) {
    db.run(
      `INSERT INTO inventory_items (ingredient_id, name, unit, current_stock, reorder_level, cost_per_unit)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ing.id, ing.name, ing.unit, ing.stock, ing.reorder, ing.cost]
    );
  }

  // Seed Recipe BOM
  const recipes = [
    // Paneer Butter Masala (item-001)
    { item_id: 'item-001', ingredient_id: 'ing-paneer', qty: 200 },
    { item_id: 'item-001', ingredient_id: 'ing-butter', qty: 40 },
    { item_id: 'item-001', ingredient_id: 'ing-cream', qty: 30 },
    // Dal Makhani (item-002)
    { item_id: 'item-002', ingredient_id: 'ing-dal', qty: 150 },
    { item_id: 'item-002', ingredient_id: 'ing-butter', qty: 50 },
    { item_id: 'item-002', ingredient_id: 'ing-cream', qty: 25 },
    // Butter Naan (item-003)
    { item_id: 'item-003', ingredient_id: 'ing-flour', qty: 120 },
    { item_id: 'item-003', ingredient_id: 'ing-butter', qty: 20 },
    // Chicken Dum Biryani (item-004)
    { item_id: 'item-004', ingredient_id: 'ing-chicken', qty: 250 },
    { item_id: 'item-004', ingredient_id: 'ing-rice', qty: 200 },
    { item_id: 'item-004', ingredient_id: 'ing-curd', qty: 50 },
    // Paneer Tikka (item-005)
    { item_id: 'item-005', ingredient_id: 'ing-paneer', qty: 220 },
    { item_id: 'item-005', ingredient_id: 'ing-curd', qty: 60 },
    { item_id: 'item-005', ingredient_id: 'ing-butter', qty: 15 },
    // Fresh Mango Lassi (item-006)
    { item_id: 'item-006', ingredient_id: 'ing-curd', qty: 200 },
    { item_id: 'item-006', ingredient_id: 'ing-mango', qty: 80 }
  ];

  for (const r of recipes) {
    db.run(
      `INSERT INTO recipe_bom (item_id, ingredient_id, quantity_required) VALUES (?, ?, ?)`,
      [r.item_id, r.ingredient_id, r.qty]
    );
  }
}

function seedInitialShift(db: Database) {
  const check = db.exec("SELECT COUNT(*) as count FROM cashier_shifts");
  const count = check[0]?.values[0]?.[0] as number;
  if (count > 0) return;

  db.run(`
    INSERT INTO cashier_shifts (
      shift_id, terminal_id, cashier_name, status, opening_float,
      cash_in_total, cash_out_total, cash_sales, upi_sales, card_sales,
      aggregator_sales, total_sales, order_count, expected_cash,
      actual_cash_counted, variance, opened_at, sync_status
    ) VALUES (
      'shift-live-01', 'POS-01', 'Anita Deshmukh', 'OPEN', 2000.00,
      0.00, 0.00, 0.00, 0.00, 0.00,
      0.00, 0.00, 0, 2000.00,
      0.00, 0.00, CURRENT_TIMESTAMP, 'PENDING'
    )
  `);
}

function seedInitialTables(db: Database) {
  const check = db.exec("SELECT COUNT(*) as count FROM dining_tables");
  const count = check[0]?.values[0]?.[0] as number;
  if (count > 0) return;

  const tables = [
    { id: 'T-01', name: 'Table 01', section: 'AC Main Hall', cap: 4 },
    { id: 'T-02', name: 'Table 02', section: 'AC Main Hall', cap: 4 },
    { id: 'T-03', name: 'Table 03', section: 'AC Main Hall', cap: 6 },
    { id: 'T-04', name: 'Table 04', section: 'AC Main Hall', cap: 2 },
    { id: 'T-05', name: 'Table 05', section: 'AC Main Hall', cap: 8 },
    { id: 'T-06', name: 'Table 06', section: 'Open Courtyard', cap: 4 },
    { id: 'T-07', name: 'Table 07', section: 'Open Courtyard', cap: 4 },
    { id: 'T-08', name: 'Table 08', section: 'Open Courtyard', cap: 6 },
    { id: 'T-09', name: 'Table 09', section: 'Open Courtyard', cap: 2 },
    { id: 'T-10', name: 'Bar Booth 10', section: 'Bar Lounge', cap: 4 },
    { id: 'T-11', name: 'Bar Booth 11', section: 'Bar Lounge', cap: 4 },
    { id: 'T-12', name: 'VIP Table 12', section: 'Bar Lounge', cap: 6 },
  ];

  for (const t of tables) {
    db.run(
      `INSERT INTO dining_tables (table_id, table_name, section, capacity, status, guest_count)
       VALUES (?, ?, ?, ?, 'AVAILABLE', 0)`,
      [t.id, t.name, t.section, t.cap]
    );
  }

  // Seed a live running order on Table T-02 (4 guests) ready for Split-Bill or Transfer testing
  const seedOrder1 = 'ord-seed-t02-running';
  db.run(
    `INSERT INTO orders (
      order_id, outlet_id, terminal_id, invoice_number, table_id,
      order_status, order_type, payment_method, sub_total, tax_total,
      discount_total, grand_total, sync_status, created_at, updated_at
    ) VALUES (?, 'OUTLET-BLR-01', 'POS-01', 'INV-T02-8810', 'T-02',
              'PREPARING', 'DINE_IN', 'CASH', 1170.00, 58.50, 0.00, 1228.50, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [seedOrder1]
  );

  db.run(
    `INSERT INTO order_items (order_item_id, order_id, item_id, item_name, quantity, unit_price, sub_total)
     VALUES 
       ('oi-seed-1', ?, 'item-001', 'Paneer Butter Masala', 1, 340, 340),
       ('oi-seed-2', ?, 'item-004', 'Chicken Dum Biryani', 1, 420, 420),
       ('oi-seed-3', ?, 'item-003', 'Butter Naan', 2, 65, 130),
       ('oi-seed-4', ?, 'item-006', 'Fresh Mango Lassi', 2, 140, 280)`,
    [seedOrder1, seedOrder1, seedOrder1, seedOrder1]
  );

  db.run(
    `UPDATE dining_tables 
     SET status = 'OCCUPIED', active_order_id = ?, guest_count = 4, occupied_since = CURRENT_TIMESTAMP
     WHERE table_id = 'T-02'`,
    [seedOrder1]
  );

  // Seed a second running order on Table T-06 (2 guests) so Table Merge can combine two live orders
  const seedOrder2 = 'ord-seed-t06-running';
  db.run(
    `INSERT INTO orders (
      order_id, outlet_id, terminal_id, invoice_number, table_id,
      order_status, order_type, payment_method, sub_total, tax_total,
      discount_total, grand_total, sync_status, created_at, updated_at
    ) VALUES (?, 'OUTLET-BLR-01', 'CAPTAIN-01', 'INV-T06-8814', 'T-06',
              'PREPARING', 'DINE_IN', 'UPI', 600.00, 30.00, 0.00, 630.00, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [seedOrder2]
  );

  db.run(
    `INSERT INTO order_items (order_item_id, order_id, item_id, item_name, quantity, unit_price, sub_total)
     VALUES 
       ('oi-seed-5', ?, 'item-005', 'Paneer Tikka (6 Pcs)', 1, 320, 320),
       ('oi-seed-6', ?, 'item-002', 'Dal Makhani', 1, 280, 280)`,
    [seedOrder2, seedOrder2]
  );

  db.run(
    `UPDATE dining_tables 
     SET status = 'OCCUPIED', active_order_id = ?, guest_count = 2, occupied_since = CURRENT_TIMESTAMP
     WHERE table_id = 'T-06'`,
    [seedOrder2]
  );
}

function seedInitialCustomers(db: Database) {
  const check = db.exec("SELECT COUNT(*) as count FROM customers");
  const count = check[0]?.values[0]?.[0] as number;
  if (count > 0) return;

  const customers = [
    {
      id: 'cust-001',
      phone: '9845012345',
      name: 'Rahul Sharma',
      email: 'rahul.sharma@bengalurutech.in',
      points: 240,
      spend: 5840.00,
      visits: 7,
      tier: 'GOLD'
    },
    {
      id: 'cust-002',
      phone: '9880198765',
      name: 'Priya Nair',
      email: 'priya.nair@indiranagar.org',
      points: 610,
      spend: 14250.00,
      visits: 16,
      tier: 'PLATINUM'
    },
    {
      id: 'cust-003',
      phone: '9900112233',
      name: 'Vikramaditya Rao',
      email: 'vikram.rao@koramangala.co',
      points: 85,
      spend: 1920.00,
      visits: 3,
      tier: 'SILVER'
    },
    {
      id: 'cust-004',
      phone: '9740556677',
      name: 'Sneha Kulkarni',
      email: 'sneha.k@studio.design',
      points: 320,
      spend: 7600.00,
      visits: 9,
      tier: 'GOLD'
    }
  ];

  for (const c of customers) {
    db.run(
      `INSERT INTO customers (
        customer_id, phone, name, email, loyalty_points, lifetime_spend, visit_count, tier, last_visit_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [c.id, c.phone, c.name, c.email, c.points, c.spend, c.visits, c.tier]
    );
  }
}



