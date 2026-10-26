import { Database } from 'sql.js';
import { CashAdjustment, CashierShift } from './types.js';
import { EscPosBuilder } from './escPosBuilder.js';
import { ThermalPrinterService } from './printerService.js';

export class ShiftService {
  private db: Database;
  private printerService: ThermalPrinterService;

  constructor(db: Database, printerService: ThermalPrinterService) {
    this.db = db;
    this.printerService = printerService;
  }

  /**
   * Returns active shift for a terminal, computing real-time live sales figures
   */
  public getActiveShift(terminalId: string = 'POS-01'): CashierShift | null {
    const res = this.db.exec(
      `SELECT shift_id, terminal_id, cashier_name, status, opening_float,
              cash_in_total, cash_out_total, cash_sales, upi_sales, card_sales,
              aggregator_sales, total_sales, order_count, expected_cash,
              actual_cash_counted, variance, variance_reason, z_report_number,
              z_report_text, opened_at, closed_at, sync_status
       FROM cashier_shifts
       WHERE terminal_id = ? AND status = 'OPEN'
       ORDER BY opened_at DESC LIMIT 1`,
      [terminalId]
    );

    if (!res[0] || !res[0].values || res[0].values.length === 0) {
      return null;
    }

    const row = res[0].values[0];
    const shiftId = String(row[0]);
    const openedAt = String(row[19]);
    const openingFloat = Number(row[4]);

    // Compute live sales from orders table since shift opened
    const salesRes = this.db.exec(
      `SELECT 
         COUNT(*) as order_count,
         SUM(grand_total) as total_sales,
         SUM(CASE WHEN payment_method = 'CASH' THEN grand_total ELSE 0 END) as cash_sales,
         SUM(CASE WHEN payment_method = 'UPI' THEN grand_total ELSE 0 END) as upi_sales,
         SUM(CASE WHEN payment_method = 'CARD' THEN grand_total ELSE 0 END) as card_sales,
         SUM(CASE WHEN payment_method = 'AGGREGATOR' THEN grand_total ELSE 0 END) as agg_sales
       FROM orders
       WHERE terminal_id = ? AND created_at >= ? AND order_status != 'CANCELLED'`,
      [terminalId, openedAt]
    );

    const sRow = salesRes[0]?.values[0] || [0, 0, 0, 0, 0, 0];
    const orderCount = Number(sRow[0]) || 0;
    const totalSales = Number(sRow[1]) || 0;
    const cashSales = Number(sRow[2]) || 0;
    const upiSales = Number(sRow[3]) || 0;
    const cardSales = Number(sRow[4]) || 0;
    const aggSales = Number(sRow[5]) || 0;

    // Compute live petty cash adjustments (Cash-In vs Cash-Out drops)
    const adjRes = this.db.exec(
      `SELECT 
         SUM(CASE WHEN type = 'CASH_IN' THEN amount ELSE 0 END) as cash_in,
         SUM(CASE WHEN type = 'CASH_OUT' THEN amount ELSE 0 END) as cash_out
       FROM shift_cash_adjustments
       WHERE shift_id = ?`,
      [shiftId]
    );

    const aRow = adjRes[0]?.values[0] || [0, 0];
    const cashInTotal = Number(aRow[0]) || 0;
    const cashOutTotal = Number(aRow[1]) || 0;

    const expectedCash = openingFloat + cashSales + cashInTotal - cashOutTotal;

    return {
      shift_id: shiftId,
      terminal_id: String(row[1]),
      cashier_name: String(row[2]),
      status: 'OPEN',
      opening_float: openingFloat,
      cash_in_total: cashInTotal,
      cash_out_total: cashOutTotal,
      cash_sales: cashSales,
      upi_sales: upiSales,
      card_sales: cardSales,
      aggregator_sales: aggSales,
      total_sales: totalSales,
      order_count: orderCount,
      expected_cash: expectedCash,
      actual_cash_counted: 0,
      variance: 0,
      opened_at: openedAt,
      sync_status: 'PENDING'
    };
  }

  /**
   * Opens a new shift for a cashier terminal
   */
  public openShift(terminalId: string, cashierName: string, openingFloat: number): CashierShift {
    // Ensure no existing shift is open on this terminal
    const existing = this.getActiveShift(terminalId);
    if (existing) {
      throw new Error(`Terminal ${terminalId} already has an active shift (${existing.shift_id}). Close it first.`);
    }

    const shiftId = `shift-${Date.now().toString().slice(-8)}`;
    this.db.run(
      `INSERT INTO cashier_shifts (
        shift_id, terminal_id, cashier_name, status, opening_float,
        expected_cash, opened_at, sync_status
      ) VALUES (?, ?, ?, 'OPEN', ?, ?, CURRENT_TIMESTAMP, 'PENDING')`,
      [shiftId, terminalId, cashierName, openingFloat, openingFloat]
    );

    return this.getActiveShift(terminalId)!;
  }

  /**
   * Records a petty cash adjustment (Cash In / Cash Out)
   */
  public recordAdjustment(
    shiftId: string,
    type: 'CASH_IN' | 'CASH_OUT',
    amount: number,
    reason: string
  ): CashAdjustment {
    const adjId = `adj-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    this.db.run(
      `INSERT INTO shift_cash_adjustments (adjustment_id, shift_id, type, amount, reason, created_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [adjId, shiftId, type, amount, reason]
    );

    return {
      adjustment_id: adjId,
      shift_id: shiftId,
      type,
      amount,
      reason,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Fetches petty cash adjustments for a shift
   */
  public getAdjustments(shiftId: string): CashAdjustment[] {
    const res = this.db.exec(
      `SELECT adjustment_id, shift_id, type, amount, reason, created_at
       FROM shift_cash_adjustments
       WHERE shift_id = ?
       ORDER BY created_at DESC`,
      [shiftId]
    );

    if (!res[0] || !res[0].values) return [];

    return res[0].values.map((row) => ({
      adjustment_id: String(row[0]),
      shift_id: String(row[1]),
      type: row[2] as any,
      amount: Number(row[3]),
      reason: String(row[4]),
      created_at: String(row[5])
    }));
  }

  /**
   * Closes the shift via Blind Cash Drop, computes variance, generates Z-Report slip,
   * spools the official printout, and locks the shift in SQLite.
   */
  public executeBlindDropAndCloseShift(
    shiftId: string,
    actualCashCounted: number,
    varianceReason?: string
  ): { shift: CashierShift; zReportFormatted: string; hexPreview: string } {
    const shift = this.getActiveShift();
    if (!shift || shift.shift_id !== shiftId) {
      throw new Error('Shift not found or already closed');
    }

    const variance = actualCashCounted - shift.expected_cash;
    const zReportNumber = `Z-REP-${Date.now().toString().slice(-6)}`;
    const closedAt = new Date().toISOString();

    const finalizedShift: CashierShift = {
      ...shift,
      status: 'CLOSED',
      actual_cash_counted: actualCashCounted,
      variance,
      variance_reason: varianceReason || (variance === 0 ? 'Exact match' : 'Unspecified discrepancy'),
      z_report_number: zReportNumber,
      closed_at: closedAt
    };

    // Build official ESC/POS Z-Report layout
    const { formattedText, hexPreview } = EscPosBuilder.buildZReport(finalizedShift);
    finalizedShift.z_report_text = formattedText;

    // Update SQLite shift row
    this.db.run(
      `UPDATE cashier_shifts SET
        status = 'CLOSED',
        cash_in_total = ?,
        cash_out_total = ?,
        cash_sales = ?,
        upi_sales = ?,
        card_sales = ?,
        aggregator_sales = ?,
        total_sales = ?,
        order_count = ?,
        expected_cash = ?,
        actual_cash_counted = ?,
        variance = ?,
        variance_reason = ?,
        z_report_number = ?,
        z_report_text = ?,
        closed_at = CURRENT_TIMESTAMP,
        sync_status = 'PENDING'
       WHERE shift_id = ?`,
      [
        shift.cash_in_total,
        shift.cash_out_total,
        shift.cash_sales,
        shift.upi_sales,
        shift.card_sales,
        shift.aggregator_sales,
        shift.total_sales,
        shift.order_count,
        shift.expected_cash,
        actualCashCounted,
        variance,
        finalizedShift.variance_reason || null,
        zReportNumber,
        formattedText,
        shiftId
      ]
    );

    // Spool official Z-Report to the thermal printer
    this.printerService.enqueueZReport(
      shiftId,
      zReportNumber,
      formattedText,
      hexPreview
    );

    return {
      shift: finalizedShift,
      zReportFormatted: formattedText,
      hexPreview
    };
  }

  /**
   * Returns shift history (closed and open shifts)
   */
  public getShiftHistory(limit: number = 15): CashierShift[] {
    const res = this.db.exec(
      `SELECT shift_id, terminal_id, cashier_name, status, opening_float,
              cash_in_total, cash_out_total, cash_sales, upi_sales, card_sales,
              aggregator_sales, total_sales, order_count, expected_cash,
              actual_cash_counted, variance, variance_reason, z_report_number,
              z_report_text, opened_at, closed_at, sync_status
       FROM cashier_shifts
       ORDER BY opened_at DESC LIMIT ?`,
      [limit]
    );

    if (!res[0] || !res[0].values) return [];

    return res[0].values.map((row) => ({
      shift_id: String(row[0]),
      terminal_id: String(row[1]),
      cashier_name: String(row[2]),
      status: row[3] as any,
      opening_float: Number(row[4]),
      cash_in_total: Number(row[5]),
      cash_out_total: Number(row[6]),
      cash_sales: Number(row[7]),
      upi_sales: Number(row[8]),
      card_sales: Number(row[9]),
      aggregator_sales: Number(row[10]),
      total_sales: Number(row[11]),
      order_count: Number(row[12]),
      expected_cash: Number(row[13]),
      actual_cash_counted: Number(row[14]),
      variance: Number(row[15]),
      variance_reason: row[16] ? String(row[16]) : undefined,
      z_report_number: row[17] ? String(row[17]) : undefined,
      z_report_text: row[18] ? String(row[18]) : undefined,
      opened_at: String(row[19]),
      closed_at: row[20] ? String(row[20]) : undefined,
      sync_status: row[21] as any
    }));
  }
}
