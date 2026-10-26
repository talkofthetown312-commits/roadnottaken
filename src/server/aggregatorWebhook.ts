import crypto from 'crypto';
import { Database } from 'sql.js';
import { OrderInput, WebhookLog } from './types.js';
import { OrderRepository } from './orderRepository.js';
import { ThermalPrinterService } from './printerService.js';
import { CloudSyncController } from './cloudSyncController.js';
import { CATALOG_ITEMS } from './db.js';

export class AggregatorWebhookEngine {
  private db: Database;
  private orderRepo: OrderRepository;
  private printerService: ThermalPrinterService;
  private cloudController: CloudSyncController;
  private readonly webhookSecrets = {
    ZOMATO: 'zomato_whsec_prod_9876543210',
    SWIGGY: 'swiggy_whsec_prod_1234567890'
  };

  constructor(
    db: Database,
    orderRepo: OrderRepository,
    printerService: ThermalPrinterService,
    cloudController: CloudSyncController
  ) {
    this.db = db;
    this.orderRepo = orderRepo;
    this.printerService = printerService;
    this.cloudController = cloudController;
  }

  /**
   * Generates a valid HMAC-SHA256 signature for testing / webhook simulation
   */
  public generateSignature(aggregator: 'ZOMATO' | 'SWIGGY', rawPayload: string): string {
    const secret = this.webhookSecrets[aggregator];
    return crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');
  }

  /**
   * Verifies timing-safe HMAC signature from aggregator webhook headers
   */
  public verifySignature(
    aggregator: 'ZOMATO' | 'SWIGGY',
    rawPayload: string,
    providedSignature: string
  ): boolean {
    const secret = this.webhookSecrets[aggregator];
    const expected = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');

    try {
      const bufA = Buffer.from(expected, 'hex');
      const bufB = Buffer.from(providedSignature, 'hex');
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  /**
   * Processes an incoming delivery order from Zomato / Swiggy
   */
  public processWebhook(
    aggregator: 'ZOMATO' | 'SWIGGY',
    payload: any,
    rawPayload: string,
    signature: string
  ): { success: boolean; order_id?: string; error?: string } {
    const isValid = this.verifySignature(aggregator, rawPayload, signature);
    const webhookId = `WH-${aggregator}-${Date.now()}`;
    const orderId = payload.order_id || crypto.randomUUID();

    if (!isValid) {
      this.logWebhook(webhookId, aggregator, rawPayload, false, orderId, 'REJECTED');
      return { success: false, error: 'Invalid HMAC-SHA256 signature' };
    }

    // Build canonical OrderInput
    const items = (payload.items || []).map((it: any, idx: number) => ({
      order_item_id: crypto.randomUUID(),
      item_id: it.item_id || `agg-item-${idx}`,
      item_name: it.item_name,
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price) || 200,
      sub_total: Number(it.sub_total) || Number(it.quantity) * Number(it.unit_price)
    }));

    const subTotal = items.reduce((acc: number, cur: any) => acc + cur.sub_total, 0);
    const taxTotal = Math.round(subTotal * 0.05 * 100) / 100;
    const discountTotal = Number(payload.discount_total) || 0;
    const grandTotal = subTotal + taxTotal - discountTotal;

    const canonicalOrder: OrderInput = {
      order_id: orderId,
      outlet_id: payload.outlet_id || 'OUTLET-IMF-01',
      terminal_id: `AGGREGATOR-${aggregator}`,
      invoice_number: payload.invoice_number || `${aggregator.slice(0, 3)}-${Date.now().toString().slice(-6)}`,
      order_status: 'PREPARING',
      order_type: 'DELIVERY',
      payment_method: 'AGGREGATOR',
      sub_total: subTotal,
      tax_total: taxTotal,
      discount_total: discountTotal,
      grand_total: grandTotal,
      items
    };

    // 1. Commit to Cloud Core
    this.cloudController.ingestBatch('merch-sapphire-corp-01', [
      {
        ...canonicalOrder,
        payment_method: 'AGGREGATOR',
        sync_status: 'SYNCED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]);

    // 2. Downlink to Local Edge with sync_status = 'SYNCED' (so Edge does not redundantly resync)
    this.orderRepo.createOrder(canonicalOrder, true, 'SYNCED');

    // 3. Auto-spool Kitchen KOT immediately
    this.printerService.enqueueKOT(
      canonicalOrder,
      `Online Aggregator Station (${aggregator} Dispatch)`
    );

    this.logWebhook(webhookId, aggregator, rawPayload, true, orderId, 'PROCESSED');

    return {
      success: true,
      order_id: orderId
    };
  }

  /**
   * Simulates a live incoming Zomato / Swiggy delivery order
   */
  public simulateIncomingOrder(aggregator: 'ZOMATO' | 'SWIGGY'): {
    success: boolean;
    order: OrderInput;
    signature: string;
  } {
    const randomItems = [
      CATALOG_ITEMS[0] || CATALOG_ITEMS[0], // Veg Chowmein (Small)
      CATALOG_ITEMS[6] || CATALOG_ITEMS[0], // Chicken Chowmein (Small)
      CATALOG_ITEMS[15] || CATALOG_ITEMS[0] // Veg Fried Rice (Small)
    ].filter(Boolean);

    const orderId = crypto.randomUUID();
    const invoiceNum = `${aggregator.slice(0, 3)}-${Math.floor(100000 + Math.random() * 900000)}`;

    const items = randomItems.map((menuItem) => ({
      order_item_id: crypto.randomUUID(),
      item_id: menuItem.item_id,
      item_name: menuItem.name,
      quantity: 1,
      unit_price: menuItem.price,
      sub_total: menuItem.price
    }));

    const rawPayloadObj = {
      aggregator,
      order_id: orderId,
      outlet_id: 'OUTLET-IMF-01',
      invoice_number: invoiceNum,
      customer_name: aggregator === 'ZOMATO' ? 'L. Sanjit Singh' : 'T. Bimola Devi',
      delivery_address: 'Thangal Bazaar, Imphal, Manipur',
      items,
      discount_total: aggregator === 'ZOMATO' ? 20 : 10
    };

    const rawPayload = JSON.stringify(rawPayloadObj);
    const signature = this.generateSignature(aggregator, rawPayload);

    this.processWebhook(aggregator, rawPayloadObj, rawPayload, signature);

    return {
      success: true,
      order: {
        order_id: orderId,
        outlet_id: 'OUTLET-IMF-01',
        terminal_id: `AGGREGATOR-${aggregator}`,
        invoice_number: invoiceNum,
        order_status: 'PREPARING',
        order_type: 'DELIVERY',
        sub_total: items.reduce((a, b) => a + b.sub_total, 0),
        tax_total: Math.round(items.reduce((a, b) => a + b.sub_total, 0) * 0.05 * 100) / 100,
        discount_total: rawPayloadObj.discount_total,
        grand_total:
          items.reduce((a, b) => a + b.sub_total, 0) * 1.05 - rawPayloadObj.discount_total,
        items
      },
      signature
    };
  }

  private logWebhook(
    webhookId: string,
    aggregator: string,
    payloadJson: string,
    isValid: boolean,
    orderId: string,
    status: string
  ): void {
    this.db.run(
      `INSERT INTO webhook_logs (webhook_id, aggregator, payload_json, signature_valid, order_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [webhookId, aggregator, payloadJson, isValid ? 1 : 0, orderId, status]
    );
  }

  public getLogs(limit: number = 20): WebhookLog[] {
    const res = this.db.exec(
      `SELECT webhook_id, aggregator, payload_json, signature_valid, order_id, status, created_at
       FROM webhook_logs
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    );

    if (!res[0] || !res[0].values) return [];

    return res[0].values.map((row) => ({
      webhook_id: String(row[0]),
      aggregator: row[1] as any,
      payload_json: String(row[2]),
      signature_valid: Number(row[3]) === 1,
      order_id: String(row[4]),
      status: row[5] as any,
      created_at: String(row[6])
    }));
  }
}
