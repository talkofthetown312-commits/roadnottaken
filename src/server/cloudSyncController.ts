import { Database } from 'sql.js';
import { CloudOrderRecord, OrderInput, PersistedOrder } from './types.js';

export class CloudSyncController {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Batch upsert endpoint matching PostgreSQL ON CONFLICT (order_id) DO UPDATE ... WHERE EXCLUDED.updated_at >= cloud_orders.updated_at
   */
  public ingestBatch(
    merchantId: string,
    orders: PersistedOrder[]
  ): {
    success: boolean;
    synced_order_ids: string[];
    failed_orders: Array<{ order_id: string; reason: string }>;
  } {
    const synced_order_ids: string[] = [];
    const failed_orders: Array<{ order_id: string; reason: string }> = [];

    for (const order of orders) {
      try {
        // Check if existing cloud order is newer
        const existing = this.db.exec(
          `SELECT updated_at FROM cloud_orders WHERE order_id = ?`,
          [order.order_id]
        );

        if (existing[0] && existing[0].values && existing[0].values.length > 0) {
          const currentUpdatedAt = String(existing[0].values[0][0]);
          // Stale write protection: if incoming order updated_at is older than existing, skip overwrite
          if (order.updated_at < currentUpdatedAt) {
            // Still acknowledge receipt so local edge stops resending
            synced_order_ids.push(order.order_id);
            continue;
          }

          // Update existing cloud record
          this.db.run(
            `UPDATE cloud_orders 
             SET order_status = ?, sub_total = ?, tax_total = ?, discount_total = ?, 
                 grand_total = ?, updated_at = ?, received_at = CURRENT_TIMESTAMP
             WHERE order_id = ?`,
            [
              order.order_status,
              order.sub_total,
              order.tax_total,
              order.discount_total,
              order.grand_total,
              order.updated_at,
              order.order_id
            ]
          );
        } else {
          // Insert new cloud record
          this.db.run(
            `INSERT INTO cloud_orders (
              order_id, merchant_id, outlet_id, terminal_id, invoice_number,
              order_status, order_type, sub_total, tax_total, discount_total,
              grand_total, created_at, updated_at, received_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [
              order.order_id,
              merchantId,
              order.outlet_id,
              order.terminal_id,
              order.invoice_number,
              order.order_status,
              order.order_type,
              order.sub_total,
              order.tax_total,
              order.discount_total,
              order.grand_total,
              order.created_at,
              order.updated_at
            ]
          );
        }

        // Child items replacement
        this.db.run(`DELETE FROM cloud_order_items WHERE order_id = ?`, [order.order_id]);
        for (const item of order.items) {
          this.db.run(
            `INSERT INTO cloud_order_items (
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

        synced_order_ids.push(order.order_id);
      } catch (err: any) {
        failed_orders.push({
          order_id: order.order_id,
          reason: err.message || 'Database error during cloud upsert'
        });
      }
    }

    return {
      success: true,
      synced_order_ids,
      failed_orders
    };
  }

  /**
   * Returns all cloud orders for multi-outlet analytics
   */
  public getCloudOrders(): CloudOrderRecord[] {
    const res = this.db.exec(`
      SELECT order_id, merchant_id, outlet_id, terminal_id, invoice_number,
             order_status, order_type, sub_total, tax_total, discount_total,
             grand_total, created_at, updated_at, received_at
      FROM cloud_orders
      ORDER BY received_at DESC
      LIMIT 100
    `);

    if (!res[0] || !res[0].values) return [];

    return res[0].values.map((row) => {
      const orderId = String(row[0]);
      const itemsRes = this.db.exec(
        `SELECT order_item_id, item_id, item_name, quantity, unit_price, sub_total 
         FROM cloud_order_items WHERE order_id = ?`,
        [orderId]
      );
      const items = (itemsRes[0]?.values || []).map((iRow) => ({
        order_item_id: String(iRow[0]),
        item_id: String(iRow[1]),
        item_name: String(iRow[2]),
        quantity: Number(iRow[3]),
        unit_price: Number(iRow[4]),
        sub_total: Number(iRow[5])
      }));

      return {
        order_id: orderId,
        merchant_id: String(row[1]),
        outlet_id: String(row[2]),
        terminal_id: String(row[3]),
        invoice_number: String(row[4]),
        order_status: row[5] as any,
        order_type: row[6] as any,
        sub_total: Number(row[7]),
        tax_total: Number(row[8]),
        discount_total: Number(row[9]),
        grand_total: Number(row[10]),
        created_at: String(row[11]),
        updated_at: String(row[12]),
        received_at: String(row[13]),
        items
      };
    });
  }

  /**
   * Calculates cloud-level KPI metrics
   */
  public getCloudMetrics(): {
    totalRevenue: number;
    totalOrders: number;
    dineInRevenue: number;
    takeawayRevenue: number;
    deliveryRevenue: number;
    activeOutletsCount: number;
  } {
    const res = this.db.exec(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(grand_total) as total_revenue,
        SUM(CASE WHEN order_type = 'DINE_IN' THEN grand_total ELSE 0 END) as dine_in_rev,
        SUM(CASE WHEN order_type = 'TAKEAWAY' THEN grand_total ELSE 0 END) as takeaway_rev,
        SUM(CASE WHEN order_type = 'DELIVERY' THEN grand_total ELSE 0 END) as delivery_rev,
        COUNT(DISTINCT outlet_id) as outlet_count
      FROM cloud_orders
    `);

    if (!res[0] || !res[0].values || !res[0].values[0]) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        dineInRevenue: 0,
        takeawayRevenue: 0,
        deliveryRevenue: 0,
        activeOutletsCount: 1
      };
    }

    const row = res[0].values[0];
    return {
      totalOrders: Number(row[0]) || 0,
      totalRevenue: Number(row[1]) || 0,
      dineInRevenue: Number(row[2]) || 0,
      takeawayRevenue: Number(row[3]) || 0,
      deliveryRevenue: Number(row[4]) || 0,
      activeOutletsCount: Math.max(1, Number(row[5]) || 0)
    };
  }
}
