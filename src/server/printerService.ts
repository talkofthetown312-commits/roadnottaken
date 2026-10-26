import { Database } from 'sql.js';
import { OrderInput, PrintSpoolJob } from './types.js';
import { EscPosBuilder } from './escPosBuilder.js';

export class ThermalPrinterService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  private getOutletHeader(): { name: string; address: string; gstin: string } {
    try {
      const res = this.db.exec(
        `SELECT restaurant_name, outlet_name, address, gstin FROM restaurant_profile LIMIT 1`
      );
      if (res[0] && res[0].values && res[0].values[0]) {
        const row = res[0].values[0];
        return {
          name: `${String(row[0])} (${String(row[1])})`,
          address: String(row[2]),
          gstin: String(row[3])
        };
      }
    } catch {}

    return {
      name: 'The Rustic Table Bistro (Central Outlet)',
      address: '12 Brigade Road, Bengaluru, KA 560001',
      gstin: '29AABCR8877P1ZV'
    };
  }

  /**
   * Spools a Kitchen Order Ticket (KOT)
   */
  public enqueueKOT(order: OrderInput, targetPrinter: string = 'Main Kitchen KOT (LAN 192.168.1.201:9100)'): PrintSpoolJob {
    const { formattedText, hexPreview } = EscPosBuilder.buildKOT(order);
    const jobId = `KOT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    this.db.run(
      `INSERT INTO print_spool_jobs (
        job_id, order_id, job_type, target_printer, status, formatted_text, hex_preview, created_at
      ) VALUES (?, ?, 'KOT', ?, 'SENT', ?, ?, CURRENT_TIMESTAMP)`,
      [jobId, order.order_id, targetPrinter, formattedText, hexPreview]
    );

    return {
      job_id: jobId,
      order_id: order.order_id,
      job_type: 'KOT',
      target_printer: targetPrinter,
      status: 'SENT',
      formatted_text: formattedText,
      hex_preview: hexPreview,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Spools a Customer Tax Receipt
   */
  public enqueueReceipt(order: OrderInput, targetPrinter: string = 'Cashier Receipt Printer (USB-001)'): PrintSpoolJob {
    const header = this.getOutletHeader();
    const { formattedText, hexPreview } = EscPosBuilder.buildReceipt(order, header);
    const jobId = `RCPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    this.db.run(
      `INSERT INTO print_spool_jobs (
        job_id, order_id, job_type, target_printer, status, formatted_text, hex_preview, created_at
      ) VALUES (?, ?, 'RECEIPT', ?, 'SENT', ?, ?, CURRENT_TIMESTAMP)`,
      [jobId, order.order_id, targetPrinter, formattedText, hexPreview]
    );

    return {
      job_id: jobId,
      order_id: order.order_id,
      job_type: 'RECEIPT',
      target_printer: targetPrinter,
      status: 'SENT',
      formatted_text: formattedText,
      hex_preview: hexPreview,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Spools a Goods Received Note (GRN) Inward Slip
   */
  public enqueueGrnReceipt(
    grn: import('./types.js').GoodsReceivedNote,
    targetPrinter: string = 'Inventory Receiving Printer (LAN 192.168.1.205)'
  ): PrintSpoolJob {
    const header = this.getOutletHeader();
    const { formattedText, hexPreview } = EscPosBuilder.buildGrnReceipt(grn, header);
    const jobId = `GRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    this.db.run(
      `INSERT INTO print_spool_jobs (
        job_id, order_id, job_type, target_printer, status, formatted_text, hex_preview, created_at
      ) VALUES (?, ?, 'GRN_RECEIPT', ?, 'SENT', ?, ?, CURRENT_TIMESTAMP)`,
      [jobId, grn.grn_id, targetPrinter, formattedText, hexPreview]
    );

    return {
      job_id: jobId,
      order_id: grn.grn_id,
      job_type: 'GRN_RECEIPT',
      target_printer: targetPrinter,
      status: 'SENT',
      formatted_text: formattedText,
      hex_preview: hexPreview,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Spools an official Day-End Z-Report
   */
  public enqueueZReport(
    shiftId: string,
    zReportNumber: string,
    formattedText: string,
    hexPreview: string,
    targetPrinter: string = 'Cashier Audit Printer (Thermal 80mm)'
  ): PrintSpoolJob {
    const jobId = `ZREP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    this.db.run(
      `INSERT INTO print_spool_jobs (
        job_id, order_id, job_type, target_printer, status, formatted_text, hex_preview, created_at
      ) VALUES (?, ?, 'Z_REPORT', ?, 'SENT', ?, ?, CURRENT_TIMESTAMP)`,
      [jobId, shiftId, targetPrinter, formattedText, hexPreview]
    );

    return {
      job_id: jobId,
      order_id: shiftId,
      job_type: 'Z_REPORT',
      target_printer: targetPrinter,
      status: 'SENT',
      formatted_text: formattedText,
      hex_preview: hexPreview,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Returns recent spool jobs
   */
  public getRecentJobs(limit: number = 20): PrintSpoolJob[] {
    const res = this.db.exec(
      `SELECT job_id, order_id, job_type, target_printer, status, formatted_text, hex_preview, created_at
       FROM print_spool_jobs
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    );

    if (!res[0] || !res[0].values) return [];

    return res[0].values.map((row) => ({
      job_id: String(row[0]),
      order_id: String(row[1]),
      job_type: row[2] as any,
      target_printer: String(row[3]),
      status: row[4] as any,
      formatted_text: String(row[5]),
      hex_preview: String(row[6]),
      created_at: String(row[7])
    }));
  }
}
