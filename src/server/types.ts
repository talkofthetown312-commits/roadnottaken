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
  unit: string;
  category?: string;
  treatment?: 'Recipe-Linked' | 'Recurring Stock' | 'Fixed Asset' | string;
  current_stock: number;
  reorder_level: number;
  cost_per_unit: number;
  barcode?: string;
  updated_at?: string;
}

export interface RecipeBOM {
  item_id: string;
  ingredient_id: string;
  ingredient_name?: string;
  unit?: string;
  quantity_required: number;
}

export type MenuCategory = 'Chowmein' | 'Fried Rice' | 'Chilly Starters';

export interface MenuItem {
  item_id: string;
  name: string;
  category: MenuCategory | string;
  price: number;
  is_veg: boolean;
  station: 'KITCHEN' | 'TANDOOR' | 'BAR';
  description: string;
  portion_size?: 'Small' | 'Medium' | 'Large' | 'Full';
  base_item?: string;
  barcode?: string;
  image_url?: string;
}

export interface PrintSpoolJob {
  job_id: string;
  order_id: string;
  job_type: 'KOT' | 'RECEIPT' | 'Z_REPORT' | 'GRN_RECEIPT';
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

export type PoStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';
export type GrnStatus = 'ACCEPTED' | 'ACCEPTED_WITH_DISCREPANCY' | 'REJECTED';

export interface Supplier {
  supplier_id: string;
  name: string;
  category: 'Dairy' | 'Poultry & Meat' | 'Produce & Veg' | 'Dry Grocery & Grains' | 'Packaging & Eco-ware';
  contact_person: string;
  phone: string;
  email?: string;
  gstin: string;
  payment_terms_days: number;
  rating: number; // 1-5
  is_active: boolean;
}

export interface PurchaseOrderItem {
  po_item_id: string;
  po_id: string;
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  ordered_quantity: number;
  received_quantity: number;
  unit_price: number;
  total_cost: number;
}

export interface PurchaseOrder {
  po_id: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  status: PoStatus;
  sub_total: number;
  tax_total: number;
  grand_total: number;
  notes?: string;
  expected_delivery_date: string;
  created_at: string;
  updated_at: string;
  items: PurchaseOrderItem[];
}

export interface GrnItem {
  grn_item_id: string;
  grn_id: string;
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  ordered_quantity: number;
  received_quantity: number;
  rejected_quantity: number;
  unit_price: number;
  total_cost: number;
  remarks?: string;
}

export interface GoodsReceivedNote {
  grn_id: string;
  grn_number: string;
  po_id: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  invoice_ref_number: string;
  received_by: string;
  total_received_cost: number;
  status: GrnStatus;
  discrepancy_note?: string;
  received_at: string;
  items: GrnItem[];
}

export interface RestaurantProfile {
  profile_id: string;
  restaurant_name: string;
  outlet_name: string;
  address: string;
  gstin: string;
  fssai_licence: string;
  phone: string;
  email?: string;
  currency_symbol: string;
  tax_cgst_rate: number;
  tax_sgst_rate: number;
  kiosk_idle_timeout_seconds?: number;
  printer_ip?: string;
  printer_port?: number;
  printer_paper_width?: '58mm' | '80mm';
  merchant_upi_vpa?: string;
  updated_at: string;
}

export type StaffRole = 'HEAD_CHEF' | 'ASSISTANT_COOK' | 'FLOOR_CAPTAIN' | 'CASHIER' | 'KITCHEN_HELPER' | 'STORE_KEEPER';

export interface StaffMember {
  staff_id: string;
  name: string;
  role: StaffRole;
  phone: string;
  monthly_base_salary: number;
  daily_wage_rate: number;
  bank_account_info?: string;
  joining_date: string;
  is_active: boolean;
}

export interface PayrollRecord {
  payroll_id: string;
  staff_id: string;
  staff_name: string;
  role: StaffRole;
  month: string;
  base_salary: number;
  days_worked: number;
  overtime_hours: number;
  overtime_pay: number;
  advance_deductions: number;
  bonus: number;
  net_payout: number;
  payment_status: 'PAID' | 'PENDING';
  payment_method: 'BANK_TRANSFER' | 'CASH' | 'UPI';
  paid_at?: string;
}

export interface SopChecklistItem {
  id: string;
  category: 'OPENING' | 'CLOSING' | 'HYGIENE_SAFETY' | 'CASH_SHIFT';
  task: string;
  frequency: 'DAILY' | 'PER_SHIFT' | 'WEEKLY';
  completed: boolean;
  completed_by?: string;
  completed_at?: string;
}

export interface RuleBookSection {
  id: string;
  title: string;
  category: string;
  content: string;
  key_points: string[];
}



