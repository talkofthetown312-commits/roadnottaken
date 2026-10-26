import { Database } from 'sql.js';
import { CustomerProfile, CustomerTier, LoyaltyLedgerEntry, UpiPaymentIntent } from './types.js';

export class CrmLoyaltyService {
  private db: Database;
  private readonly merchantVpa = 'petpooja.saffron@okaxis';
  private readonly merchantName = 'Saffron Spice Fine Dine';

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Computes tier based on cumulative lifetime spend
   */
  public static computeTier(lifetimeSpend: number): CustomerTier {
    if (lifetimeSpend >= 10000) return 'PLATINUM';
    if (lifetimeSpend >= 3500) return 'GOLD';
    return 'SILVER';
  }

  /**
   * Lists all customers ordered by last visit
   */
  public getAllCustomers(): CustomerProfile[] {
    const res = this.db.exec(
      `SELECT customer_id, phone, name, email, loyalty_points, lifetime_spend, visit_count, tier, last_visit_at
       FROM customers
       ORDER BY last_visit_at DESC, lifetime_spend DESC`
    );

    if (!res[0] || !res[0].values) return [];

    return res[0].values.map((row) => ({
      customer_id: String(row[0]),
      phone: String(row[1]),
      name: String(row[2]),
      email: row[3] ? String(row[3]) : undefined,
      loyalty_points: Number(row[4]),
      lifetime_spend: Number(row[5]),
      visit_count: Number(row[6]),
      tier: (row[7] as CustomerTier) || 'SILVER',
      last_visit_at: String(row[8]),
    }));
  }

  /**
   * Looks up a customer by 10-digit phone number
   */
  public getCustomerByPhone(phone: string): CustomerProfile | null {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone) return null;

    const res = this.db.exec(
      `SELECT customer_id, phone, name, email, loyalty_points, lifetime_spend, visit_count, tier, last_visit_at
       FROM customers
       WHERE phone = ?
       LIMIT 1`,
      [cleanPhone]
    );

    if (!res[0] || !res[0].values || !res[0].values[0]) return null;
    const row = res[0].values[0];

    return {
      customer_id: String(row[0]),
      phone: String(row[1]),
      name: String(row[2]),
      email: row[3] ? String(row[3]) : undefined,
      loyalty_points: Number(row[4]),
      lifetime_spend: Number(row[5]),
      visit_count: Number(row[6]),
      tier: (row[7] as CustomerTier) || 'SILVER',
      last_visit_at: String(row[8]),
    };
  }

  /**
   * Registers a new customer or updates an existing guest's name/email.
   * New guests receive a 50-point Welcome Bonus in the loyalty ledger.
   */
  public upsertCustomer(phone: string, name: string, email?: string): CustomerProfile {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      throw new Error('Valid 10-digit mobile number is required');
    }

    const existing = this.getCustomerByPhone(cleanPhone);
    if (existing) {
      this.db.run(
        `UPDATE customers
         SET name = ?, email = COALESCE(?, email), last_visit_at = CURRENT_TIMESTAMP
         WHERE customer_id = ?`,
        [name.trim() || existing.name, email ? email.trim() : null, existing.customer_id]
      );
      return this.getCustomerByPhone(cleanPhone)!;
    }

    const customerId = `cust-${Date.now().toString().slice(-6)}`;
    const welcomeBonus = 50;

    this.db.run(
      `INSERT INTO customers (
        customer_id, phone, name, email, loyalty_points, lifetime_spend, visit_count, tier, last_visit_at
      ) VALUES (?, ?, ?, ?, ?, 0.00, 0, 'SILVER', CURRENT_TIMESTAMP)`,
      [customerId, cleanPhone, name.trim() || 'Walk-in Guest', email ? email.trim() : null, welcomeBonus]
    );

    this.db.run(
      `INSERT INTO loyalty_ledger (
        ledger_id, customer_id, order_id, invoice_number, points_delta, transaction_type, created_at
      ) VALUES (?, ?, 'WELCOME-BONUS', 'WELCOME-50', ?, 'BONUS', CURRENT_TIMESTAMP)`,
      [`ldg-${Date.now()}`, customerId, welcomeBonus]
    );

    return this.getCustomerByPhone(cleanPhone)!;
  }

  /**
   * Returns recent loyalty point earn/redeem ledger entries
   */
  public getRecentLedger(limit: number = 20): LoyaltyLedgerEntry[] {
    const res = this.db.exec(
      `SELECT ledger_id, customer_id, order_id, invoice_number, points_delta, transaction_type, created_at
       FROM loyalty_ledger
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    );

    if (!res[0] || !res[0].values) return [];

    return res[0].values.map((row) => ({
      ledger_id: String(row[0]),
      customer_id: String(row[1]),
      order_id: String(row[2]),
      invoice_number: String(row[3]),
      points_delta: Number(row[4]),
      transaction_type: row[5] as 'EARN' | 'REDEEM' | 'BONUS',
      created_at: String(row[6]),
    }));
  }

  /**
   * Creates an amount-locked NPCI BharatQR / Dynamic UPI Payment Intent
   */
  public createUpiPaymentIntent(amount: number, invoiceNumber?: string): UpiPaymentIntent {
    const cleanAmount = Math.max(1, Math.round(amount * 100) / 100);
    const inv = invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
    const intentId = `upi-int-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const encodedName = encodeURIComponent(this.merchantName);
    const upiUri = `upi://pay?pa=${this.merchantVpa}&pn=${encodedName}&am=${cleanAmount.toFixed(2)}&tr=${inv}&tn=${encodeURIComponent(`Bill ${inv}`)}&cu=INR`;

    this.db.run(
      `INSERT INTO upi_payment_intents (
        intent_id, invoice_number, merchant_vpa, merchant_name, amount, upi_uri, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'AWAITING_PAYMENT', CURRENT_TIMESTAMP)`,
      [intentId, inv, this.merchantVpa, this.merchantName, cleanAmount, upiUri]
    );

    return {
      intent_id: intentId,
      invoice_number: inv,
      merchant_vpa: this.merchantVpa,
      merchant_name: this.merchantName,
      amount: cleanAmount,
      upi_uri: upiUri,
      status: 'AWAITING_PAYMENT',
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Processes a simulated NPCI / Soundbox instant webhook payment verification
   */
  public verifyUpiPaymentCallback(intentId: string, payerVpa?: string): UpiPaymentIntent {
    const res = this.db.exec(
      `SELECT intent_id, invoice_number, merchant_vpa, merchant_name, amount, upi_uri, status, created_at
       FROM upi_payment_intents
       WHERE intent_id = ?
       LIMIT 1`,
      [intentId]
    );

    if (!res[0] || !res[0].values || !res[0].values[0]) {
      throw new Error(`UPI Payment Intent ${intentId} not found`);
    }

    const row = res[0].values[0];
    const amount = Number(row[4]);
    const utrNumber = `4295${Math.floor(10000000 + Math.random() * 90000000)}`;
    const resolvedPayerVpa = payerVpa || 'customer.gpay@okicici';
    const verifiedAt = new Date().toISOString();
    const announcement = `Received Rupees ${amount.toFixed(0)} on Petpooja Soundbox. NPCI UTR ending ${utrNumber.slice(-4)}.`;

    this.db.run(
      `UPDATE upi_payment_intents
       SET status = 'VERIFIED',
           utr_number = ?,
           payer_vpa = ?,
           soundbox_announcement = ?,
           verified_at = ?
       WHERE intent_id = ?`,
      [utrNumber, resolvedPayerVpa, announcement, verifiedAt, intentId]
    );

    return {
      intent_id: String(row[0]),
      invoice_number: String(row[1]),
      merchant_vpa: String(row[2]),
      merchant_name: String(row[3]),
      amount,
      upi_uri: String(row[5]),
      status: 'VERIFIED',
      utr_number: utrNumber,
      payer_vpa: resolvedPayerVpa,
      soundbox_announcement: announcement,
      verified_at: verifiedAt,
      created_at: String(row[7]),
    };
  }
}
