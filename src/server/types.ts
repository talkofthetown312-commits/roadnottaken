export type OrderStatus = 'PENDING' | 'PREPARING' | 'COMPLETED' | 'CANCELLED';
export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';
export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'AGGREGATOR';
export type TableSection = 'AC Main Hall' | 'Open Courtyard' | 'Bar Lounge';
export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'BILLED';

export interface OrderItemInput {
  order_item_id: string; // Client-generated UUIDv4
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  sub_total: number;
}

export interface OrderInput {
  order_id: string; // Client-generated UUIDv4
  outlet_id: string;
  terminal_id: string;
  invoice_number: string;
  table_id?: string;
  order_status: OrderStatus;
  order_type: OrderType;
  payment_method?: PaymentMethod;
  customer_id?: string;
  customer_phone?: string;
  customer_name?: string;
  loyalty_points_redeemed?: number;
  loyalty_points_earned?: number;
  upi_utr_reference?: string;
  sub_total: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  items: OrderItemInput[];
}

export interface PersistedOrder extends OrderInput {
  sync_status: SyncStatus;
  payment_method: PaymentMethod;
  created_at: string;
  updated_at: string;
}

export interface DiningTable {
  table_id: string;
  table_name: string;
  section: TableSection;
  capacity: number;
  status: TableStatus;
  active_order_id: string | null;
  merged_with_table_id: string | null;
  guest_count: number;
  occupied_since: string | null;
  active_order?: PersistedOrder | null;
}

export interface InventoryItem {
  ingredient_id: string;
  name: string;
  unit: string; // 'g', 'ml', 'pcs'
  current_stock: number;
  reorder_level: number;
  cost_per_unit: number;
  updated_at: string;
}

export interface RecipeBOM {
  item_id: string;
  ingredient_id: string;
  ingredient_name?: string;
  unit?: string;
  quantity_required: number;
}

export interface MenuItem {
  item_id: string;
  name: string;
  category: 'North Indian' | 'Tandoor' | 'Rice & Biryani' | 'Beverages' | 'Desserts';
  price: number;
  is_veg: boolean;
  station: 'KITCHEN' | 'TANDOOR' | 'BAR';
  description: string;
}

export interface PrintSpoolJob {
  job_id: string;
  order_id: string;
  job_type: 'KOT' | 'RECEIPT' | 'Z_REPORT';
  target_printer: string;
  status: 'SENT' | 'FAILED' | 'RETRYING';
  formatted_text: string;
  hex_preview: string;
  created_at: string;
}

export interface CloudOrderRecord {
  order_id: string;
  merchant_id: string;
  outlet_id: string;
  terminal_id: string;
  invoice_number: string;
  table_id?: string;
  order_status: OrderStatus;
  order_type: OrderType;
  payment_method?: PaymentMethod;
  sub_total: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  created_at: string;
  updated_at: string;
  received_at: string;
  items: OrderItemInput[];
}

export interface WebhookLog {
  webhook_id: string;
  aggregator: 'ZOMATO' | 'SWIGGY';
  payload_json: string;
  signature_valid: boolean;
  order_id: string;
  status: 'PROCESSED' | 'REJECTED';
  created_at: string;
}

export interface CashierShift {
  shift_id: string;
  terminal_id: string;
  cashier_name: string;
  status: 'OPEN' | 'CLOSED';
  opening_float: number;
  cash_in_total: number;
  cash_out_total: number;
  cash_sales: number;
  upi_sales: number;
  card_sales: number;
  aggregator_sales: number;
  total_sales: number;
  order_count: number;
  expected_cash: number;
  actual_cash_counted: number;
  variance: number;
  variance_reason?: string;
  z_report_number?: string;
  z_report_text?: string;
  opened_at: string;
  closed_at?: string;
  sync_status: SyncStatus;
}

export interface CashAdjustment {
  adjustment_id: string;
  shift_id: string;
  type: 'CASH_IN' | 'CASH_OUT';
  amount: number;
  reason: string;
  created_at: string;
}

export type CustomerTier = 'SILVER' | 'GOLD' | 'PLATINUM';

export interface CustomerProfile {
  customer_id: string;
  phone: string;
  name: string;
  email?: string;
  loyalty_points: number;
  lifetime_spend: number;
  visit_count: number;
  tier: CustomerTier;
  last_visit_at: string;
}

export interface LoyaltyLedgerEntry {
  ledger_id: string;
  customer_id: string;
  order_id: string;
  invoice_number: string;
  points_delta: number;
  transaction_type: 'EARN' | 'REDEEM' | 'BONUS';
  created_at: string;
}

export interface UpiPaymentIntent {
  intent_id: string;
  invoice_number: string;
  merchant_vpa: string;
  merchant_name: string;
  amount: number;
  upi_uri: string;
  status: 'AWAITING_PAYMENT' | 'VERIFIED' | 'EXPIRED';
  utr_number?: string;
  payer_vpa?: string;
  soundbox_announcement?: string;
  verified_at?: string;
  created_at: string;
}

