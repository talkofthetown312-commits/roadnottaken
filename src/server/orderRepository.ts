import { Database } from 'sql.js';
import { OrderInput, OrderItemInput, OrderStatus, PersistedOrder } from './types.js';
import { InventoryService } from './inventoryService.js';

export class OrderRepository {
  private db: Database;
  private inventoryService: InventoryService;

  constructor(db: Database, inventoryService: InventoryService) {
    this.db = db;
    this.inventoryService = inventoryService;
  }

  /**
   * Fast idempotency check for Captain LAN and Aggregator Webhooks
   */
  public existsById(orderId: string): boolean {
    const res = this.db.exec(
      'SELECT 1 FROM orders WHERE order_id = ? LIMIT 1',
      [orderId]
    );
    return Boolean(res[0] && res[0].values && res[0].values.length > 0);
  }

  /**
   * Inserts an Entire Order with its Items into SQLite atomically.
   * Auto-deducts recipe stock and updates dining_tables occupancy inside the same transaction.
   */
  public createOrder(
    order: OrderInput,
    deductStock: boolean = true,
    initialSyncStatus: 'PENDING' | 'SYNCED' = 'PENDING'
  ): { success: boolean; error?: string } {
    try {
      this.db.run('BEGIN TRANSACTION');

      const paymentMethod = order.payment_method || (order.terminal_id.startsWith('AGGREGATOR') ? 'AGGREGATOR' : 'CASH');
      const tableId = order.table_id || null;
      const customerId = order.customer_id || null;
      const customerPhone = order.customer_phone || null;
      const customerName = order.customer_name || null;
      const pointsRedeemed = Math.max(0, Math.floor(Number(order.loyalty_points_redeemed) || 0));
      const pointsEarned = customerId ? Math.max(0, Math.floor(Number(order.grand_total) * 0.05)) : 0;
      const upiUtrRef = order.upi_utr_reference || null;

      order.loyalty_points_redeemed = pointsRedeemed;
      order.loyalty_points_earned = pointsEarned;

      // Step A: Insert master order row
      this.db.run(
        `INSERT INTO orders (
          order_id, outlet_id, terminal_id, invoice_number, table_id,
          order_status, order_type, payment_method,
          customer_id, customer_phone, customer_name,
          loyalty_points_redeemed, loyalty_points_earned, upi_utr_reference,
          sub_total, tax_total, discount_total, grand_total, sync_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          order.order_id,
          order.outlet_id,
          order.terminal_id,
          order.invoice_number,
          tableId,
          order.order_status,
          order.order_type,
          paymentMethod,
          customerId,
          customerPhone,
          customerName,
          pointsRedeemed,
          pointsEarned,
          upiUtrRef,
          order.sub_total,
          order.tax_total,
          order.discount_total,
          order.grand_total,
          initialSyncStatus
        ]
      );

      // Step B: Loop and insert child items
      for (const item of order.items) {
        this.db.run(
          `INSERT INTO order_items (
            order_item_id, order_id, item_id, item_name, quantity, unit_price, sub_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            item.order_item_id,
            order.order_id,
            item.item_id,
            item.item_name,
            item.quantity,
            item.unit_price,
            item.sub_total
          ]
        );
      }

      // Step C: Update dining_tables status if this is a Dine-In table order
      if (tableId && (order.order_status === 'PENDING' || order.order_status === 'PREPARING')) {
        this.db.run(
          `UPDATE dining_tables 
           SET status = 'OCCUPIED', 
               active_order_id = ?, 
               guest_count = CASE WHEN guest_count > 0 THEN guest_count ELSE 4 END,
               occupied_since = COALESCE(occupied_since, CURRENT_TIMESTAMP)
           WHERE table_id = ?`,
          [order.order_id, tableId]
        );
      }

      // Step D: Auto-deduct raw material inventory per Recipe BOM
      if (deductStock) {
        this.inventoryService.deductRecipeStock(order.items);
      }

      // Step E: Update Customer CRM Wallet & Loyalty Ledger atomically
      if (customerId) {
        const custRes = this.db.exec(
          `SELECT loyalty_points, lifetime_spend, visit_count FROM customers WHERE customer_id = ? LIMIT 1`,
          [customerId]
        );
        if (custRes[0] && custRes[0].values && custRes[0].values[0]) {
          const currentPoints = Number(custRes[0].values[0][0]);
          const currentSpend = Number(custRes[0].values[0][1]);
          const currentVisits = Number(custRes[0].values[0][2]);

          const safeRedeem = Math.min(currentPoints, pointsRedeemed);
          const nextPoints = Math.max(0, currentPoints - safeRedeem + pointsEarned);
          const nextSpend = Math.round((currentSpend + order.grand_total) * 100) / 100;
          const nextVisits = currentVisits + 1;
          const nextTier = nextSpend >= 10000 ? 'PLATINUM' : nextSpend >= 3500 ? 'GOLD' : 'SILVER';

          this.db.run(
            `UPDATE customers
             SET loyalty_points = ?,
                 lifetime_spend = ?,
                 visit_count = ?,
                 tier = ?,
                 last_visit_at = CURRENT_TIMESTAMP
             WHERE customer_id = ?`,
            [nextPoints, nextSpend, nextVisits, nextTier, customerId]
          );

          if (safeRedeem > 0) {
            this.db.run(
              `INSERT INTO loyalty_ledger (
                ledger_id, customer_id, order_id, invoice_number, points_delta, transaction_type, created_at
              ) VALUES (?, ?, ?, ?, ?, 'REDEEM', CURRENT_TIMESTAMP)`,
              [`ldg-red-${order.order_id.slice(0, 8)}`, customerId, order.order_id, order.invoice_number, -safeRedeem]
            );
          }

          if (pointsEarned > 0) {
            this.db.run(
              `INSERT INTO loyalty_ledger (
                ledger_id, customer_id, order_id, invoice_number, points_delta, transaction_type, created_at
              ) VALUES (?, ?, ?, ?, ?, 'EARN', CURRENT_TIMESTAMP)`,
              [`ldg-ern-${order.order_id.slice(0, 8)}`, customerId, order.order_id, order.invoice_number, pointsEarned]
            );
          }
        }
      }

      this.db.run('COMMIT');
      return { success: true };
    } catch (err: any) {
      try {
        this.db.run('ROLLBACK');
      } catch {}
      console.error('[OrderRepository] Transaction failed. Rolled back.', err);
      return { success: false, error: err.message || 'Unknown database error' };
    }
  }

  /**
   * Fetches a single order by order_id
   */
  public getOrderById(orderId: string): PersistedOrder | null {
    const res = this.db.exec(
      `SELECT order_id, outlet_id, terminal_id, invoice_number, order_status, order_type,
              sub_total, tax_total, discount_total, grand_total, sync_status, created_at, updated_at,
              payment_method, table_id, customer_id, customer_phone, customer_name,
              loyalty_points_redeemed, loyalty_points_earned, upi_utr_reference
       FROM orders
       WHERE order_id = ?
       LIMIT 1`,
      [orderId]
    );

    if (!res[0] || !res[0].values || !res[0].values[0]) return null;
    const row = res[0].values[0];

    return {
      order_id: String(row[0]),
      outlet_id: String(row[1]),
      terminal_id: String(row[2]),
      invoice_number: String(row[3]),
      order_status: row[4] as OrderStatus,
      order_type: row[5] as any,
      sub_total: Number(row[6]),
      tax_total: Number(row[7]),
      discount_total: Number(row[8]),
      grand_total: Number(row[9]),
      sync_status: row[10] as any,
      created_at: String(row[11]),
      updated_at: String(row[12]),
      payment_method: (row[13] as any) || 'CASH',
      table_id: row[14] ? String(row[14]) : undefined,
      customer_id: row[15] ? String(row[15]) : undefined,
      customer_phone: row[16] ? String(row[16]) : undefined,
      customer_name: row[17] ? String(row[17]) : undefined,
      loyalty_points_redeemed: Number(row[18]) || 0,
      loyalty_points_earned: Number(row[19]) || 0,
      upi_utr_reference: row[20] ? String(row[20]) : undefined,
      items: this.getItemsForOrder(String(row[0]))
    };
  }

  /**
   * Fetches local orders flagged as 'PENDING' or 'FAILED' for background sync
   */
  public getPendingSyncOrders(batchSize: number = 50): PersistedOrder[] {
    const res = this.db.exec(
      `SELECT order_id, outlet_id, terminal_id, invoice_number, order_status, order_type,
              sub_total, tax_total, discount_total, grand_total, sync_status, created_at, updated_at,
              payment_method, table_id, customer_id, customer_phone, customer_name,
              loyalty_points_redeemed, loyalty_points_earned, upi_utr_reference
       FROM orders 
       WHERE sync_status IN ('PENDING', 'FAILED')
       ORDER BY created_at ASC
       LIMIT ?`,
      [batchSize]
    );

    if (!res[0] || !res[0].values) return [];

    return res[0].values.map((row) => {
      const orderId = String(row[0]);
      const items = this.getItemsForOrder(orderId);

      return {
        order_id: orderId,
        outlet_id: String(row[1]),
        terminal_id: String(row[2]),
        invoice_number: String(row[3]),
        order_status: row[4] as OrderStatus,
        order_type: row[5] as any,
        sub_total: Number(row[6]),
        tax_total: Number(row[7]),
        discount_total: Number(row[8]),
        grand_total: Number(row[9]),
        sync_status: row[10] as any,
        created_at: String(row[11]),
        updated_at: String(row[12]),
        payment_method: (row[13] as any) || 'CASH',
        table_id: row[14] ? String(row[14]) : undefined,
        customer_id: row[15] ? String(row[15]) : undefined,
        customer_phone: row[16] ? String(row[16]) : undefined,
        customer_name: row[17] ? String(row[17]) : undefined,
        loyalty_points_redeemed: Number(row[18]) || 0,
        loyalty_points_earned: Number(row[19]) || 0,
        upi_utr_reference: row[20] ? String(row[20]) : undefined,
        items
      };
    });
  }

  /**
   * Returns child items for a given order
   */
  public getItemsForOrder(orderId: string): OrderItemInput[] {
    const res = this.db.exec(
      `SELECT order_item_id, item_id, item_name, quantity, unit_price, sub_total 
       FROM order_items WHERE order_id = ?`,
      [orderId]
    );

    if (!res[0] || !res[0].values) return [];

    return res[0].values.map((row) => ({
      order_item_id: String(row[0]),
      item_id: String(row[1]),
      item_name: String(row[2]),
      quantity: Number(row[3]),
      unit_price: Number(row[4]),
      sub_total: Number(row[5])
    }));
  }

  /**
   * Atomically marks a synced batch as 'SYNCED' with optimistic concurrency snapshot check
   */
  public markOrdersSynced(syncedSnapshots: Array<{ order_id: string; updated_at: string }>): void {
    for (const snap of syncedSnapshots) {
      this.db.run(
        `UPDATE orders 
         SET sync_status = 'SYNCED' 
         WHERE order_id = ? AND updated_at = ?`,
        [snap.order_id, snap.updated_at]
      );
    }
  }

  /**
   * Marks orders as 'FAILED' when the Cloud returns an ingestion error
   */
  public markOrdersFailed(orderIds: string[]): void {
    for (const id of orderIds) {
      this.db.run(
        `UPDATE orders 
         SET sync_status = 'FAILED' 
         WHERE order_id = ? AND sync_status = 'PENDING'`,
        [id]
      );
    }
  }

  /**
   * Updates order status locally and automatically queues for Cloud re-sync.
   * If cancelled, automatically restores raw material recipe stock.
   * If completed or cancelled, frees up the dining table if linked.
   */
  public updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus
  ): { success: boolean; error?: string } {
    try {
      const items = this.getItemsForOrder(orderId);

      this.db.run(
        `UPDATE orders 
         SET order_status = ?, 
             updated_at = CURRENT_TIMESTAMP, 
             sync_status = 'PENDING'
         WHERE order_id = ?`,
        [newStatus, orderId]
      );

      // If status transitioned to CANCELLED, restore raw materials to inventory
      if (newStatus === 'CANCELLED' && items.length > 0) {
        this.inventoryService.restoreRecipeStock(items);
      }

      // If status is COMPLETED or CANCELLED, release any table bound to this order
      if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
        this.db.run(
          `UPDATE dining_tables 
           SET status = 'AVAILABLE',
               active_order_id = NULL,
               merged_with_table_id = NULL,
               guest_count = 0,
               occupied_since = NULL
           WHERE active_order_id = ?`,
          [orderId]
        );
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update order status' };
    }
  }

  /**
   * Returns all local orders (with optional status filter)
   */
  public getAllOrders(statusFilter?: string): PersistedOrder[] {
    let sql = `
      SELECT order_id, outlet_id, terminal_id, invoice_number, order_status, order_type,
             sub_total, tax_total, discount_total, grand_total, sync_status, created_at, updated_at,
             payment_method, table_id, customer_id, customer_phone, customer_name,
             loyalty_points_redeemed, loyalty_points_earned, upi_utr_reference
       FROM orders
    `;
    const params: any[] = [];

    if (statusFilter && statusFilter !== 'ALL') {
      sql += ` WHERE order_status = ?`;
      params.push(statusFilter);
    }

    sql += ` ORDER BY created_at DESC LIMIT 100`;

    const res = this.db.exec(sql, params);
    if (!res[0] || !res[0].values) return [];

    return res[0].values.map((row) => {
      const orderId = String(row[0]);
      return {
        order_id: orderId,
        outlet_id: String(row[1]),
        terminal_id: String(row[2]),
        invoice_number: String(row[3]),
        order_status: row[4] as OrderStatus,
        order_type: row[5] as any,
        sub_total: Number(row[6]),
        tax_total: Number(row[7]),
        discount_total: Number(row[8]),
        grand_total: Number(row[9]),
        sync_status: row[10] as any,
        created_at: String(row[11]),
        updated_at: String(row[12]),
        payment_method: (row[13] as any) || 'CASH',
        table_id: row[14] ? String(row[14]) : undefined,
        customer_id: row[15] ? String(row[15]) : undefined,
        customer_phone: row[16] ? String(row[16]) : undefined,
        customer_name: row[17] ? String(row[17]) : undefined,
        loyalty_points_redeemed: Number(row[18]) || 0,
        loyalty_points_earned: Number(row[19]) || 0,
        upi_utr_reference: row[20] ? String(row[20]) : undefined,
        items: this.getItemsForOrder(orderId)
      };
    });
  }

  /**
   * Fast sync count statistics for edge telemetry
   */
  public getSyncStats(): { total: number; pending: number; synced: number; failed: number } {
    const res = this.db.exec(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN sync_status = 'PENDING' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN sync_status = 'SYNCED' THEN 1 ELSE 0 END) as synced,
        SUM(CASE WHEN sync_status = 'FAILED' THEN 1 ELSE 0 END) as failed
      FROM orders
    `);

    if (!res[0] || !res[0].values || !res[0].values[0]) {
      return { total: 0, pending: 0, synced: 0, failed: 0 };
    }

    const row = res[0].values[0];
    return {
      total: Number(row[0]) || 0,
      pending: Number(row[1]) || 0,
      synced: Number(row[2]) || 0,
      failed: Number(row[3]) || 0
    };
  }
}
