import { OrderInput, OrderItemInput } from './types.js';

export type PaperWidthChars = 48 | 32;

export class EscPosBuilder {
  private chunks: Buffer[] = [];
  private readonly width: PaperWidthChars;

  public static readonly CMD = {
    INIT: Buffer.from([0x1b, 0x40]),                        // ESC @
    ALIGN_LEFT: Buffer.from([0x1b, 0x61, 0x00]),            // ESC a 0
    ALIGN_CENTER: Buffer.from([0x1b, 0x61, 0x01]),          // ESC a 1
    ALIGN_RIGHT: Buffer.from([0x1b, 0x61, 0x02]),           // ESC a 2
    BOLD_ON: Buffer.from([0x1b, 0x45, 0x01]),               // ESC E 1
    BOLD_OFF: Buffer.from([0x1b, 0x45, 0x00]),              // ESC E 0
    TEXT_NORMAL: Buffer.from([0x1d, 0x21, 0x00]),           // GS ! 0x00
    TEXT_DOUBLE_HEIGHT: Buffer.from([0x1d, 0x21, 0x01]),    // GS ! 0x01
    TEXT_DOUBLE_BOTH: Buffer.from([0x1d, 0x21, 0x11]),      // GS ! 0x11
    BEEPER: Buffer.from([0x1b, 0x42, 0x03, 0x02]),          // ESC B 3 2
    CUT_PARTIAL: Buffer.from([0x1d, 0x56, 0x42, 0x00]),     // GS V 66 0
    CASH_DRAWER_KICK: Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]), // ESC p
    LF: Buffer.from([0x0a]),
  };

  constructor(paperWidth: PaperWidthChars = 48) {
    this.width = paperWidth;
    this.raw(EscPosBuilder.CMD.INIT);
  }

  public raw(buf: Buffer): this {
    this.chunks.push(buf);
    return this;
  }

  public align(mode: 'LEFT' | 'CENTER' | 'RIGHT'): this {
    if (mode === 'CENTER') this.raw(EscPosBuilder.CMD.ALIGN_CENTER);
    else if (mode === 'RIGHT') this.raw(EscPosBuilder.CMD.ALIGN_RIGHT);
    else this.raw(EscPosBuilder.CMD.ALIGN_LEFT);
    return this;
  }

  public bold(enabled: boolean): this {
    return this.raw(enabled ? EscPosBuilder.CMD.BOLD_ON : EscPosBuilder.CMD.BOLD_OFF);
  }

  public size(mode: 'NORMAL' | 'DOUBLE_HEIGHT' | 'DOUBLE_BOTH'): this {
    if (mode === 'DOUBLE_BOTH') return this.raw(EscPosBuilder.CMD.TEXT_DOUBLE_BOTH);
    if (mode === 'DOUBLE_HEIGHT') return this.raw(EscPosBuilder.CMD.TEXT_DOUBLE_HEIGHT);
    return this.raw(EscPosBuilder.CMD.TEXT_NORMAL);
  }

  public textLine(text: string = ''): this {
    this.chunks.push(Buffer.from(text, 'utf-8'));
    this.raw(EscPosBuilder.CMD.LF);
    return this;
  }

  public divider(char: '-' | '=' = '-'): this {
    return this.textLine(char.repeat(this.width));
  }

  public keyValueLine(left: string, right: string): this {
    const spaceCount = Math.max(1, this.width - left.length - right.length);
    return this.textLine(`${left}${' '.repeat(spaceCount)}${right}`);
  }

  public itemRow(name: string, qty: number, lineTotal: number): this {
    const qtyStr = String(qty).padStart(4, ' ');
    const totalStr = lineTotal.toFixed(2).padStart(10, ' ');
    const nameMaxWidth = this.width - qtyStr.length - totalStr.length - 2;

    const wrappedLines: string[] = [];
    for (let i = 0; i < name.length; i += nameMaxWidth) {
      wrappedLines.push(name.slice(i, i + nameMaxWidth));
    }

    const firstLineName = (wrappedLines[0] || '').padEnd(nameMaxWidth, ' ');
    this.textLine(`${firstLineName} ${qtyStr} ${totalStr}`);

    for (let i = 1; i < wrappedLines.length; i++) {
      this.textLine(wrappedLines[i]);
    }
    return this;
  }

  public beep(): this {
    return this.raw(EscPosBuilder.CMD.BEEPER);
  }

  public openCashDrawer(): this {
    return this.raw(EscPosBuilder.CMD.CASH_DRAWER_KICK);
  }

  public cut(): this {
    this.textLine();
    this.textLine();
    return this.raw(EscPosBuilder.CMD.CUT_PARTIAL);
  }

  public build(): Buffer {
    return Buffer.concat(this.chunks);
  }

  /**
   * Builds Kitchen Order Ticket (KOT) payload
   */
  public static buildKOT(
    order: OrderInput,
    stationName: string = 'MAIN KITCHEN'
  ): { buffer: Buffer; formattedText: string; hexPreview: string } {
    const builder = new EscPosBuilder(48);

    builder
      .beep()
      .align('CENTER')
      .bold(true)
      .size('DOUBLE_BOTH')
      .textLine(`KOT - ${order.order_type}`)
      .size('NORMAL')
      .textLine(`[ ${stationName} ]`)
      .divider('=')
      .align('LEFT')
      .bold(true)
      .keyValueLine(`Invoice: ${order.invoice_number}`, `Terminal: ${order.terminal_id}`)
      .bold(false)
      .keyValueLine(`Time: ${new Date().toLocaleTimeString()}`, `Items: ${order.items.length}`)
      .divider('-')
      .bold(true)
      .keyValueLine('ITEM NAME', 'QTY')
      .bold(false)
      .divider('-');

    for (const item of order.items) {
      builder
        .bold(true)
        .size('DOUBLE_HEIGHT')
        .keyValueLine(item.item_name.slice(0, 38), `x${item.quantity}`)
        .size('NORMAL')
        .bold(false);
    }

    builder.divider('=').cut();
    const buffer = builder.build();

    // Generate human-readable monospace text representation
    const lines = [
      `================================================`,
      `              KOT - ${order.order_type}              `,
      `               [ ${stationName} ]               `,
      `================================================`,
      `Invoice: ${order.invoice_number.padEnd(20)} Terminal: ${order.terminal_id}`,
      `Time: ${new Date().toLocaleTimeString().padEnd(23)} Items: ${order.items.length}`,
      `------------------------------------------------`,
      `ITEM NAME                                    QTY`,
      `------------------------------------------------`,
      ...order.items.map(
        (i) => `${i.item_name.padEnd(42)} x${String(i.quantity).padStart(3)}`
      ),
      `================================================`,
      `[ PAPER CUT / KITCHEN AUDIBLE BEEP TRIGGERED ]`
    ];

    const hexPreview = buffer.slice(0, 64).toString('hex').toUpperCase().match(/.{1,2}/g)?.join(' ') + ' ...';

    return {
      buffer,
      formattedText: lines.join('\n'),
      hexPreview
    };
  }

  /**
   * Builds Customer Receipt payload with Tax Invoice & Cash Drawer kick pulse
   */
  public static buildReceipt(
    order: OrderInput,
    outletHeader: { name: string; address: string; gstin: string }
  ): { buffer: Buffer; formattedText: string; hexPreview: string } {
    const builder = new EscPosBuilder(48);

    builder
      .openCashDrawer()
      .align('CENTER')
      .bold(true)
      .size('DOUBLE_HEIGHT')
      .textLine(outletHeader.name)
      .size('NORMAL')
      .bold(false)
      .textLine(outletHeader.address)
      .textLine(`GSTIN: ${outletHeader.gstin}`)
      .divider('=')
      .align('LEFT')
      .keyValueLine(`Bill No: ${order.invoice_number}`, `Type: ${order.order_type}`)
      .keyValueLine(`Date: ${new Date().toLocaleDateString()}`, `Time: ${new Date().toLocaleTimeString()}`)
      .divider('-')
      .bold(true)
      .textLine(`${'ITEM'.padEnd(32, ' ')} ${'QTY'.padStart(4, ' ')} ${'AMOUNT'.padStart(10, ' ')}`)
      .bold(false)
      .divider('-');

    for (const item of order.items) {
      builder.itemRow(item.item_name, item.quantity, item.sub_total);
    }

    builder
      .divider('-')
      .keyValueLine('Sub Total:', `Rs. ${order.sub_total.toFixed(2)}`)
      .keyValueLine('Discount Total:', `-Rs. ${order.discount_total.toFixed(2)}`)
      .keyValueLine('GST Tax Total (5%):', `Rs. ${order.tax_total.toFixed(2)}`)
      .divider('=')
      .bold(true)
      .size('DOUBLE_HEIGHT')
      .keyValueLine('GRAND TOTAL:', `Rs. ${order.grand_total.toFixed(2)}`)
      .size('NORMAL')
      .bold(false)
      .divider('=')
      .align('CENTER')
      .textLine('*** Thank You! Please Visit Again ***')
      .cut();

    const buffer = builder.build();

    const extraMetaLines: string[] = [];
    if (order.customer_name || order.customer_phone) {
      extraMetaLines.push(
        `Guest: ${(order.customer_name || 'Guest').slice(0, 22).padEnd(22)} Ph: ${order.customer_phone || '-'}`
      );
    }
    if (order.payment_method) {
      extraMetaLines.push(
        `Tender: ${order.payment_method.padEnd(21)} ${order.upi_utr_reference ? `UTR: ${order.upi_utr_reference}` : ''}`.trimEnd()
      );
    }
    if ((order.loyalty_points_redeemed || 0) > 0 || (order.loyalty_points_earned || 0) > 0) {
      extraMetaLines.push(
        `Loyalty Redeemed: -${String(order.loyalty_points_redeemed || 0).padEnd(9)} Earned: +${order.loyalty_points_earned || 0} pts`
      );
    }

    const lines = [
      `================================================`,
      `               ${outletHeader.name}               `,
      `         ${outletHeader.address}         `,
      `              GSTIN: ${outletHeader.gstin}             `,
      `================================================`,
      `Bill: ${order.invoice_number.padEnd(23)} Type: ${order.order_type}`,
      `Date: ${new Date().toLocaleDateString().padEnd(23)} Time: ${new Date().toLocaleTimeString()}`,
      ...extraMetaLines,
      `------------------------------------------------`,
      `ITEM                             QTY      AMOUNT`,
      `------------------------------------------------`,
      ...order.items.map(
        (i) => `${i.item_name.padEnd(31)} ${String(i.quantity).padStart(4)} ${i.sub_total.toFixed(2).padStart(11)}`
      ),
      `------------------------------------------------`,
      `Sub Total:                          Rs. ${order.sub_total.toFixed(2).padStart(8)}`,
      `Discount:                          -Rs. ${order.discount_total.toFixed(2).padStart(8)}`,
      `GST Tax (5%):                       Rs. ${order.tax_total.toFixed(2).padStart(8)}`,
      `================================================`,
      `GRAND TOTAL:                        Rs. ${order.grand_total.toFixed(2).padStart(8)}`,
      `================================================`,
      `      *** Thank You! Please Visit Again ***     `,
      `[ RJ11 CASH DRAWER PIN-2 PULSE SENT / CUT FED ]`
    ];

    const hexPreview = buffer.slice(0, 64).toString('hex').toUpperCase().match(/.{1,2}/g)?.join(' ') + ' ...';

    return {
      buffer,
      formattedText: lines.join('\n'),
      hexPreview
    };
  }

  /**
   * Builds official immutable Day-End Z-Report audit slip
   */
  public static buildZReport(shift: import('./types.js').CashierShift): {
    buffer: Buffer;
    formattedText: string;
    hexPreview: string;
  } {
    const builder = new EscPosBuilder(48);

    builder
      .beep()
      .align('CENTER')
      .bold(true)
      .size('DOUBLE_BOTH')
      .textLine('*** Z-REPORT ***')
      .size('NORMAL')
      .textLine('OFFICIAL SHIFT CLOSING AUDIT')
      .textLine(`Z-Report No: ${shift.z_report_number || 'Z-REP-AUTO'}`)
      .divider('=')
      .align('LEFT')
      .keyValueLine(`Terminal: ${shift.terminal_id}`, `Shift: ${shift.shift_id.slice(-8)}`)
      .keyValueLine(`Cashier: ${shift.cashier_name}`, '')
      .keyValueLine(`Opened: ${new Date(shift.opened_at).toLocaleTimeString()}`, `Closed: ${new Date().toLocaleTimeString()}`)
      .divider('=')
      .bold(true)
      .textLine('--- SALES TENDER BREAKDOWN ---')
      .bold(false)
      .keyValueLine('Cash Tender Sales:', `Rs. ${shift.cash_sales.toFixed(2)}`)
      .keyValueLine('UPI / QR Sales:', `Rs. ${shift.upi_sales.toFixed(2)}`)
      .keyValueLine('Card Sales (POS):', `Rs. ${shift.card_sales.toFixed(2)}`)
      .keyValueLine('Aggregator (Prepaid):', `Rs. ${shift.aggregator_sales.toFixed(2)}`)
      .divider('-')
      .bold(true)
      .size('DOUBLE_HEIGHT')
      .keyValueLine('TOTAL NET SALES:', `Rs. ${shift.total_sales.toFixed(2)}`)
      .size('NORMAL')
      .bold(false)
      .keyValueLine('Total Billed Orders:', String(shift.order_count))
      .divider('=')
      .bold(true)
      .textLine('--- CASH DRAWER RECONCILIATION ---')
      .bold(false)
      .keyValueLine('Opening Cash Float:', `Rs. ${shift.opening_float.toFixed(2)}`)
      .keyValueLine('+ Cash Sales Inward:', `Rs. ${shift.cash_sales.toFixed(2)}`)
      .keyValueLine('+ Petty Cash In Drops:', `Rs. ${shift.cash_in_total.toFixed(2)}`)
      .keyValueLine('- Petty Cash Out Drops:', `-Rs. ${shift.cash_out_total.toFixed(2)}`)
      .divider('-')
      .bold(true)
      .keyValueLine('SYSTEM EXPECTED CASH:', `Rs. ${shift.expected_cash.toFixed(2)}`)
      .keyValueLine('ACTUAL BLIND CASH DROP:', `Rs. ${shift.actual_cash_counted.toFixed(2)}`)
      .bold(false)
      .divider('=');

    if (Math.abs(shift.variance) < 0.01) {
      builder.bold(true).textLine('VARIANCE STATUS: [ EXACT MATCH - ZERO LEAKAGE ]').bold(false);
    } else if (shift.variance > 0) {
      builder.bold(true).textLine(`VARIANCE: CASH OVER +Rs. ${shift.variance.toFixed(2)}`).bold(false);
    } else {
      builder.bold(true).textLine(`VARIANCE: CASH SHORT -Rs. ${Math.abs(shift.variance).toFixed(2)}`).bold(false);
    }

    if (shift.variance_reason) {
      builder.textLine(`Reason / Note: ${shift.variance_reason}`);
    }

    builder
      .divider('=')
      .align('CENTER')
      .textLine('Cashier Signature: __________________')
      .textLine('Manager Signature: __________________')
      .textLine('--- IMMUTABLE REGISTER AUDIT LOGGED ---')
      .cut();

    const buffer = builder.build();

    const lines = [
      `================================================`,
      `                *** Z-REPORT ***                `,
      `          OFFICIAL SHIFT CLOSING AUDIT          `,
      `          Z-Report No: ${shift.z_report_number || 'Z-REP-AUTO'}          `,
      `================================================`,
      `Terminal: ${shift.terminal_id.padEnd(20)} Shift: ${shift.shift_id.slice(-8)}`,
      `Cashier: ${shift.cashier_name}`,
      `Opened: ${new Date(shift.opened_at).toLocaleTimeString().padEnd(20)} Closed: ${new Date().toLocaleTimeString()}`,
      `================================================`,
      `--- SALES TENDER BREAKDOWN ---`,
      `Cash Tender Sales:                   Rs. ${shift.cash_sales.toFixed(2).padStart(8)}`,
      `UPI / QR Sales:                      Rs. ${shift.upi_sales.toFixed(2).padStart(8)}`,
      `Card Sales (POS):                    Rs. ${shift.card_sales.toFixed(2).padStart(8)}`,
      `Aggregator (Prepaid):                Rs. ${shift.aggregator_sales.toFixed(2).padStart(8)}`,
      `------------------------------------------------`,
      `TOTAL NET SALES:                     Rs. ${shift.total_sales.toFixed(2).padStart(8)}`,
      `Total Billed Orders:                 ${String(shift.order_count).padStart(12)}`,
      `================================================`,
      `--- CASH DRAWER RECONCILIATION ---`,
      `Opening Cash Float:                  Rs. ${shift.opening_float.toFixed(2).padStart(8)}`,
      `+ Cash Sales Inward:                 Rs. ${shift.cash_sales.toFixed(2).padStart(8)}`,
      `+ Petty Cash In Drops:               Rs. ${shift.cash_in_total.toFixed(2).padStart(8)}`,
      `- Petty Cash Out Drops:             -Rs. ${shift.cash_out_total.toFixed(2).padStart(8)}`,
      `------------------------------------------------`,
      `SYSTEM EXPECTED CASH:                Rs. ${shift.expected_cash.toFixed(2).padStart(8)}`,
      `ACTUAL BLIND CASH DROP:              Rs. ${shift.actual_cash_counted.toFixed(2).padStart(8)}`,
      `------------------------------------------------`,
      `CASH VARIANCE:                       Rs. ${shift.variance.toFixed(2).padStart(8)}`,
      `Audit Status: ${Math.abs(shift.variance) < 0.01 ? 'EXACT MATCH' : shift.variance > 0 ? 'OVERAGE' : 'SHORTAGE'}`,
      `Note: ${shift.variance_reason || 'None provided'}`,
      `================================================`,
      `Cashier Signature: __________________`,
      `Manager Signature: __________________`,
      `[ REGISTER AUDIT RECORD COMMITTED & SPOOLED ]`
    ];

    const hexPreview = buffer.slice(0, 64).toString('hex').toUpperCase().match(/.{1,2}/g)?.join(' ') + ' ...';

    return {
      buffer,
      formattedText: lines.join('\n'),
      hexPreview
    };
  }

  /**
   * Builds official Goods Received Note (GRN) inventory inwarding audit slip
   */
  public static buildGrnReceipt(
    grn: import('./types.js').GoodsReceivedNote,
    outletHeader: { name: string; address: string; gstin: string }
  ): { buffer: Buffer; formattedText: string; hexPreview: string } {
    const builder = new EscPosBuilder(48);

    builder
      .beep()
      .align('CENTER')
      .bold(true)
      .size('DOUBLE_HEIGHT')
      .textLine('GOODS RECEIVED NOTE (GRN)')
      .size('NORMAL')
      .bold(false)
      .textLine(outletHeader.name)
      .textLine(`GSTIN: ${outletHeader.gstin}`)
      .divider('=')
      .align('LEFT')
      .keyValueLine(`GRN No: ${grn.grn_number}`, `PO Ref: ${grn.po_number}`)
      .keyValueLine(`Supplier: ${grn.supplier_name.slice(0, 22)}`, `Inv: ${grn.invoice_ref_number}`)
      .keyValueLine(`Received By: ${grn.received_by}`, `Time: ${new Date(grn.received_at).toLocaleTimeString()}`)
      .divider('-')
      .bold(true)
      .textLine(`${'ITEM / UNIT'.padEnd(26, ' ')} ${'RECVD'.padStart(8, ' ')} ${'COST'.padStart(12, ' ')}`)
      .bold(false)
      .divider('-');

    for (const item of grn.items) {
      builder.keyValueLine(
        `${item.ingredient_name.slice(0, 22)} (${item.unit})`,
        `${item.received_quantity} @ Rs.${item.unit_price}`
      );
    }

    builder
      .divider('=')
      .bold(true)
      .size('DOUBLE_HEIGHT')
      .keyValueLine('INWARD TOTAL:', `Rs. ${grn.total_received_cost.toFixed(2)}`)
      .size('NORMAL')
      .bold(false)
      .divider('-')
      .textLine(`Audit Status: [ ${grn.status} ]`)
      .textLine(`Remarks: ${grn.discrepancy_note || 'Inspected and accepted into stock'}`)
      .divider('=')
      .align('CENTER')
      .textLine('Store Keeper: __________________')
      .textLine('--- Road Not Taken Procurement ERP ---')
      .cut();

    const buffer = builder.build();

    const lines = [
      `================================================`,
      `           GOODS RECEIVED NOTE (GRN)            `,
      `               ${outletHeader.name}               `,
      `              GSTIN: ${outletHeader.gstin}             `,
      `================================================`,
      `GRN: ${grn.grn_number.padEnd(23)} PO: ${grn.po_number}`,
      `Supplier: ${grn.supplier_name.slice(0, 20).padEnd(20)} Inv: ${grn.invoice_ref_number}`,
      `Received By: ${grn.received_by.padEnd(17)} Time: ${new Date(grn.received_at).toLocaleTimeString()}`,
      `------------------------------------------------`,
      `ITEM / UNIT                     RECVD       COST`,
      `------------------------------------------------`,
      ...grn.items.map(
        (i) => `${(i.ingredient_name.slice(0, 20) + ` (${i.unit})`).padEnd(27)} ${String(i.received_quantity).padStart(7)} ${i.total_cost.toFixed(2).padStart(12)}`
      ),
      `================================================`,
      `INWARD TOTAL:                       Rs. ${grn.total_received_cost.toFixed(2).padStart(8)}`,
      `------------------------------------------------`,
      `Status: [ ${grn.status} ]`,
      `Notes: ${grn.discrepancy_note || 'All items inspected and weighted average cost updated.'}`,
      `================================================`,
      `Store Keeper: __________________`,
      `[ STOCK INWARD ATOMIC TRANSACTION COMMITTED ]`,
      `--- Road Not Taken Procurement ERP ---`
    ];

    const hexPreview = buffer.slice(0, 64).toString('hex').toUpperCase().match(/.{1,2}/g)?.join(' ') + ' ...';

    return {
      buffer,
      formattedText: lines.join('\n'),
      hexPreview
    };
  }
}


