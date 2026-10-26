import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { MenuItem } from './types.js';

export const CATALOG_ITEMS: MenuItem[] = [
  // CHOWMEIN
  {
    item_id: 'cm-veg-s',
    name: 'Veg Chowmein (Small)',
    base_item: 'Veg Chowmein',
    portion_size: 'Small',
    category: 'Chowmein',
    price: 40,
    is_veg: true,
    station: 'KITCHEN',
    description: 'Wok-tossed noodles with fresh shredded cabbage, carrots, capsicum, and house sauce blend',
    barcode: '8903001001011'
  },
  {
    item_id: 'cm-veg-m',
    name: 'Veg Chowmein (Medium)',
    base_item: 'Veg Chowmein',
    portion_size: 'Medium',
    category: 'Chowmein',
    price: 50,
    is_veg: true,
    station: 'KITCHEN',
    description: 'Wok-tossed noodles with fresh shredded cabbage, carrots, capsicum, and house sauce blend',
    barcode: '8903001001028'
  },
  {
    item_id: 'cm-veg-l',
    name: 'Veg Chowmein (Large)',
    base_item: 'Veg Chowmein',
    portion_size: 'Large',
    category: 'Chowmein',
    price: 110,
    is_veg: true,
    station: 'KITCHEN',
    description: 'Generous sharing portion of wok-tossed noodles with fresh seasonal vegetables',
    barcode: '8903001001035'
  },
  {
    item_id: 'cm-egg-s',
    name: 'Egg Chowmein (Small)',
    base_item: 'Egg Chowmein',
    portion_size: 'Small',
    category: 'Chowmein',
    price: 40,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Stir-fried noodles with scrambled farm-fresh eggs and crunchy vegetables',
    barcode: '8903001002018'
  },
  {
    item_id: 'cm-egg-m',
    name: 'Egg Chowmein (Medium)',
    base_item: 'Egg Chowmein',
    portion_size: 'Medium',
    category: 'Chowmein',
    price: 60,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Stir-fried noodles with scrambled farm-fresh eggs and crunchy vegetables',
    barcode: '8903001002025'
  },
  {
    item_id: 'cm-egg-l',
    name: 'Egg Chowmein (Large)',
    base_item: 'Egg Chowmein',
    portion_size: 'Large',
    category: 'Chowmein',
    price: 130,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Large wok-tossed egg chowmein loaded with eggs, onions, and garlic greens',
    barcode: '8903001002032'
  },
  {
    item_id: 'cm-chk-s',
    name: 'Chicken Chowmein (Small)',
    base_item: 'Chicken Chowmein',
    portion_size: 'Small',
    category: 'Chowmein',
    price: 50,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Tender chicken slices stir-fried with noodles, garlic, and savory Asian sauces',
    barcode: '8903001003015'
  },
  {
    item_id: 'cm-chk-m',
    name: 'Chicken Chowmein (Medium)',
    base_item: 'Chicken Chowmein',
    portion_size: 'Medium',
    category: 'Chowmein',
    price: 80,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Tender chicken slices stir-fried with noodles, garlic, and savory Asian sauces',
    barcode: '8903001003022'
  },
  {
    item_id: 'cm-chk-l',
    name: 'Chicken Chowmein (Large)',
    base_item: 'Chicken Chowmein',
    portion_size: 'Large',
    category: 'Chowmein',
    price: 150,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Full-size wok of seasoned chicken chowmein with spring onions and black pepper',
    barcode: '8903001003039'
  },
  {
    item_id: 'cm-prk-s',
    name: 'Pork Chowmein (Small)',
    base_item: 'Pork Chowmein',
    portion_size: 'Small',
    category: 'Chowmein',
    price: 60,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Succulent pork cuts wok-tossed with noodles, fresh ginger, and dark soy',
    barcode: '8903001004012'
  },
  {
    item_id: 'cm-prk-m',
    name: 'Pork Chowmein (Medium)',
    base_item: 'Pork Chowmein',
    portion_size: 'Medium',
    category: 'Chowmein',
    price: 90,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Succulent pork cuts wok-tossed with noodles, fresh ginger, and dark soy',
    barcode: '8903001004029'
  },
  {
    item_id: 'cm-prk-l',
    name: 'Pork Chowmein (Large)',
    base_item: 'Pork Chowmein',
    portion_size: 'Large',
    category: 'Chowmein',
    price: 160,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Large sharing serving of spiced pork chowmein with crispy veggies',
    barcode: '8903001004036'
  },
  {
    item_id: 'cm-mix-s',
    name: 'Mixed Chowmein (Small)',
    base_item: 'Mixed Chowmein',
    portion_size: 'Small',
    category: 'Chowmein',
    price: 50,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Combination of chicken, egg, and vegetables tossed in high-flame wok',
    barcode: '8903001005019'
  },
  {
    item_id: 'cm-mix-m',
    name: 'Mixed Chowmein (Medium)',
    base_item: 'Mixed Chowmein',
    portion_size: 'Medium',
    category: 'Chowmein',
    price: 80,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Combination of chicken, egg, and vegetables tossed in high-flame wok',
    barcode: '8903001005026'
  },
  {
    item_id: 'cm-mix-l',
    name: 'Mixed Chowmein (Large)',
    base_item: 'Mixed Chowmein',
    portion_size: 'Large',
    category: 'Chowmein',
    price: 200,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Deluxe mixed chowmein with chicken, pork, egg, and assorted greens',
    barcode: '8903001005033'
  },

  // FRIED RICE
  {
    item_id: 'fr-veg-s',
    name: 'Veg Fried Rice (Small)',
    base_item: 'Veg Fried Rice',
    portion_size: 'Small',
    category: 'Fried Rice',
    price: 30,
    is_veg: true,
    station: 'KITCHEN',
    description: 'Fragrant steamed rice tossed with diced carrots, beans, cabbage, and light seasoning',
    barcode: '8903002001010'
  },
  {
    item_id: 'fr-veg-m',
    name: 'Veg Fried Rice (Medium)',
    base_item: 'Veg Fried Rice',
    portion_size: 'Medium',
    category: 'Fried Rice',
    price: 50,
    is_veg: true,
    station: 'KITCHEN',
    description: 'Fragrant steamed rice tossed with diced carrots, beans, cabbage, and light seasoning',
    barcode: '8903002001027'
  },
  {
    item_id: 'fr-veg-l',
    name: 'Veg Fried Rice (Large)',
    base_item: 'Veg Fried Rice',
    portion_size: 'Large',
    category: 'Fried Rice',
    price: 130,
    is_veg: true,
    station: 'KITCHEN',
    description: 'Large family portion of garden-fresh vegetable fried rice',
    barcode: '8903002001034'
  },
  {
    item_id: 'fr-egg-s',
    name: 'Egg Fried Rice (Small)',
    base_item: 'Egg Fried Rice',
    portion_size: 'Small',
    category: 'Fried Rice',
    price: 40,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Classic wok-fried rice with fluffy scrambled egg ribbons and spring onions',
    barcode: '8903002002017'
  },
  {
    item_id: 'fr-egg-m',
    name: 'Egg Fried Rice (Medium)',
    base_item: 'Egg Fried Rice',
    portion_size: 'Medium',
    category: 'Fried Rice',
    price: 60,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Classic wok-fried rice with fluffy scrambled egg ribbons and spring onions',
    barcode: '8903002002024'
  },
  {
    item_id: 'fr-egg-l',
    name: 'Egg Fried Rice (Large)',
    base_item: 'Egg Fried Rice',
    portion_size: 'Large',
    category: 'Fried Rice',
    price: 140,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Large serving of egg fried rice seasoned with white pepper and garlic',
    barcode: '8903002002031'
  },
  {
    item_id: 'fr-chk-s',
    name: 'Chicken Fried Rice (Small)',
    base_item: 'Chicken Fried Rice',
    portion_size: 'Small',
    category: 'Fried Rice',
    price: 50,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Steamed rice tossed with marinated diced chicken, crushed garlic, and greens',
    barcode: '8903002003014'
  },
  {
    item_id: 'fr-chk-m',
    name: 'Chicken Fried Rice (Medium)',
    base_item: 'Chicken Fried Rice',
    portion_size: 'Medium',
    category: 'Fried Rice',
    price: 70,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Steamed rice tossed with marinated diced chicken, crushed garlic, and greens',
    barcode: '8903002003021'
  },
  {
    item_id: 'fr-chk-l',
    name: 'Chicken Fried Rice (Large)',
    base_item: 'Chicken Fried Rice',
    portion_size: 'Large',
    category: 'Fried Rice',
    price: 160,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Generous portion of aromatic chicken fried rice with spring onions and garlic',
    barcode: '8903002003038'
  },
  {
    item_id: 'fr-prk-s',
    name: 'Pork Fried Rice (Small)',
    base_item: 'Pork Fried Rice',
    portion_size: 'Small',
    category: 'Fried Rice',
    price: 60,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Tender pork bits tossed with seasoned wok rice and crisp garden vegetables',
    barcode: '8903002004011'
  },
  {
    item_id: 'fr-prk-m',
    name: 'Pork Fried Rice (Medium)',
    base_item: 'Pork Fried Rice',
    portion_size: 'Medium',
    category: 'Fried Rice',
    price: 90,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Tender pork bits tossed with seasoned wok rice and crisp garden vegetables',
    barcode: '8903002004028'
  },
  {
    item_id: 'fr-prk-l',
    name: 'Pork Fried Rice (Large)',
    base_item: 'Pork Fried Rice',
    portion_size: 'Large',
    category: 'Fried Rice',
    price: 170,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Hearty full portion of pork fried rice with house chilli blend',
    barcode: '8903002004035'
  },
  {
    item_id: 'fr-mix-s',
    name: 'Mixed Fried Rice (Small)',
    base_item: 'Mixed Fried Rice',
    portion_size: 'Small',
    category: 'Fried Rice',
    price: 50,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Combination of chicken, egg, and fresh veggies tossed with seasoned rice',
    barcode: '8903002005018'
  },
  {
    item_id: 'fr-mix-m',
    name: 'Mixed Fried Rice (Medium)',
    base_item: 'Mixed Fried Rice',
    portion_size: 'Medium',
    category: 'Fried Rice',
    price: 80,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Combination of chicken, egg, and fresh veggies tossed with seasoned rice',
    barcode: '8903002005025'
  },
  {
    item_id: 'fr-mix-l',
    name: 'Mixed Fried Rice (Large)',
    base_item: 'Mixed Fried Rice',
    portion_size: 'Large',
    category: 'Fried Rice',
    price: 210,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Signature mixed fried rice loaded with chicken, pork, eggs, and crispy greens',
    barcode: '8903002005032'
  },

  // CHILLY STARTERS (Fixed Full Size)
  {
    item_id: 'chl-chk-dry',
    name: 'Chicken Chilly Dry',
    base_item: 'Chicken Chilly Dry',
    portion_size: 'Full',
    category: 'Chilly Starters',
    price: 250,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Crispy fried chicken chunks tossed with diced onions, capsicum, green chillies, and dark soy',
    barcode: '8903003001019'
  },
  {
    item_id: 'chl-chk-grv',
    name: 'Chicken Chilly Gravy',
    base_item: 'Chicken Chilly Gravy',
    portion_size: 'Full',
    category: 'Chilly Starters',
    price: 260,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Fried chicken pieces simmered in spicy, tangy garlic-soy gravy with capsicum and spring onion',
    barcode: '8903003001026'
  },
  {
    item_id: 'chl-prk-dry',
    name: 'Pork Chilly Dry',
    base_item: 'Pork Chilly Dry',
    portion_size: 'Full',
    category: 'Chilly Starters',
    price: 280,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Crispy seasoned pork bites dry-tossed in high flame with ginger, garlic, and fiery chillies',
    barcode: '8903003002016'
  },
  {
    item_id: 'chl-prk-grv',
    name: 'Pork Chilly Gravy',
    base_item: 'Pork Chilly Gravy',
    portion_size: 'Full',
    category: 'Chilly Starters',
    price: 290,
    is_veg: false,
    station: 'KITCHEN',
    description: 'Pork morsels simmered in rich oriental spiced gravy, perfect pairing with Chowmein or Rice',
    barcode: '8903003002023'
  }
];

const DISH_IMAGES: Record<string, string> = {
  'cm-veg': 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80',
  'cm-egg': 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80',
  'cm-chk': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80',
  'cm-prk': 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=600&auto=format&fit=crop&q=80',
  'cm-mix': 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&auto=format&fit=crop&q=80',
  'fr-veg': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80',
  'fr-egg': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=80',
  'fr-chk': 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=600&auto=format&fit=crop&q=80',
  'fr-prk': 'https://images.unsplash.com/photo-1564834724105-918b73d1b9e0?w=600&auto=format&fit=crop&q=80',
  'fr-mix': 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?w=600&auto=format&fit=crop&q=80',
  'chl-chk-dry': 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80',
  'chl-chk-grv': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80',
  'chl-prk-dry': 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=600&auto=format&fit=crop&q=80',
  'chl-prk-grv': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80'
};

for (const item of CATALOG_ITEMS) {
  for (const [prefix, imgUrl] of Object.entries(DISH_IMAGES)) {
    if (item.item_id.startsWith(prefix)) {
      item.image_url = imgUrl;
      break;
    }
  }
  if (!item.image_url) {
    item.image_url = 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80';
  }
}

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
      category TEXT,
      treatment TEXT,
      current_stock REAL NOT NULL DEFAULT 0,
      reorder_level REAL NOT NULL DEFAULT 0,
      cost_per_unit DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      barcode TEXT,
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
      job_type TEXT NOT NULL CHECK(job_type IN ('KOT', 'RECEIPT', 'Z_REPORT', 'GRN_RECEIPT')),
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

  // 8. Supplier & Procurement ERP Ledger (Milestone 12)
  db.run(`
    CREATE TABLE IF NOT EXISTS suppliers (
      supplier_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      contact_person TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      gstin TEXT NOT NULL,
      payment_terms_days INTEGER NOT NULL DEFAULT 15,
      rating REAL NOT NULL DEFAULT 4.5,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      po_id TEXT PRIMARY KEY,
      po_number TEXT UNIQUE NOT NULL,
      supplier_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('DRAFT', 'ISSUED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED')),
      sub_total DECIMAL(10, 2) NOT NULL,
      tax_total DECIMAL(10, 2) NOT NULL,
      grand_total DECIMAL(10, 2) NOT NULL,
      notes TEXT,
      expected_delivery_date DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
    );

    CREATE TABLE IF NOT EXISTS purchase_order_items (
      po_item_id TEXT PRIMARY KEY,
      po_id TEXT NOT NULL,
      ingredient_id TEXT NOT NULL,
      ingredient_name TEXT NOT NULL,
      unit TEXT NOT NULL,
      ordered_quantity REAL NOT NULL,
      received_quantity REAL NOT NULL DEFAULT 0,
      unit_price DECIMAL(10, 2) NOT NULL,
      total_cost DECIMAL(10, 2) NOT NULL,
      FOREIGN KEY (po_id) REFERENCES purchase_orders(po_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS goods_received_notes (
      grn_id TEXT PRIMARY KEY,
      grn_number TEXT UNIQUE NOT NULL,
      po_id TEXT NOT NULL,
      po_number TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      invoice_ref_number TEXT NOT NULL,
      received_by TEXT NOT NULL,
      total_received_cost DECIMAL(10, 2) NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('ACCEPTED', 'ACCEPTED_WITH_DISCREPANCY', 'REJECTED')),
      discrepancy_note TEXT,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (po_id) REFERENCES purchase_orders(po_id)
    );

    CREATE TABLE IF NOT EXISTS grn_items (
      grn_item_id TEXT PRIMARY KEY,
      grn_id TEXT NOT NULL,
      ingredient_id TEXT NOT NULL,
      ingredient_name TEXT NOT NULL,
      unit TEXT NOT NULL,
      ordered_quantity REAL NOT NULL,
      received_quantity REAL NOT NULL,
      rejected_quantity REAL NOT NULL DEFAULT 0,
      unit_price DECIMAL(10, 2) NOT NULL,
      total_cost DECIMAL(10, 2) NOT NULL,
      remarks TEXT,
      FOREIGN KEY (grn_id) REFERENCES goods_received_notes(grn_id) ON DELETE CASCADE
    );

    -- 9. Configurable Restaurant & Outlet Profile (Separate from System Name)
    CREATE TABLE IF NOT EXISTS restaurant_profile (
      profile_id TEXT PRIMARY KEY,
      restaurant_name TEXT NOT NULL,
      outlet_name TEXT NOT NULL,
      address TEXT NOT NULL,
      gstin TEXT NOT NULL,
      fssai_licence TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      currency_symbol TEXT NOT NULL DEFAULT '₹',
      tax_cgst_rate REAL NOT NULL DEFAULT 2.5,
      tax_sgst_rate REAL NOT NULL DEFAULT 2.5,
      kiosk_idle_timeout_seconds INTEGER DEFAULT 60,
      printer_ip TEXT DEFAULT '192.168.1.100',
      printer_port INTEGER DEFAULT 9100,
      printer_paper_width TEXT DEFAULT '80mm',
      merchant_upi_vpa TEXT DEFAULT 'talkofthetown@upi',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 10. Staff Members, Attendance & Payroll Ledger
    CREATE TABLE IF NOT EXISTS staff_members (
      staff_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT NOT NULL,
      monthly_base_salary DECIMAL(10, 2) NOT NULL,
      daily_wage_rate DECIMAL(10, 2) NOT NULL,
      bank_account_info TEXT,
      joining_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS payroll_ledger (
      payroll_id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      staff_name TEXT NOT NULL,
      role TEXT NOT NULL,
      month TEXT NOT NULL,
      base_salary DECIMAL(10, 2) NOT NULL,
      days_worked INTEGER NOT NULL DEFAULT 30,
      overtime_hours REAL NOT NULL DEFAULT 0,
      overtime_pay DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      advance_deductions DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      bonus DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      net_payout DECIMAL(10, 2) NOT NULL,
      payment_status TEXT NOT NULL CHECK(payment_status IN ('PAID', 'PENDING')),
      payment_method TEXT NOT NULL CHECK(payment_method IN ('BANK_TRANSFER', 'CASH', 'UPI')),
      paid_at DATETIME,
      FOREIGN KEY (staff_id) REFERENCES staff_members(staff_id)
    );

    -- 11. Standard Operating Procedures (SOP) & Rule Book Checklists
    CREATE TABLE IF NOT EXISTS sop_checklists (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      task TEXT NOT NULL,
      frequency TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_by TEXT,
      completed_at DATETIME
    );
  `);

  seedRestaurantProfile(db);
  seedInitialShift(db);
  seedInventory(db);
  seedInitialTables(db);
  seedInitialProcurement(db);
  seedStaffAndPayroll(db);
  seedSopChecklists(db);

  dbInstance = db;
  return dbInstance;
}

function seedInventory(db: Database) {
  const check = db.exec("SELECT COUNT(*) as count FROM inventory_items");
  const count = check[0]?.values[0]?.[0] as number;
  if (count > 0) return;

  let masterItems: Array<{
    ingredient_id: string;
    name: string;
    unit: string;
    category: string;
    treatment: string;
    current_stock: number;
    reorder_level: number;
    cost_per_unit: number;
  }> = [];

  try {
    const jsonPath = path.resolve(process.cwd(), 'src/server/inventory_master.json');
    if (fs.existsSync(jsonPath)) {
      masterItems = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to load inventory_master.json:', err);
  }

  for (const item of masterItems) {
    db.run(
      `INSERT INTO inventory_items (ingredient_id, name, unit, category, treatment, current_stock, reorder_level, cost_per_unit, barcode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.ingredient_id,
        item.name,
        item.unit,
        item.category,
        item.treatment,
        item.current_stock || 0,
        item.reorder_level || 0,
        item.cost_per_unit || 0.00,
        `TOT-BAR-${item.ingredient_id.replace('TOT-', '')}`
      ]
    );
  }

  // Seed Recipe BOM linking authoritative reopening menu dishes to master raw materials
  const recipes = [
    // --- CHOWMEIN (Veg, Egg, Chicken, Pork, Mixed) ---
    // Veg Chowmein (Small, Medium, Large)
    { item_id: 'cm-veg-s', ingredient_id: 'TOT-004', qty: 0.08 }, // dry noodles kg
    { item_id: 'cm-veg-s', ingredient_id: 'TOT-006', qty: 0.02 }, // cooking oil litre
    { item_id: 'cm-veg-s', ingredient_id: 'TOT-018', qty: 0.04 }, // cabbage kg
    { item_id: 'cm-veg-s', ingredient_id: 'TOT-019', qty: 0.02 }, // carrot kg
    { item_id: 'cm-veg-s', ingredient_id: 'TOT-017', qty: 0.02 }, // capsicum kg
    { item_id: 'cm-veg-s', ingredient_id: 'TOT-007', qty: 0.01 }, // soy sauce litre

    { item_id: 'cm-veg-m', ingredient_id: 'TOT-004', qty: 0.12 },
    { item_id: 'cm-veg-m', ingredient_id: 'TOT-006', qty: 0.03 },
    { item_id: 'cm-veg-m', ingredient_id: 'TOT-018', qty: 0.06 },
    { item_id: 'cm-veg-m', ingredient_id: 'TOT-019', qty: 0.03 },
    { item_id: 'cm-veg-m', ingredient_id: 'TOT-017', qty: 0.03 },
    { item_id: 'cm-veg-m', ingredient_id: 'TOT-007', qty: 0.015 },

    { item_id: 'cm-veg-l', ingredient_id: 'TOT-004', qty: 0.25 },
    { item_id: 'cm-veg-l', ingredient_id: 'TOT-006', qty: 0.05 },
    { item_id: 'cm-veg-l', ingredient_id: 'TOT-018', qty: 0.12 },
    { item_id: 'cm-veg-l', ingredient_id: 'TOT-019', qty: 0.06 },
    { item_id: 'cm-veg-l', ingredient_id: 'TOT-017', qty: 0.06 },
    { item_id: 'cm-veg-l', ingredient_id: 'TOT-007', qty: 0.03 },

    // Egg Chowmein (Small, Medium, Large)
    { item_id: 'cm-egg-s', ingredient_id: 'TOT-004', qty: 0.08 },
    { item_id: 'cm-egg-s', ingredient_id: 'TOT-003', qty: 1 }, // 1 egg
    { item_id: 'cm-egg-s', ingredient_id: 'TOT-006', qty: 0.02 },

    { item_id: 'cm-egg-m', ingredient_id: 'TOT-004', qty: 0.12 },
    { item_id: 'cm-egg-m', ingredient_id: 'TOT-003', qty: 2 }, // 2 eggs
    { item_id: 'cm-egg-m', ingredient_id: 'TOT-006', qty: 0.03 },

    { item_id: 'cm-egg-l', ingredient_id: 'TOT-004', qty: 0.25 },
    { item_id: 'cm-egg-l', ingredient_id: 'TOT-003', qty: 3 }, // 3 eggs
    { item_id: 'cm-egg-l', ingredient_id: 'TOT-006', qty: 0.05 },

    // Chicken Chowmein (Small, Medium, Large)
    { item_id: 'cm-chk-s', ingredient_id: 'TOT-004', qty: 0.08 },
    { item_id: 'cm-chk-s', ingredient_id: 'TOT-001', qty: 0.06 }, // 60g chicken
    { item_id: 'cm-chk-s', ingredient_id: 'TOT-006', qty: 0.02 },

    { item_id: 'cm-chk-m', ingredient_id: 'TOT-004', qty: 0.12 },
    { item_id: 'cm-chk-m', ingredient_id: 'TOT-001', qty: 0.10 }, // 100g chicken
    { item_id: 'cm-chk-m', ingredient_id: 'TOT-006', qty: 0.03 },

    { item_id: 'cm-chk-l', ingredient_id: 'TOT-004', qty: 0.25 },
    { item_id: 'cm-chk-l', ingredient_id: 'TOT-001', qty: 0.20 }, // 200g chicken
    { item_id: 'cm-chk-l', ingredient_id: 'TOT-006', qty: 0.05 },

    // Pork Chowmein (Small, Medium, Large)
    { item_id: 'cm-prk-s', ingredient_id: 'TOT-004', qty: 0.08 },
    { item_id: 'cm-prk-s', ingredient_id: 'TOT-002', qty: 0.06 }, // 60g pork
    { item_id: 'cm-prk-s', ingredient_id: 'TOT-006', qty: 0.02 },

    { item_id: 'cm-prk-m', ingredient_id: 'TOT-004', qty: 0.12 },
    { item_id: 'cm-prk-m', ingredient_id: 'TOT-002', qty: 0.10 }, // 100g pork
    { item_id: 'cm-prk-m', ingredient_id: 'TOT-006', qty: 0.03 },

    { item_id: 'cm-prk-l', ingredient_id: 'TOT-004', qty: 0.25 },
    { item_id: 'cm-prk-l', ingredient_id: 'TOT-002', qty: 0.20 }, // 200g pork
    { item_id: 'cm-prk-l', ingredient_id: 'TOT-006', qty: 0.05 },

    // Mixed Chowmein (Small, Medium, Large)
    { item_id: 'cm-mix-s', ingredient_id: 'TOT-004', qty: 0.08 },
    { item_id: 'cm-mix-s', ingredient_id: 'TOT-001', qty: 0.04 },
    { item_id: 'cm-mix-s', ingredient_id: 'TOT-003', qty: 1 },

    { item_id: 'cm-mix-m', ingredient_id: 'TOT-004', qty: 0.12 },
    { item_id: 'cm-mix-m', ingredient_id: 'TOT-001', qty: 0.06 },
    { item_id: 'cm-mix-m', ingredient_id: 'TOT-002', qty: 0.04 },
    { item_id: 'cm-mix-m', ingredient_id: 'TOT-003', qty: 1 },

    { item_id: 'cm-mix-l', ingredient_id: 'TOT-004', qty: 0.25 },
    { item_id: 'cm-mix-l', ingredient_id: 'TOT-001', qty: 0.10 },
    { item_id: 'cm-mix-l', ingredient_id: 'TOT-002', qty: 0.08 },
    { item_id: 'cm-mix-l', ingredient_id: 'TOT-003', qty: 2 },

    // --- FRIED RICE (Veg, Egg, Chicken, Pork, Mixed) ---
    // Veg Fried Rice
    { item_id: 'fr-veg-s', ingredient_id: 'TOT-005', qty: 0.08 }, // raw rice kg
    { item_id: 'fr-veg-s', ingredient_id: 'TOT-006', qty: 0.02 },
    { item_id: 'fr-veg-m', ingredient_id: 'TOT-005', qty: 0.12 },
    { item_id: 'fr-veg-m', ingredient_id: 'TOT-006', qty: 0.03 },
    { item_id: 'fr-veg-l', ingredient_id: 'TOT-005', qty: 0.25 },
    { item_id: 'fr-veg-l', ingredient_id: 'TOT-006', qty: 0.05 },

    // Egg Fried Rice
    { item_id: 'fr-egg-s', ingredient_id: 'TOT-005', qty: 0.08 },
    { item_id: 'fr-egg-s', ingredient_id: 'TOT-003', qty: 1 },
    { item_id: 'fr-egg-m', ingredient_id: 'TOT-005', qty: 0.12 },
    { item_id: 'fr-egg-m', ingredient_id: 'TOT-003', qty: 2 },
    { item_id: 'fr-egg-l', ingredient_id: 'TOT-005', qty: 0.25 },
    { item_id: 'fr-egg-l', ingredient_id: 'TOT-003', qty: 3 },

    // Chicken Fried Rice
    { item_id: 'fr-chk-s', ingredient_id: 'TOT-005', qty: 0.08 },
    { item_id: 'fr-chk-s', ingredient_id: 'TOT-001', qty: 0.06 },
    { item_id: 'fr-chk-m', ingredient_id: 'TOT-005', qty: 0.12 },
    { item_id: 'fr-chk-m', ingredient_id: 'TOT-001', qty: 0.10 },
    { item_id: 'fr-chk-l', ingredient_id: 'TOT-005', qty: 0.25 },
    { item_id: 'fr-chk-l', ingredient_id: 'TOT-001', qty: 0.20 },

    // Pork Fried Rice
    { item_id: 'fr-prk-s', ingredient_id: 'TOT-005', qty: 0.08 },
    { item_id: 'fr-prk-s', ingredient_id: 'TOT-002', qty: 0.06 },
    { item_id: 'fr-prk-m', ingredient_id: 'TOT-005', qty: 0.12 },
    { item_id: 'fr-prk-m', ingredient_id: 'TOT-002', qty: 0.10 },
    { item_id: 'fr-prk-l', ingredient_id: 'TOT-005', qty: 0.25 },
    { item_id: 'fr-prk-l', ingredient_id: 'TOT-002', qty: 0.20 },

    // Mixed Fried Rice
    { item_id: 'fr-mix-s', ingredient_id: 'TOT-005', qty: 0.08 },
    { item_id: 'fr-mix-s', ingredient_id: 'TOT-001', qty: 0.04 },
    { item_id: 'fr-mix-s', ingredient_id: 'TOT-003', qty: 1 },
    { item_id: 'fr-mix-m', ingredient_id: 'TOT-005', qty: 0.12 },
    { item_id: 'fr-mix-m', ingredient_id: 'TOT-001', qty: 0.06 },
    { item_id: 'fr-mix-m', ingredient_id: 'TOT-002', qty: 0.04 },
    { item_id: 'fr-mix-m', ingredient_id: 'TOT-003', qty: 1 },
    { item_id: 'fr-mix-l', ingredient_id: 'TOT-005', qty: 0.25 },
    { item_id: 'fr-mix-l', ingredient_id: 'TOT-001', qty: 0.10 },
    { item_id: 'fr-mix-l', ingredient_id: 'TOT-002', qty: 0.08 },
    { item_id: 'fr-mix-l', ingredient_id: 'TOT-003', qty: 2 },

    // --- CHILLY STARTERS ---
    { item_id: 'chl-chk-dry', ingredient_id: 'TOT-001', qty: 0.28 },
    { item_id: 'chl-chk-dry', ingredient_id: 'TOT-017', qty: 0.05 },
    { item_id: 'chl-chk-dry', ingredient_id: 'TOT-014', qty: 0.05 },
    { item_id: 'chl-chk-dry', ingredient_id: 'TOT-006', qty: 0.03 },

    { item_id: 'chl-chk-grv', ingredient_id: 'TOT-001', qty: 0.28 },
    { item_id: 'chl-chk-grv', ingredient_id: 'TOT-017', qty: 0.06 },
    { item_id: 'chl-chk-grv', ingredient_id: 'TOT-014', qty: 0.06 },
    { item_id: 'chl-chk-grv', ingredient_id: 'TOT-007', qty: 0.02 },

    { item_id: 'chl-prk-dry', ingredient_id: 'TOT-002', qty: 0.28 },
    { item_id: 'chl-prk-dry', ingredient_id: 'TOT-017', qty: 0.05 },
    { item_id: 'chl-prk-dry', ingredient_id: 'TOT-014', qty: 0.05 },
    { item_id: 'chl-prk-dry', ingredient_id: 'TOT-006', qty: 0.03 },

    { item_id: 'chl-prk-grv', ingredient_id: 'TOT-002', qty: 0.28 },
    { item_id: 'chl-prk-grv', ingredient_id: 'TOT-017', qty: 0.06 },
    { item_id: 'chl-prk-grv', ingredient_id: 'TOT-014', qty: 0.06 },
    { item_id: 'chl-prk-grv', ingredient_id: 'TOT-007', qty: 0.02 }
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
      'shift-live-01', 'POS-01', 'Active Cashier', 'OPEN', 0.00,
      0.00, 0.00, 0.00, 0.00, 0.00,
      0.00, 0.00, 0, 0.00,
      0.00, 0.00, CURRENT_TIMESTAMP, 'PENDING'
    )
  `);
}

function seedRestaurantProfile(db: Database) {
  const check = db.exec("SELECT COUNT(*) as count FROM restaurant_profile");
  const count = check[0]?.values[0]?.[0] as number;
  if (count > 0) return;

  db.run(`
    INSERT INTO restaurant_profile (
      profile_id, restaurant_name, outlet_name, address, gstin, fssai_licence, phone, email, currency_symbol, tax_cgst_rate, tax_sgst_rate
    ) VALUES (
      'main-profile',
      'Talk of the Town',
      'Imphal Main Outlet',
      'Imphal, Manipur',
      '14AAACT1234F1Z5',
      '11624001000123',
      '+91 98620 12345',
      'talkofthetown312@gmail.com',
      '₹',
      2.5,
      2.5
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
  // All tables start clean and available - zero mock orders!
}

function seedInitialCustomers(_db: Database) {
  // Clean customer CRM - start fresh with zero mock customers
}

function seedInitialProcurement(db: Database) {
  const check = db.exec("SELECT COUNT(*) as count FROM suppliers");
  const count = check[0]?.values[0]?.[0] as number;
  if (count > 0) return;

  const suppliers = [
    {
      id: 'sup-001',
      name: 'Imphal Poultry & Meat Supply',
      category: 'Poultry & Meat',
      contact: 'Th. Tombi Singh',
      phone: '9862011223',
      email: 'meatorders@imphalmeat.com',
      gstin: '14AAACT1122F1Z1',
      terms: 7,
      rating: 4.8
    },
    {
      id: 'sup-002',
      name: 'Manipur Fresh Farm Greens',
      category: 'Produce & Veg',
      contact: 'N. Chaoba Devi',
      phone: '9862022334',
      email: 'veggies@manipurfresh.org',
      gstin: '14AAACM2233J1Z4',
      terms: 7,
      rating: 4.7
    },
    {
      id: 'sup-003',
      name: 'Eastern Grains & Asian Noodles Hub',
      category: 'Dry Grocery & Grains',
      contact: 'K. Sanayaima',
      phone: '9862033445',
      email: 'wholesale@easterngrains.co.in',
      gstin: '14AAACE3344K1ZY',
      terms: 15,
      rating: 4.9
    },
    {
      id: 'sup-004',
      name: 'NorthEast Eco-Packaging Solutions',
      category: 'Packaging & Eco-ware',
      contact: 'L. Biren',
      phone: '9862044556',
      email: 'sales@neecopack.in',
      gstin: '14AAACN4455L1ZW',
      terms: 21,
      rating: 4.8
    },
    {
      id: 'sup-005',
      name: 'Manipur Asian Condiments & Spices',
      category: 'Dry Grocery & Grains',
      contact: 'M. Ibohal',
      phone: '9862055667',
      email: 'orders@manipurspices.in',
      gstin: '14AAACM5566M1ZX',
      terms: 15,
      rating: 4.6
    }
  ];

  for (const s of suppliers) {
    db.run(
      `INSERT INTO suppliers (
        supplier_id, name, category, contact_person, phone, email, gstin, payment_terms_days, rating, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [s.id, s.name, s.category, s.contact, s.phone, s.email, s.gstin, s.terms, s.rating]
    );
  }
}

function seedStaffAndPayroll(db: Database) {
  const check = db.exec("SELECT COUNT(*) as count FROM staff_members");
  const count = check[0]?.values[0]?.[0] as number;
  if (count > 0) return;

  const staff = [
    { id: 'STF-01', name: 'N. Sanatomba Singh', role: 'HEAD_CHEF', phone: '9862011001', salary: 28000, daily: 933, bank: 'SBI - SBIN0001234 · A/C 30491823901' },
    { id: 'STF-02', name: 'K. Bikram', role: 'ASSISTANT_COOK', phone: '9862011002', salary: 18000, daily: 600, bank: 'HDFC - HDFC0000456 · A/C 50100293819' },
    { id: 'STF-03', name: 'M. James', role: 'FLOOR_CAPTAIN', phone: '9862011003', salary: 16000, daily: 533, bank: 'Axis - UTIB0000789 · A/C 91901002938' },
    { id: 'STF-04', name: 'L. Priyobrata', role: 'CASHIER', phone: '9862011004', salary: 15000, daily: 500, bank: 'BOB - BARB0IMPHAL · A/C 12040100029' },
    { id: 'STF-05', name: 'Th. Romesh', role: 'STORE_KEEPER', phone: '9862011005', salary: 15000, daily: 500, bank: 'CBI - CBIN0281234 · A/C 20192837482' },
    { id: 'STF-06', name: 'Y. Tomba', role: 'KITCHEN_HELPER', phone: '9862011006', salary: 12000, daily: 400, bank: 'Cash on Hand / Direct' }
  ];

  for (const s of staff) {
    db.run(
      `INSERT INTO staff_members (staff_id, name, role, phone, monthly_base_salary, daily_wage_rate, bank_account_info, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [s.id, s.name, s.role, s.phone, s.salary, s.daily, s.bank]
    );

    // Initial payroll record for current month
    db.run(
      `INSERT INTO payroll_ledger (payroll_id, staff_id, staff_name, role, month, base_salary, days_worked, overtime_hours, overtime_pay, advance_deductions, bonus, net_payout, payment_status, payment_method, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, 30, 0, 0.00, 0.00, 0.00, ?, 'PAID', 'BANK_TRANSFER', CURRENT_TIMESTAMP)`,
      [`PAY-${s.id}-202610`, s.id, s.name, s.role, 'October 2026', s.salary, s.salary]
    );
  }
}

function seedSopChecklists(db: Database) {
  const check = db.exec("SELECT COUNT(*) as count FROM sop_checklists");
  const count = check[0]?.values[0]?.[0] as number;
  if (count > 0) return;

  const sops = [
    { id: 'sop-01', cat: 'OPENING', task: 'Inspect walk-in cold storage temp (<4°C) & gas pipeline pressure', freq: 'DAILY', comp: 1 },
    { id: 'sop-02', cat: 'OPENING', task: 'Reconcile morning cash drawer float (₹2,000 baseline in POS-01)', freq: 'DAILY', comp: 1 },
    { id: 'sop-03', cat: 'OPENING', task: 'Check pre-cut vegetables (TOT-014 to TOT-020) and noodle batch prep', freq: 'DAILY', comp: 1 },
    { id: 'sop-04', cat: 'OPENING', task: 'Test ESC/POS KOT thermal printer feed and KDS network LAN ping', freq: 'DAILY', comp: 1 },
    { id: 'sop-05', cat: 'CLOSING', task: 'Cashier shift close: print Z-Report & perform physical cash drawer drop', freq: 'DAILY', comp: 0 },
    { id: 'sop-06', cat: 'CLOSING', task: 'Sanitize wok stations, exhaust range hoods, and grease catchment tray', freq: 'DAILY', comp: 0 },
    { id: 'sop-07', cat: 'CLOSING', task: 'Lock dry grocery store (TOT-004, TOT-005) and power down non-essential lighting', freq: 'DAILY', comp: 0 },
    { id: 'sop-08', cat: 'HYGIENE_SAFETY', task: 'FIFO rotation on fresh raw chicken (TOT-001) and pork (TOT-002)', freq: 'PER_SHIFT', comp: 1 },
    { id: 'sop-09', cat: 'HYGIENE_SAFETY', task: 'Mandatory apron, headnet, and hand-wash audit across kitchen staff', freq: 'PER_SHIFT', comp: 1 },
    { id: 'sop-10', cat: 'CASH_SHIFT', task: 'Cashier handover: confirm physical cash matches system expected before exit', freq: 'PER_SHIFT', comp: 0 }
  ];

  for (const item of sops) {
    db.run(
      `INSERT INTO sop_checklists (id, category, task, frequency, completed) VALUES (?, ?, ?, ?, ?)`,
      [item.id, item.cat, item.task, item.freq, item.comp]
    );
  }
}





