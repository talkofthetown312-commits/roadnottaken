import { Database } from 'sql.js';
import {
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  GoodsReceivedNote,
  GrnItem,
  PoStatus,
  PrintSpoolJob
} from './types.js';
import { ThermalPrinterService } from './printerService.js';

export interface CreatePoInput {
  supplier_id: string;
  notes?: string;
  expected_delivery_date: string;
  items: Array<{
    ingredient_id: string;
    ordered_quantity: number;
    unit_price: number;
  }>;
}

export interface ReceiveGrnInput {
  po_id: string;
  invoice_ref_number: string;
  received_by: string;
  discrepancy_note?: string;
  items: Array<{
    ingredient_id: string;
    received_quantity: number;
    rejected_quantity?: number;
    unit_price: number;
    remarks?: string;
  }>;
}

export class ProcurementService {
  private db: Database;
  private printerService: ThermalPrinterService;

  constructor(db: Database, printerService: ThermalPrinterService) {
    this.db = db;
    this.printerService = printerService;
  }

  /**
   * Retrieves all registered suppliers
   */
  public getSuppliers(): Supplier[] {
    const res = this.db.exec(
      `SELECT supplier_id, name, category, contact_person, phone, email, gstin, payment_terms_days, rating, is_active
       FROM suppliers
       ORDER BY name ASC`
    );

    if (!res[0] || !res[0].values) return [];

    return res[0].values.map((row) => ({
      supplier_id: String(row[0]),
      name: String(row[1]),
      category: row[2] as any,
      contact_person: String(row[3]),
      phone: String(row[4]),
      email: row[5] ? String(row[5]) : undefined,
      gstin: String(row[6]),
      payment_terms_days: Number(row[7]),
      rating: Number(row[8]),
      is_active: Boolean(row[9]),
    }));
  }

  /**
   * Registers a new supplier
   */
  public createSupplier(data: Omit<Supplier, 'supplier_id' | 'rating' | 'is_active'>): Supplier {
    const id = `sup-${Date.now().toString().slice(-6)}`;
    this.db.run(
      `INSERT INTO suppliers (
        supplier_id, name, category, contact_person, phone, email, gstin, payment_terms_days, rating, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 4.8, 1)`,
      [id, data.name, data.category, data.contact_person, data.phone, data.email || null, data.gstin, data.payment_terms_days || 15]
    );

    return {
      supplier_id: id,
      name: data.name,
      category: data.category,
      contact_person: data.contact_person,
      phone: data.phone,
      email: data.email,
      gstin: data.gstin,
      payment_terms_days: data.payment_terms_days || 15,
      rating: 4.8,
      is_active: true,
    };
  }

  /**
   * Retrieves all Purchase Orders with items
   */
  public getPurchaseOrders(): PurchaseOrder[] {
    const res = this.db.exec(
      `SELECT po_id, po_number, supplier_id, supplier_name, status, sub_total, tax_total, grand_total, notes, expected_delivery_date, created_at, updated_at
       FROM purchase_orders
       ORDER BY created_at DESC`
    );

    if (!res[0] || !res[0].values) return [];

    return res[0].values.map((row) => {
      const poId = String(row[0]);
      return {
        po_id: poId,
        po_number: String(row[1]),
        supplier_id: String(row[2]),
        supplier_name: String(row[3]),
        status: row[4] as PoStatus,
        sub_total: Number(row[5]),
        tax_total: Number(row[6]),
        grand_total: Number(row[7]),
        notes: row[8] ? String(row[8]) : undefined,
        expected_delivery_date: String(row[9]),
        created_at: String(row[10]),
        updated_at: String(row[11]),
        items: this.getPoItems(poId),
      };
    });
  }

  private getPoItems(poId: string): PurchaseOrderItem[] {
    const res = this.db.exec(
      `SELECT po_item_id, po_id, ingredient_id, ingredient_name, unit, ordered_quantity, received_quantity, unit_price, total_cost
       FROM purchase_order_items
       WHERE po_id = ?`,
      [poId]
    );

    if (!res[0] || !res[0].values) return [];

    return res[0].values.map((row) => ({
      po_item_id: String(row[0]),
      po_id: String(row[1]),
      ingredient_id: String(row[2]),
      ingredient_name: String(row[3]),
      unit: String(row[4]),
      ordered_quantity: Number(row[5]),
      received_quantity: Number(row[6]),
      unit_price: Number(row[7]),
      total_cost: Number(row[8]),
    }));
  }

  /**
   * Creates a formal Purchase Order
   */
  public createPurchaseOrder(input: CreatePoInput): PurchaseOrder {
    const suppliers = this.getSuppliers();
    const supplier = suppliers.find((s) => s.supplier_id === input.supplier_id);
    if (!supplier) throw new Error(`Supplier ${input.supplier_id} not found`);

    const poId = `po-${Date.now().toString().slice(-6)}`;
    const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    let subTotal = 0;
    const itemsToInsert: PurchaseOrderItem[] = [];

    for (const item of input.items) {
      const ingRes = this.db.exec(
        `SELECT name, unit FROM inventory_items WHERE ingredient_id = ? LIMIT 1`,
        [item.ingredient_id]
      );
      if (!ingRes[0] || !ingRes[0].values || !ingRes[0].values[0]) {
        throw new Error(`Ingredient ${item.ingredient_id} not found`);
      }
      const name = String(ingRes[0].values[0][0]);
      const unit = String(ingRes[0].values[0][1]);
      const totalCost = Math.round(item.ordered_quantity * item.unit_price * 100) / 100;
      subTotal += totalCost;

      itemsToInsert.push({
        po_item_id: `poi-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        po_id: poId,
        ingredient_id: item.ingredient_id,
        ingredient_name: name,
        unit,
        ordered_quantity: item.ordered_quantity,
        received_quantity: 0,
        unit_price: item.unit_price,
        total_cost: totalCost,
      });
    }

    const taxTotal = Math.round(subTotal * 0.05 * 100) / 100; // 5% GST
    const grandTotal = subTotal + taxTotal;

    this.db.run('BEGIN TRANSACTION');
    try {
      this.db.run(
        `INSERT INTO purchase_orders (
          po_id, po_number, supplier_id, supplier_name, status, sub_total, tax_total, grand_total, notes, expected_delivery_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'ISSUED', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [poId, poNumber, supplier.supplier_id, supplier.name, subTotal, taxTotal, grandTotal, input.notes || null, input.expected_delivery_date]
      );

      for (const it of itemsToInsert) {
        this.db.run(
          `INSERT INTO purchase_order_items (
            po_item_id, po_id, ingredient_id, ingredient_name, unit, ordered_quantity, received_quantity, unit_price, total_cost
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [it.po_item_id, poId, it.ingredient_id, it.ingredient_name, it.unit, it.ordered_quantity, 0, it.unit_price, it.total_cost]
        );
      }

      this.db.run('COMMIT');
    } catch (err) {
      try { this.db.run('ROLLBACK'); } catch {}
      throw err;
    }

    return {
      po_id: poId,
      po_number: poNumber,
      supplier_id: supplier.supplier_id,
      supplier_name: supplier.name,
      status: 'ISSUED',
      sub_total: subTotal,
      tax_total: taxTotal,
      grand_total: grandTotal,
      notes: input.notes,
      expected_delivery_date: input.expected_delivery_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: itemsToInsert,
    };
  }

  /**
   * Retrieves all Goods Received Notes (GRN)
   */
  public getGoodsReceivedNotes(): GoodsReceivedNote[] {
    const res = this.db.exec(
      `SELECT grn_id, grn_number, po_id, po_number, supplier_id, supplier_name, invoice_ref_number, received_by, total_received_cost, status, discrepancy_note, received_at
       FROM goods_received_notes
       ORDER BY received_at DESC`
    );

    if (!res[0] || !res[0].values) return [];

    return res[0].values.map((row) => {
      const grnId = String(row[0]);
      return {
        grn_id: grnId,
        grn_number: String(row[1]),
        po_id: String(row[2]),
        po_number: String(row[3]),
        supplier_id: String(row[4]),
        supplier_name: String(row[5]),
        invoice_ref_number: String(row[6]),
        received_by: String(row[7]),
        total_received_cost: Number(row[8]),
        status: row[9] as any,
        discrepancy_note: row[10] ? String(row[10]) : undefined,
        received_at: String(row[11]),
        items: this.getGrnItems(grnId),
      };
    });
  }

  private getGrnItems(grnId: string): GrnItem[] {
    const res = this.db.exec(
      `SELECT grn_item_id, grn_id, ingredient_id, ingredient_name, unit, ordered_quantity, received_quantity, rejected_quantity, unit_price, total_cost, remarks
       FROM grn_items
       WHERE grn_id = ?`,
      [grnId]
    );

    if (!res[0] || !res[0].values) return [];

    return res[0].values.map((row) => ({
      grn_item_id: String(row[0]),
      grn_id: String(row[1]),
      ingredient_id: String(row[2]),
      ingredient_name: String(row[3]),
      unit: String(row[4]),
      ordered_quantity: Number(row[5]),
      received_quantity: Number(row[6]),
      rejected_quantity: Number(row[7]),
      unit_price: Number(row[8]),
      total_cost: Number(row[9]),
      remarks: row[10] ? String(row[10]) : undefined,
    }));
  }

  /**
   * Executes Goods Received Note (GRN) inventory inwarding inside an ACID transaction:
   * 1. Increments inventory_items.current_stock
   * 2. Recalculates weighted average cost per unit
   * 3. Updates purchase_order_items.received_quantity
   * 4. Updates purchase_orders status (PARTIALLY_RECEIVED or COMPLETED)
   * 5. Spools a GRN Inward thermal receipt
   */
  public receiveGrn(input: ReceiveGrnInput): { success: boolean; grn?: GoodsReceivedNote; spoolJob?: PrintSpoolJob; error?: string } {
    try {
      const poRes = this.db.exec(
        `SELECT po_number, supplier_id, supplier_name FROM purchase_orders WHERE po_id = ? LIMIT 1`,
        [input.po_id]
      );
      if (!poRes[0] || !poRes[0].values || !poRes[0].values[0]) {
        return { success: false, error: `Purchase Order ${input.po_id} not found` };
      }

      const poNumber = String(poRes[0].values[0][0]);
      const supplierId = String(poRes[0].values[0][1]);
      const supplierName = String(poRes[0].values[0][2]);

      const grnId = `grn-${Date.now().toString().slice(-6)}`;
      const grnNumber = `GRN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

      let totalReceivedCost = 0;
      let hasDiscrepancy = false;
      const grnItemsToInsert: GrnItem[] = [];

      this.db.run('BEGIN TRANSACTION');

      for (const item of input.items) {
        // Fetch ordered quantity from PO item
        const poiRes = this.db.exec(
          `SELECT ordered_quantity, received_quantity FROM purchase_order_items WHERE po_id = ? AND ingredient_id = ? LIMIT 1`,
          [input.po_id, item.ingredient_id]
        );
        const orderedQty = poiRes[0]?.values?.[0] ? Number(poiRes[0].values[0][0]) : item.received_quantity;
        const prevReceivedQty = poiRes[0]?.values?.[0] ? Number(poiRes[0].values[0][1]) : 0;

        const rejectedQty = item.rejected_quantity || 0;
        if (item.received_quantity !== orderedQty || rejectedQty > 0) {
          hasDiscrepancy = true;
        }

        // Fetch current inventory item stock and unit cost
        const ingRes = this.db.exec(
          `SELECT name, unit, current_stock, cost_per_unit FROM inventory_items WHERE ingredient_id = ? LIMIT 1`,
          [item.ingredient_id]
        );
        if (!ingRes[0] || !ingRes[0].values || !ingRes[0].values[0]) {
          throw new Error(`Ingredient ${item.ingredient_id} not found in inventory`);
        }

        const ingName = String(ingRes[0].values[0][0]);
        const ingUnit = String(ingRes[0].values[0][1]);
        const currentStock = Number(ingRes[0].values[0][2]);
        const currentUnitCost = Number(ingRes[0].values[0][3]);

        const lineCost = Math.round(item.received_quantity * item.unit_price * 100) / 100;
        totalReceivedCost += lineCost;

        // Weighted Average Cost Formula:
        // new_avg_cost = ((currentStock * currentUnitCost) + (received_qty * item.unit_price)) / (currentStock + received_qty)
        const newStock = Math.round((currentStock + item.received_quantity) * 1000) / 1000;
        const weightedCost = newStock > 0
          ? Math.round((((currentStock * currentUnitCost) + lineCost) / newStock) * 10000) / 10000
          : item.unit_price;

        // Update inventory item stock and cost
        this.db.run(
          `UPDATE inventory_items
           SET current_stock = ?,
               cost_per_unit = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE ingredient_id = ?`,
          [newStock, weightedCost, item.ingredient_id]
        );

        // Update PO item received quantity
        const newPoiReceived = prevReceivedQty + item.received_quantity;
        this.db.run(
          `UPDATE purchase_order_items
           SET received_quantity = ?
           WHERE po_id = ? AND ingredient_id = ?`,
          [newPoiReceived, input.po_id, item.ingredient_id]
        );

        grnItemsToInsert.push({
          grn_item_id: `grni-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          grn_id: grnId,
          ingredient_id: item.ingredient_id,
          ingredient_name: ingName,
          unit: ingUnit,
          ordered_quantity: orderedQty,
          received_quantity: item.received_quantity,
          rejected_quantity: rejectedQty,
          unit_price: item.unit_price,
          total_cost: lineCost,
          remarks: item.remarks,
        });
      }

      const grnStatus = hasDiscrepancy ? 'ACCEPTED_WITH_DISCREPANCY' : 'ACCEPTED';

      this.db.run(
        `INSERT INTO goods_received_notes (
          grn_id, grn_number, po_id, po_number, supplier_id, supplier_name, invoice_ref_number, received_by, total_received_cost, status, discrepancy_note, received_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          grnId,
          grnNumber,
          input.po_id,
          poNumber,
          supplierId,
          supplierName,
          input.invoice_ref_number,
          input.received_by,
          totalReceivedCost,
          grnStatus,
          input.discrepancy_note || (hasDiscrepancy ? 'Variance between ordered and received quantities' : null)
        ]
      );

      for (const gi of grnItemsToInsert) {
        this.db.run(
          `INSERT INTO grn_items (
            grn_item_id, grn_id, ingredient_id, ingredient_name, unit, ordered_quantity, received_quantity, rejected_quantity, unit_price, total_cost, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            gi.grn_item_id,
            grnId,
            gi.ingredient_id,
            gi.ingredient_name,
            gi.unit,
            gi.ordered_quantity,
            gi.received_quantity,
            gi.rejected_quantity,
            gi.unit_price,
            gi.total_cost,
            gi.remarks || null
          ]
        );
      }

      // Check if all PO items are fully received
      const unfulfilledRes = this.db.exec(
        `SELECT COUNT(*) FROM purchase_order_items WHERE po_id = ? AND received_quantity < ordered_quantity`,
        [input.po_id]
      );
      const unfulfilledCount = Number(unfulfilledRes[0]?.values?.[0]?.[0]) || 0;
      const nextPoStatus = unfulfilledCount === 0 ? 'COMPLETED' : 'PARTIALLY_RECEIVED';

      this.db.run(
        `UPDATE purchase_orders
         SET status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE po_id = ?`,
        [nextPoStatus, input.po_id]
      );

      this.db.run('COMMIT');

      const fullGrn: GoodsReceivedNote = {
        grn_id: grnId,
        grn_number: grnNumber,
        po_id: input.po_id,
        po_number: poNumber,
        supplier_id: supplierId,
        supplier_name: supplierName,
        invoice_ref_number: input.invoice_ref_number,
        received_by: input.received_by,
        total_received_cost: totalReceivedCost,
        status: grnStatus,
        discrepancy_note: input.discrepancy_note,
        received_at: new Date().toISOString(),
        items: grnItemsToInsert,
      };

      // Spool GRN Inward Thermal Receipt
      const spoolJob = this.printerService.enqueueGrnReceipt(fullGrn);

      return {
        success: true,
        grn: fullGrn,
        spoolJob,
      };
    } catch (err: any) {
      try { this.db.run('ROLLBACK'); } catch {}
      console.error('[ProcurementService] GRN receive failed:', err);
      return { success: false, error: err.message || 'Failed to receive goods' };
    }
  }

  /**
   * Barcode scanner lookup for instant POS punch or GRN receiving
   */
  public searchByBarcode(barcode: string): { type: 'MENU_ITEM' | 'INGREDIENT' | 'NONE'; data?: any } {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return { type: 'NONE' };

    // Search inventory items first
    const ingRes = this.db.exec(
      `SELECT ingredient_id, name, unit, current_stock, cost_per_unit, barcode FROM inventory_items WHERE barcode = ? LIMIT 1`,
      [cleanBarcode]
    );
    if (ingRes[0] && ingRes[0].values && ingRes[0].values[0]) {
      const row = ingRes[0].values[0];
      return {
        type: 'INGREDIENT',
        data: {
          ingredient_id: String(row[0]),
          name: String(row[1]),
          unit: String(row[2]),
          current_stock: Number(row[3]),
          cost_per_unit: Number(row[4]),
          barcode: String(row[5]),
        }
      };
    }

    return { type: 'NONE' };
  }
}
