import crypto from 'crypto';
import { Database } from 'sql.js';
import {
  DiningTable,
  OrderInput,
  OrderItemInput,
  PaymentMethod,
  PrintSpoolJob,
  TableSection,
  TableStatus
} from './types.js';
import { OrderRepository } from './orderRepository.js';
import { ThermalPrinterService } from './printerService.js';

export class TableService {
  private db: Database;
  private orderRepo: OrderRepository;
  private printerService: ThermalPrinterService;

  constructor(db: Database, orderRepo: OrderRepository, printerService: ThermalPrinterService) {
    this.db = db;
    this.orderRepo = orderRepo;
    this.printerService = printerService;
  }

  /**
   * Returns all dining tables enriched with their active running order
   */
  public getFloorTables(): DiningTable[] {
    const res = this.db.exec(`
      SELECT table_id, table_name, section, capacity, status,
             active_order_id, merged_with_table_id, guest_count, occupied_since
      FROM dining_tables
      ORDER BY table_id ASC
    `);

    if (!res[0] || !res[0].values) return [];

    return res[0].values.map((row) => {
      const activeOrderId = row[5] ? String(row[5]) : null;
      const activeOrder = activeOrderId ? this.orderRepo.getOrderById(activeOrderId) : null;

      return {
        table_id: String(row[0]),
        table_name: String(row[1]),
        section: row[2] as TableSection,
        capacity: Number(row[3]),
        status: row[4] as TableStatus,
        active_order_id: activeOrderId,
        merged_with_table_id: row[6] ? String(row[6]) : null,
        guest_count: Number(row[7]) || 0,
        occupied_since: row[8] ? String(row[8]) : null,
        active_order: activeOrder
      };
    });
  }

  /**
   * Atomically transfers a running order from one table to an available target table
   */
  public transferTable(
    fromTableId: string,
    toTableId: string
  ): { success: boolean; error?: string } {
    if (fromTableId === toTableId) {
      return { success: false, error: 'Source and destination tables must be different' };
    }

    const tables = this.getFloorTables();
    const fromTable = tables.find((t) => t.table_id === fromTableId);
    const toTable = tables.find((t) => t.table_id === toTableId);

    if (!fromTable || !fromTable.active_order_id) {
      return { success: false, error: `Table ${fromTableId} has no active running order to transfer` };
    }
    if (!toTable || toTable.status !== 'AVAILABLE') {
      return { success: false, error: `Target table ${toTableId} is currently occupied` };
    }

    try {
      this.db.run('BEGIN TRANSACTION');

      // 1. Update order's table_id and mark PENDING for Cloud sync
      this.db.run(
        `UPDATE orders
         SET table_id = ?, updated_at = CURRENT_TIMESTAMP, sync_status = 'PENDING'
         WHERE order_id = ?`,
        [toTableId, fromTable.active_order_id]
      );

      // 2. Occupy destination table
      this.db.run(
        `UPDATE dining_tables
         SET status = 'OCCUPIED',
             active_order_id = ?,
             guest_count = ?,
             occupied_since = ?
         WHERE table_id = ?`,
        [
          fromTable.active_order_id,
          fromTable.guest_count || 4,
          fromTable.occupied_since || new Date().toISOString(),
          toTableId
        ]
      );

      // 3. Free source table
      this.db.run(
        `UPDATE dining_tables
         SET status = 'AVAILABLE',
             active_order_id = NULL,
             merged_with_table_id = NULL,
             guest_count = 0,
             occupied_since = NULL
         WHERE table_id = ?`,
        [fromTableId]
      );

      this.db.run('COMMIT');
      return { success: true };
    } catch (err: any) {
      try {
        this.db.run('ROLLBACK');
      } catch {}
      return { success: false, error: err.message || 'Table transfer failed' };
    }
  }

  /**
   * Atomically merges two tables (and consolidates their running orders if both have orders)
   */
  public mergeTables(
    primaryTableId: string,
    secondaryTableId: string
  ): { success: boolean; error?: string } {
    if (primaryTableId === secondaryTableId) {
      return { success: false, error: 'Cannot merge a table with itself' };
    }

    const tables = this.getFloorTables();
    const primary = tables.find((t) => t.table_id === primaryTableId);
    const secondary = tables.find((t) => t.table_id === secondaryTableId);

    if (!primary || !primary.active_order_id || !primary.active_order) {
      return { success: false, error: `Primary table ${primaryTableId} must have an active order` };
    }
    if (!secondary) {
      return { success: false, error: `Secondary table ${secondaryTableId} not found` };
    }

    try {
      this.db.run('BEGIN TRANSACTION');

      // If secondary table has its own distinct active order, consolidate its items into primary order
      if (
        secondary.active_order_id &&
        secondary.active_order_id !== primary.active_order_id &&
        secondary.active_order
      ) {
        const secOrder = secondary.active_order;

        // Re-link child items from secondary order to primary order
        this.db.run(
          `UPDATE order_items SET order_id = ? WHERE order_id = ?`,
          [primary.active_order_id, secOrder.order_id]
        );

        const newSubTotal = Math.round((primary.active_order.sub_total + secOrder.sub_total) * 100) / 100;
        const newDiscount = Math.round((primary.active_order.discount_total + secOrder.discount_total) * 100) / 100;
        const newTax = Math.round(newSubTotal * 0.05 * 100) / 100;
        const newGrand = Math.max(0, Math.round((newSubTotal + newTax - newDiscount) * 100) / 100);

        this.db.run(
          `UPDATE orders
           SET sub_total = ?, tax_total = ?, discount_total = ?, grand_total = ?,
               updated_at = CURRENT_TIMESTAMP, sync_status = 'PENDING'
           WHERE order_id = ?`,
          [newSubTotal, newTax, newDiscount, newGrand, primary.active_order_id]
        );

        // Mark old secondary order shell as CANCELLED (stock stays deducted because items moved to primary)
        this.db.run(
          `UPDATE orders
           SET order_status = 'CANCELLED', sub_total = 0, tax_total = 0, grand_total = 0,
               updated_at = CURRENT_TIMESTAMP, sync_status = 'PENDING'
           WHERE order_id = ?`,
          [secOrder.order_id]
        );
      }

      // Link secondary table to primary table
      this.db.run(
        `UPDATE dining_tables
         SET status = 'OCCUPIED',
             active_order_id = ?,
             merged_with_table_id = ?,
             guest_count = CASE WHEN guest_count > 0 THEN guest_count ELSE 2 END,
             occupied_since = COALESCE(occupied_since, CURRENT_TIMESTAMP)
         WHERE table_id = ?`,
        [primary.active_order_id, primaryTableId, secondaryTableId]
      );

      this.db.run('COMMIT');
      return { success: true };
    } catch (err: any) {
      try {
        this.db.run('ROLLBACK');
      } catch {}
      return { success: false, error: err.message || 'Table merge failed' };
    }
  }

  /**
   * Splits a running order equally across N guests with zero floating-point rounding drift
   */
  public splitOrderEqual(
    orderId: string,
    splitCount: number,
    tenders: PaymentMethod[]
  ): {
    success: boolean;
    splitOrders?: OrderInput[];
    spoolJobs?: PrintSpoolJob[];
    error?: string;
  } {
    const parentOrder = this.orderRepo.getOrderById(orderId);
    if (!parentOrder) {
      return { success: false, error: 'Order not found' };
    }
    if (splitCount < 2 || splitCount > 6) {
      return { success: false, error: 'Split count must be between 2 and 6 guests' };
    }

    try {
      this.db.run('BEGIN TRANSACTION');

      // Convert totals to integer minor units (paise) to avoid any rounding penny loss
      const subTotalMinor = Math.round(parentOrder.sub_total * 100);
      const taxTotalMinor = Math.round(parentOrder.tax_total * 100);
      const discountMinor = Math.round(parentOrder.discount_total * 100);
      const grandTotalMinor = Math.round(parentOrder.grand_total * 100);

      const baseSub = Math.floor(subTotalMinor / splitCount);
      const baseTax = Math.floor(taxTotalMinor / splitCount);
      const baseDisc = Math.floor(discountMinor / splitCount);
      const baseGrand = Math.floor(grandTotalMinor / splitCount);

      const splitOrders: OrderInput[] = [];
      const spoolJobs: PrintSpoolJob[] = [];

      for (let i = 0; i < splitCount; i++) {
        const isLast = i === splitCount - 1;
        const shareSub = (isLast ? subTotalMinor - baseSub * (splitCount - 1) : baseSub) / 100;
        const shareTax = (isLast ? taxTotalMinor - baseTax * (splitCount - 1) : baseTax) / 100;
        const shareDisc = (isLast ? discountMinor - baseDisc * (splitCount - 1) : baseDisc) / 100;
        const shareGrand = (isLast ? grandTotalMinor - baseGrand * (splitCount - 1) : baseGrand) / 100;

        const childOrderId = crypto.randomUUID();
        const childInvoice = `${parentOrder.invoice_number}-S${i + 1}`;
        const tender = tenders[i] || 'CASH';

        const childItems: OrderItemInput[] = [
          {
            order_item_id: crypto.randomUUID(),
            item_id: 'split-share-item',
            item_name: `Equal Split Share (${i + 1}/${splitCount}) - ${parentOrder.invoice_number}`,
            quantity: 1,
            unit_price: shareSub,
            sub_total: shareSub
          }
        ];

        const childOrder: OrderInput = {
          order_id: childOrderId,
          outlet_id: parentOrder.outlet_id,
          terminal_id: parentOrder.terminal_id,
          invoice_number: childInvoice,
          table_id: parentOrder.table_id,
          order_status: 'COMPLETED',
          order_type: parentOrder.order_type,
          payment_method: tender,
          sub_total: shareSub,
          tax_total: shareTax,
          discount_total: shareDisc,
          grand_total: shareGrand,
          items: childItems
        };

        this.db.run(
          `INSERT INTO orders (
            order_id, outlet_id, terminal_id, invoice_number, table_id,
            order_status, order_type, payment_method, sub_total, tax_total,
            discount_total, grand_total, sync_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            childOrder.order_id,
            childOrder.outlet_id,
            childOrder.terminal_id,
            childOrder.invoice_number,
            childOrder.table_id || null,
            childOrder.order_type,
            tender,
            childOrder.sub_total,
            childOrder.tax_total,
            childOrder.discount_total,
            childOrder.grand_total
          ]
        );

        this.db.run(
          `INSERT INTO order_items (
            order_item_id, order_id, item_id, item_name, quantity, unit_price, sub_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            childItems[0].order_item_id,
            childOrder.order_id,
            childItems[0].item_id,
            childItems[0].item_name,
            1,
            shareSub,
            shareSub
          ]
        );

        splitOrders.push(childOrder);
      }

      // Mark original parent order as CANCELLED/superseded so revenue is not double-counted
      this.db.run(
        `UPDATE orders
         SET order_status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP, sync_status = 'PENDING'
         WHERE order_id = ?`,
        [orderId]
      );

      // Release all tables bound to this order
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

      this.db.run('COMMIT');

      // Spool individual ESC/POS receipts for each split invoice
      for (const so of splitOrders) {
        spoolJobs.push(this.printerService.enqueueReceipt(so));
      }

      return { success: true, splitOrders, spoolJobs };
    } catch (err: any) {
      try {
        this.db.run('ROLLBACK');
      } catch {}
      return { success: false, error: err.message || 'Failed to split order equally' };
    }
  }

  /**
   * Splits a running order by assigning specific line items to Bill A vs Bill B
   */
  public splitOrderByItems(
    orderId: string,
    itemBucketMap: { [orderItemId: string]: 'A' | 'B' },
    tenderA: PaymentMethod,
    tenderB: PaymentMethod
  ): {
    success: boolean;
    splitOrders?: OrderInput[];
    spoolJobs?: PrintSpoolJob[];
    error?: string;
  } {
    const parentOrder = this.orderRepo.getOrderById(orderId);
    if (!parentOrder) {
      return { success: false, error: 'Order not found' };
    }

    const itemsA = parentOrder.items.filter((it) => (itemBucketMap[it.order_item_id] || 'A') === 'A');
    const itemsB = parentOrder.items.filter((it) => itemBucketMap[it.order_item_id] === 'B');

    if (itemsA.length === 0 || itemsB.length === 0) {
      return {
        success: false,
        error: 'Both Split Bill A and Split Bill B must have at least 1 assigned dish'
      };
    }

    try {
      this.db.run('BEGIN TRANSACTION');

      const groups: Array<{ suffix: 'A' | 'B'; items: OrderItemInput[]; tender: PaymentMethod }> = [
        { suffix: 'A', items: itemsA, tender: tenderA },
        { suffix: 'B', items: itemsB, tender: tenderB }
      ];

      const splitOrders: OrderInput[] = [];
      const spoolJobs: PrintSpoolJob[] = [];

      for (const grp of groups) {
        const subTotal = Math.round(grp.items.reduce((s, i) => s + i.sub_total, 0) * 100) / 100;
        const ratio = parentOrder.sub_total > 0 ? subTotal / parentOrder.sub_total : 0.5;
        const discountTotal = Math.round(parentOrder.discount_total * ratio * 100) / 100;
        const taxTotal = Math.round(subTotal * 0.05 * 100) / 100;
        const grandTotal = Math.max(0, Math.round((subTotal + taxTotal - discountTotal) * 100) / 100);

        const childOrderId = crypto.randomUUID();
        const childInvoice = `${parentOrder.invoice_number}-${grp.suffix}`;

        const clonedItems: OrderItemInput[] = grp.items.map((it) => ({
          ...it,
          order_item_id: crypto.randomUUID()
        }));

        const childOrder: OrderInput = {
          order_id: childOrderId,
          outlet_id: parentOrder.outlet_id,
          terminal_id: parentOrder.terminal_id,
          invoice_number: childInvoice,
          table_id: parentOrder.table_id,
          order_status: 'COMPLETED',
          order_type: parentOrder.order_type,
          payment_method: grp.tender,
          sub_total: subTotal,
          tax_total: taxTotal,
          discount_total: discountTotal,
          grand_total: grandTotal,
          items: clonedItems
        };

        this.db.run(
          `INSERT INTO orders (
            order_id, outlet_id, terminal_id, invoice_number, table_id,
            order_status, order_type, payment_method, sub_total, tax_total,
            discount_total, grand_total, sync_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            childOrder.order_id,
            childOrder.outlet_id,
            childOrder.terminal_id,
            childOrder.invoice_number,
            childOrder.table_id || null,
            childOrder.order_type,
            grp.tender,
            childOrder.sub_total,
            childOrder.tax_total,
            childOrder.discount_total,
            childOrder.grand_total
          ]
        );

        for (const ci of clonedItems) {
          this.db.run(
            `INSERT INTO order_items (
              order_item_id, order_id, item_id, item_name, quantity, unit_price, sub_total
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              ci.order_item_id,
              childOrder.order_id,
              ci.item_id,
              ci.item_name,
              ci.quantity,
              ci.unit_price,
              ci.sub_total
            ]
          );
        }

        splitOrders.push(childOrder);
      }

      // Supersede parent order without restoring stock
      this.db.run(
        `UPDATE orders
         SET order_status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP, sync_status = 'PENDING'
         WHERE order_id = ?`,
        [orderId]
      );

      // Free the dining table
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

      this.db.run('COMMIT');

      for (const so of splitOrders) {
        spoolJobs.push(this.printerService.enqueueReceipt(so));
      }

      return { success: true, splitOrders, spoolJobs };
    } catch (err: any) {
      try {
        this.db.run('ROLLBACK');
      } catch {}
      return { success: false, error: err.message || 'Item-wise split failed' };
    }
  }
}
