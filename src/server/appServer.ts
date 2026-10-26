import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { getDatabase, CATALOG_ITEMS } from './db.js';
import { InventoryService } from './inventoryService.js';
import { OrderRepository } from './orderRepository.js';
import { ThermalPrinterService } from './printerService.js';
import { CloudSyncController } from './cloudSyncController.js';
import { SyncEngine } from './syncEngine.js';
import { AggregatorWebhookEngine } from './aggregatorWebhook.js';
import { OrderInput, StaffMember, PayrollRecord, SopChecklistItem } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

export async function runServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // Initialize SQLite & Domain Services
  const db = await getDatabase();
  const inventoryService = new InventoryService(db);
  const orderRepo = new OrderRepository(db, inventoryService);
  const printerService = new ThermalPrinterService(db);
  const shiftService = new (await import('./shiftService.js')).ShiftService(db, printerService);
  const tableService = new (await import('./tableService.js')).TableService(db, orderRepo, printerService);
  const crmService = new (await import('./crmLoyaltyService.js')).CrmLoyaltyService(db);
  const procurementService = new (await import('./procurementService.js')).ProcurementService(db, printerService);
  const cloudController = new CloudSyncController(db);
  const syncEngine = new SyncEngine(orderRepo, cloudController);
  const webhookEngine = new AggregatorWebhookEngine(
    db,
    orderRepo,
    printerService,
    cloudController
  );

  const getProfile = () => {
    const res = db.exec(
      `SELECT profile_id, restaurant_name, outlet_name, address, gstin, fssai_licence, phone, email, currency_symbol, tax_cgst_rate, tax_sgst_rate, kiosk_idle_timeout_seconds, printer_ip, printer_port, printer_paper_width, merchant_upi_vpa, updated_at
       FROM restaurant_profile LIMIT 1`
    );
    if (!res[0] || !res[0].values || !res[0].values[0]) {
      return {
        profile_id: 'main-profile',
        restaurant_name: 'Talk of the Town',
        outlet_name: 'Imphal Main Outlet',
        address: 'Imphal, Manipur',
        gstin: '14AAACT1234F1Z5',
        fssai_licence: '11624001000123',
        phone: '+91 98620 12345',
        email: 'talkofthetown312@gmail.com',
        currency_symbol: '₹',
        tax_cgst_rate: 2.5,
        tax_sgst_rate: 2.5,
        kiosk_idle_timeout_seconds: 60,
        printer_ip: '192.168.1.100',
        printer_port: 9100,
        printer_paper_width: '80mm',
        merchant_upi_vpa: 'talkofthetown@upi',
        updated_at: new Date().toISOString()
      };
    }
    const r = res[0].values[0];
    return {
      profile_id: String(r[0]),
      restaurant_name: String(r[1]),
      outlet_name: String(r[2]),
      address: String(r[3]),
      gstin: String(r[4]),
      fssai_licence: String(r[5]),
      phone: String(r[6]),
      email: r[7] ? String(r[7]) : undefined,
      currency_symbol: String(r[8] || '₹'),
      tax_cgst_rate: Number(r[9] ?? 2.5),
      tax_sgst_rate: Number(r[10] ?? 2.5),
      kiosk_idle_timeout_seconds: Number(r[11] || 60),
      printer_ip: String(r[12] || '192.168.1.100'),
      printer_port: Number(r[13] || 9100),
      printer_paper_width: (String(r[14] || '80mm') as '58mm' | '80mm'),
      merchant_upi_vpa: String(r[15] || 'talkofthetown@upi'),
      updated_at: String(r[16] || new Date().toISOString())
    };
  };

  const getStaffList = (): StaffMember[] => {
    const res = db.exec(`SELECT staff_id, name, role, phone, monthly_base_salary, daily_wage_rate, bank_account_info, joining_date, is_active FROM staff_members ORDER BY staff_id ASC`);
    if (!res[0] || !res[0].values) return [];
    return res[0].values.map(r => ({
      staff_id: String(r[0]),
      name: String(r[1]),
      role: r[2] as any,
      phone: String(r[3]),
      monthly_base_salary: Number(r[4]),
      daily_wage_rate: Number(r[5]),
      bank_account_info: r[6] ? String(r[6]) : undefined,
      joining_date: String(r[7]),
      is_active: Boolean(r[8])
    }));
  };

  const getPayrollList = (): PayrollRecord[] => {
    const res = db.exec(`SELECT payroll_id, staff_id, staff_name, role, month, base_salary, days_worked, overtime_hours, overtime_pay, advance_deductions, bonus, net_payout, payment_status, payment_method, paid_at FROM payroll_ledger ORDER BY payroll_id DESC`);
    if (!res[0] || !res[0].values) return [];
    return res[0].values.map(r => ({
      payroll_id: String(r[0]),
      staff_id: String(r[1]),
      staff_name: String(r[2]),
      role: r[3] as any,
      month: String(r[4]),
      base_salary: Number(r[5]),
      days_worked: Number(r[6]),
      overtime_hours: Number(r[7]),
      overtime_pay: Number(r[8]),
      advance_deductions: Number(r[9]),
      bonus: Number(r[10]),
      net_payout: Number(r[11]),
      payment_status: r[12] as any,
      payment_method: r[13] as any,
      paid_at: r[14] ? String(r[14]) : undefined
    }));
  };

  const getSopChecklists = (): SopChecklistItem[] => {
    const res = db.exec(`SELECT id, category, task, frequency, completed, completed_by, completed_at FROM sop_checklists ORDER BY id ASC`);
    if (!res[0] || !res[0].values) return [];
    return res[0].values.map(r => ({
      id: String(r[0]),
      category: r[1] as any,
      task: String(r[2]),
      frequency: r[3] as any,
      completed: Boolean(r[4]),
      completed_by: r[5] ? String(r[5]) : undefined,
      completed_at: r[6] ? String(r[6]) : undefined
    }));
  };

  // 1. Unified Bootstrap Endpoint
  app.get('/api/bootstrap', (_req: Request, res: Response) => {
    try {
      const orders = orderRepo.getAllOrders('ALL');
      const tables = tableService.getFloorTables();
      const customers = crmService.getAllCustomers();
      const loyaltyLedger = crmService.getRecentLedger(15);
      const inventory = inventoryService.getInventoryStatus();
      const bom = inventoryService.getRecipeBOMList();
      const spoolJobs = printerService.getRecentJobs(10);
      const syncStats = orderRepo.getSyncStats();
      const syncTelemetry = syncEngine.getTelemetry();
      const cloudOrders = cloudController.getCloudOrders();
      const cloudMetrics = cloudController.getCloudMetrics();
      const webhookLogs = webhookEngine.getLogs(10);
      const activeShift = shiftService.getActiveShift('POS-01');
      const shiftHistory = shiftService.getShiftHistory(10);
      const restaurantProfile = getProfile();
      const suppliers = procurementService.getSuppliers();
      const purchaseOrders = procurementService.getPurchaseOrders();
      const grnList = procurementService.getGoodsReceivedNotes();
      const staffList = getStaffList();
      const payrollList = getPayrollList();
      const sopList = getSopChecklists();

      res.status(200).json({
        catalog: CATALOG_ITEMS,
        orders,
        tables,
        customers,
        loyaltyLedger,
        inventory,
        bom,
        spoolJobs,
        syncStats,
        syncTelemetry,
        cloudOrders,
        cloudMetrics,
        webhookLogs,
        activeShift,
        shiftHistory,
        restaurantProfile,
        suppliers,
        purchaseOrders,
        grnList,
        staffList,
        payrollList,
        sopList
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Edge Cashier & Kiosk Order Creation
  app.post('/api/edge/orders', (req: Request, res: Response) => {
    const order = req.body as OrderInput;
    if (!order?.order_id || !Array.isArray(order.items) || order.items.length === 0) {
      res.status(400).json({ error: 'Valid order_id and items are required' });
      return;
    }

    const result = orderRepo.createOrder(order, true, 'PENDING');
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    const kotJob = printerService.enqueueKOT(order);
    const rcptJob = printerService.enqueueReceipt(order);

    void syncEngine.executeSyncCycle();

    res.status(201).json({
      success: true,
      order_id: order.order_id,
      kot_job_id: kotJob.job_id,
      receipt_job_id: rcptJob.job_id,
    });
  });

  // 3. Customer Self-Ordering Kiosk Order
  app.post('/api/kiosk/order', (req: Request, res: Response) => {
    try {
      const order = req.body as OrderInput;
      if (!order?.order_id || !Array.isArray(order.items) || order.items.length === 0) {
        res.status(400).json({ error: 'Valid items required' });
        return;
      }

      order.terminal_id = 'KIOSK-TOUCH-01';
      order.order_status = 'PREPARING';
      const result = orderRepo.createOrder(order, true, 'PENDING');
      if (!result.success) {
        res.status(500).json({ error: result.error });
        return;
      }

      const kotJob = printerService.enqueueKOT(order, 'Self-Service Customer Kiosk Stand #1');
      const rcptJob = printerService.enqueueReceipt(order);

      // Generate dynamic UPI intent for kiosk QR code
      const profile = getProfile();
      const upiUri = `upi://pay?pa=${encodeURIComponent(profile.merchant_upi_vpa || 'talkofthetown@upi')}&pn=${encodeURIComponent(profile.restaurant_name)}&am=${order.grand_total.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Kiosk Order ' + order.invoice_number)}`;

      res.status(201).json({
        success: true,
        order_id: order.order_id,
        invoice_number: order.invoice_number,
        kot_job_id: kotJob.job_id,
        receipt_job_id: rcptJob.job_id,
        upi_uri: upiUri
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Restaurant Profile & Hardware Settings
  app.put('/api/settings/profile', (req: Request, res: Response) => {
    try {
      const {
        restaurant_name,
        outlet_name,
        address,
        gstin,
        fssai_licence,
        phone,
        email,
        currency_symbol,
        tax_cgst_rate,
        tax_sgst_rate,
        kiosk_idle_timeout_seconds,
        printer_ip,
        printer_port,
        printer_paper_width,
        merchant_upi_vpa
      } = req.body;

      db.run(
        `UPDATE restaurant_profile
         SET restaurant_name = ?,
             outlet_name = ?,
             address = ?,
             gstin = ?,
             fssai_licence = ?,
             phone = ?,
             email = ?,
             currency_symbol = ?,
             tax_cgst_rate = ?,
             tax_sgst_rate = ?,
             kiosk_idle_timeout_seconds = ?,
             printer_ip = ?,
             printer_port = ?,
             printer_paper_width = ?,
             merchant_upi_vpa = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE profile_id = 'main-profile'`,
        [
          restaurant_name || 'Talk of the Town',
          outlet_name || 'Imphal Main Outlet',
          address || 'Imphal, Manipur',
          gstin || '',
          fssai_licence || '',
          phone || '',
          email || '',
          currency_symbol || '₹',
          Number(tax_cgst_rate ?? 2.5),
          Number(tax_sgst_rate ?? 2.5),
          Number(kiosk_idle_timeout_seconds || 60),
          printer_ip || '192.168.1.100',
          Number(printer_port || 9100),
          printer_paper_width || '80mm',
          merchant_upi_vpa || 'talkofthetown@upi'
        ]
      );

      res.status(200).json({ success: true, profile: getProfile() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Staff Roster & Salary Management
  app.get('/api/staff', (_req: Request, res: Response) => {
    res.status(200).json({ staff: getStaffList() });
  });

  app.post('/api/staff', (req: Request, res: Response) => {
    try {
      const { name, role, phone, monthly_base_salary, bank_account_info } = req.body;
      const staff_id = `STF-${Date.now().toString().slice(-4)}`;
      const salary = Number(monthly_base_salary) || 15000;
      const daily = Math.round(salary / 30);

      db.run(
        `INSERT INTO staff_members (staff_id, name, role, phone, monthly_base_salary, daily_wage_rate, bank_account_info, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [staff_id, name, role, phone, salary, daily, bank_account_info || '']
      );

      res.status(201).json({ success: true, staff_id, staff: getStaffList() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/payroll', (_req: Request, res: Response) => {
    res.status(200).json({ payroll: getPayrollList() });
  });

  app.post('/api/payroll/payout', (req: Request, res: Response) => {
    try {
      const { staff_id, month, days_worked, overtime_hours, overtime_rate, advance_deductions, bonus, payment_method } = req.body;
      const staff = getStaffList().find(s => s.staff_id === staff_id);
      if (!staff) {
        res.status(404).json({ error: 'Staff member not found' });
        return;
      }

      const workedDays = Number(days_worked) || 30;
      const earnedBase = Math.round((staff.monthly_base_salary / 30) * workedDays);
      const otHours = Number(overtime_hours) || 0;
      const otPay = Math.round(otHours * (Number(overtime_rate) || (staff.daily_wage_rate / 8 * 1.5)));
      const advances = Number(advance_deductions) || 0;
      const bon = Number(bonus) || 0;
      const net = Math.max(0, earnedBase + otPay + bon - advances);

      const payroll_id = `PAY-${staff.staff_id}-${Date.now().toString().slice(-5)}`;

      db.run(
        `INSERT INTO payroll_ledger (payroll_id, staff_id, staff_name, role, month, base_salary, days_worked, overtime_hours, overtime_pay, advance_deductions, bonus, net_payout, payment_status, payment_method, paid_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?, CURRENT_TIMESTAMP)`,
        [payroll_id, staff.staff_id, staff.name, staff.role, month || 'October 2026', staff.monthly_base_salary, workedDays, otHours, otPay, advances, bon, net, payment_method || 'BANK_TRANSFER']
      );

      res.status(201).json({ success: true, payroll_id, net_payout: net, payroll: getPayrollList() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Standard Operating Procedures (SOP) & Rule Book
  app.get('/api/sop', (_req: Request, res: Response) => {
    res.status(200).json({ checklists: getSopChecklists() });
  });

  app.post('/api/sop/toggle', (req: Request, res: Response) => {
    try {
      const { id, completed, completed_by } = req.body;
      db.run(
        `UPDATE sop_checklists
         SET completed = ?,
             completed_by = ?,
             completed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [completed ? 1 : 0, completed_by || 'Staff Member', id]
      );
      res.status(200).json({ success: true, checklists: getSopChecklists() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Operations AI Assistant (Restaurant Management Copilot)
  app.post('/api/assistant/ask', async (req: Request, res: Response) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Query string required' });
        return;
      }

      // Gather live SQLite context
      const orders = orderRepo.getAllOrders('ALL');
      const inventory = inventoryService.getInventoryStatus();
      const lowStock = inventory.filter(i => i.is_low_stock && i.treatment === 'Recipe-Linked');
      const activeShift = shiftService.getActiveShift('POS-01');
      const profile = getProfile();
      const staff = getStaffList();

      const totalSalesRevenue = orders.reduce((sum, o) => sum + o.grand_total, 0);
      const dishSales: Record<string, number> = {};
      for (const ord of orders) {
        for (const it of ord.items) {
          dishSales[it.item_name] = (dishSales[it.item_name] || 0) + it.quantity;
        }
      }
      const topDishes = Object.entries(dishSales).sort((a,b) => b[1] - a[1]).slice(0, 5);

      const systemContext = `You are the AI Restaurant Operations Assistant for "${profile.restaurant_name}" (${profile.outlet_name}, ${profile.address}).
Authoritative Live Restaurant Data:
- Today's Total Orders: ${orders.length}
- Today's Revenue: ₹${totalSalesRevenue.toFixed(2)}
- Current Cashier Shift: ${activeShift?.status || 'OPEN'} (Cash Sales: ₹${activeShift?.cash_sales || 0}, UPI Sales: ₹${activeShift?.upi_sales || 0})
- Low Stock Raw Materials (${lowStock.length}): ${lowStock.map(l => `${l.name} (${l.current_stock} ${l.unit})`).join(', ') || 'All Recipe stock healthy'}
- Active Staff On Duty: ${staff.length} staff members across Chef, Captain, Cashier, and Store
- Bestselling Dishes: ${topDishes.map(([name, qty]) => `${name} (${qty} sold)`).join(', ') || 'No orders yet today'}
- Tax CGST: ${profile.tax_cgst_rate}%, SGST: ${profile.tax_sgst_rate}%

Provide concise, highly actionable, scannable advice. Include bullet points, exact rupee numbers, inventory recommendations, and operational SOP guidelines where applicable.`;

      let aiResponseText = '';

      if (process.env.GEMINI_API_KEY) {
        try {
          const ai = new GoogleGenAI();
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
              { role: 'user', parts: [{ text: `${systemContext}\n\nManager Question: "${query}"` }] }
            ]
          });
          aiResponseText = response.text || '';
        } catch (apiErr: any) {
          console.warn('[Operations Assistant] Gemini API call fallback:', apiErr.message);
        }
      }

      // High-speed deterministic fallback if no API key or network failure
      if (!aiResponseText) {
        const lowerQ = query.toLowerCase();
        if (lowerQ.includes('stock') || lowerQ.includes('inventory') || lowerQ.includes('raw material')) {
          aiResponseText = `**Inventory & Replenishment Summary for ${profile.restaurant_name}**:\n` +
            `- Total Tracked Master Items: **144** items (TOT-001 to TOT-144 across 14 categories)\n` +
            `- Low Stock Alerts: **${lowStock.length} items** need attention.\n` +
            (lowStock.length > 0 ? `  - ${lowStock.slice(0, 4).map(s => `**${s.name}**: ${s.current_stock} ${s.unit}`).join('\n  - ')}\n` : `  - All recipe-linked ingredients have healthy buffer quantities.\n`) +
            `- **SOP Recommendation**: Review Purchase Orders in the Procurement tab and issue vendor GRN inwards upon delivery.`;
        } else if (lowerQ.includes('sales') || lowerQ.includes('revenue') || lowerQ.includes('bestseller') || lowerQ.includes('profit')) {
          aiResponseText = `**Daily Sales Performance**:\n` +
            `- Orders Logged: **${orders.length} orders**\n` +
            `- Total Gross Revenue: **₹${totalSalesRevenue.toFixed(2)}**\n` +
            `- Top Selling Dishes: ${topDishes.length > 0 ? topDishes.map(([n, q]) => `**${n}** (${q} portions)`).join(', ') : 'Waiting for first order of the day'}\n` +
            `- Tax Collected: CGST (${profile.tax_cgst_rate}%) + SGST (${profile.tax_sgst_rate}%).\n` +
            `- **Tip**: Chowmein and Fried Rice combinations offer a 65%+ gross margin when prepped in bulk.`;
        } else if (lowerQ.includes('salary') || lowerQ.includes('staff') || lowerQ.includes('employee')) {
          aiResponseText = `**Staff & Payroll Overview**:\n` +
            `- Total Active Staff: **${staff.length} employees**\n` +
            `- Total Monthly Base Payroll: **₹${staff.reduce((s, m) => s + m.monthly_base_salary, 0).toLocaleString('en-IN')}**\n` +
            `- Head Chef: ${staff.find(s => s.role === 'HEAD_CHEF')?.name || 'N. Sanatomba Singh'} (₹28,000/mo)\n` +
            `- Floor Captain: ${staff.find(s => s.role === 'FLOOR_CAPTAIN')?.name || 'M. James'} (₹16,000/mo)\n` +
            `- **Action**: You can disburse individual salary slips and record advances in the Salary tab.`;
        } else {
          aiResponseText = `**Talk of the Town Operations Status**:\n` +
            `- **Restaurant**: ${profile.restaurant_name} (${profile.outlet_name})\n` +
            `- **Floor Status**: Ready for guests · Edge Terminal active (SQLite WAL)\n` +
            `- **Sales Today**: ₹${totalSalesRevenue.toFixed(2)} (${orders.length} tickets)\n` +
            `- **Active Shift**: ${activeShift?.status || 'OPEN'} on terminal POS-01\n` +
            `- **Recommended Task**: Complete morning opening SOP checklist and verify dry noodles & cooking oil stock.`;
        }
      }

      res.status(200).json({ answer: aiResponseText, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. KDS LAN Order & Printer Spooler Routes
  app.post('/api/lan/orders', (req: Request, res: Response) => {
    const order = req.body as OrderInput;
    if (!order?.order_id || !Array.isArray(order.items) || order.items.length === 0) {
      res.status(400).json({ error: 'Valid order_id and items are required' });
      return;
    }
    const result = orderRepo.createOrder(order, true, 'PENDING');
    if (!result.success) {
      if ((result as any).duplicate_ignored) {
        res.status(200).json({ success: true, duplicate_ignored: true, message: 'Duplicate LAN packet ignored' });
        return;
      }
      res.status(500).json({ error: result.error });
      return;
    }
    printerService.enqueueKOT(order, 'Floor Captain Mobile Handheld');
    void syncEngine.executeSyncCycle();
    res.status(201).json({ success: true, order_id: order.order_id });
  });

  app.put('/api/orders/:orderId/status', (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { status } = req.body;
    orderRepo.updateOrderStatus(orderId, status);
    res.status(200).json({ success: true, order_id: orderId, new_status: status });
  });

  app.get('/api/printers/jobs', (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 20;
    res.status(200).json({ jobs: printerService.getRecentJobs(limit) });
  });

  app.post('/api/printers/jobs/:jobId/retry', (req: Request, res: Response) => {
    try {
      db.run(`UPDATE print_spool_jobs SET status = 'SENT' WHERE job_id = ?`, [req.params.jobId]);
      res.status(200).json({ success: true });
    } catch {
      res.status(500).json({ success: false });
    }
  });

  app.post('/api/sync/trigger', async (_req: Request, res: Response) => {
    const result = await syncEngine.executeSyncCycle();
    res.status(200).json(result);
  });

  app.post('/api/webhooks/simulate/:aggregator', (req: Request, res: Response) => {
    const aggregator = req.params.aggregator.toUpperCase() as 'ZOMATO' | 'SWIGGY';
    const result = webhookEngine.simulateIncomingOrder(aggregator);
    res.status(200).json(result);
  });

  // Shift & Cash Management
  app.post('/api/shifts/open', (req: Request, res: Response) => {
    try {
      const { terminal_id, cashier_name, opening_float } = req.body;
      const shift = shiftService.openShift(terminal_id || 'POS-01', cashier_name || 'Active Cashier', Number(opening_float) || 0.0);
      res.status(201).json({ success: true, shift });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/shifts/close', (req: Request, res: Response) => {
    try {
      const { shift_id, actual_cash_counted, variance_reason } = req.body;
      const result = shiftService.executeBlindDropAndCloseShift(shift_id, Number(actual_cash_counted) || 0.0, variance_reason);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/shifts/adjust-cash', (req: Request, res: Response) => {
    try {
      const { shift_id, type, amount, reason } = req.body;
      shiftService.recordAdjustment(shift_id, type, Number(amount) || 0.0, reason || 'Shift adjustment');
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Table Management
  app.post('/api/tables/:tableId/occupy', (req: Request, res: Response) => {
    try {
      const { tableId } = req.params;
      const guestCount = Number(req.body.guest_count) || 2;
      db.run(
        `UPDATE dining_tables SET status = 'OCCUPIED', guest_count = ?, occupied_since = CURRENT_TIMESTAMP WHERE table_id = ?`,
        [guestCount, tableId]
      );
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/tables/:tableId/release', (req: Request, res: Response) => {
    try {
      const { tableId } = req.params;
      db.run(
        `UPDATE dining_tables SET status = 'AVAILABLE', active_order_id = NULL, guest_count = 0, occupied_since = NULL WHERE table_id = ?`,
        [tableId]
      );
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // CRM & Loyalty
  app.post('/api/crm/customers', (req: Request, res: Response) => {
    try {
      const { phone, name, email } = req.body;
      const customer = crmService.upsertCustomer(phone, name || 'Guest', email);
      res.status(200).json({ success: true, customer });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Dynamic UPI Payment Intent
  app.post('/api/payments/upi/create', (req: Request, res: Response) => {
    try {
      const { amount, invoice_number } = req.body;
      const intent = crmService.createUpiPaymentIntent(Number(amount) || 0.0, invoice_number);
      res.status(201).json({ success: true, intent });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/payments/upi/verify', (req: Request, res: Response) => {
    try {
      const { intent_id, payer_vpa } = req.body;
      const intent = crmService.verifyUpiPaymentCallback(intent_id, payer_vpa);
      res.status(200).json({ success: true, intent });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Profile alias endpoint
  app.put('/api/restaurant-profile', (req: Request, res: Response) => {
    const updated = req.body;
    db.run(
      `UPDATE restaurant_profile
       SET restaurant_name = COALESCE(?, restaurant_name),
           outlet_name = COALESCE(?, outlet_name),
           address = COALESCE(?, address),
           gstin = COALESCE(?, gstin),
           fssai_licence = COALESCE(?, fssai_licence),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           tax_cgst_rate = COALESCE(?, tax_cgst_rate),
           tax_sgst_rate = COALESCE(?, tax_sgst_rate),
           printer_ip = COALESCE(?, printer_ip),
           printer_port = COALESCE(?, printer_port),
           printer_paper_width = COALESCE(?, printer_paper_width),
           merchant_upi_vpa = COALESCE(?, merchant_upi_vpa),
           kiosk_idle_timeout_seconds = COALESCE(?, kiosk_idle_timeout_seconds),
           updated_at = CURRENT_TIMESTAMP
       WHERE profile_id = 'main-profile'`,
      [
        updated.restaurant_name,
        updated.outlet_name,
        updated.address,
        updated.gstin,
        updated.fssai_licence,
        updated.phone,
        updated.email,
        updated.tax_cgst_rate,
        updated.tax_sgst_rate,
        updated.printer_ip,
        updated.printer_port,
        updated.printer_paper_width,
        updated.merchant_upi_vpa,
        updated.kiosk_idle_timeout_seconds,
      ]
    );
    res.status(200).json({ success: true, profile: getProfile() });
  });

  // Procurement & Inventory
  app.post('/api/inventory/restock', (req: Request, res: Response) => {
    const { ingredient_id, amount } = req.body;
    inventoryService.restockIngredient(ingredient_id, Number(amount) || 10);
    res.status(200).json({ success: true });
  });

  app.get('/api/procurement/suppliers', (_req: Request, res: Response) => {
    res.status(200).json({ suppliers: procurementService.getSuppliers() });
  });

  app.post('/api/procurement/suppliers', (req: Request, res: Response) => {
    try {
      const supplier = procurementService.createSupplier(req.body);
      res.status(201).json({ success: true, supplier });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/procurement/purchase-orders', (_req: Request, res: Response) => {
    res.status(200).json({ purchaseOrders: procurementService.getPurchaseOrders() });
  });

  app.post('/api/procurement/purchase-orders', (req: Request, res: Response) => {
    try {
      const po = procurementService.createPurchaseOrder(req.body);
      res.status(201).json({ success: true, po });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/procurement/grn', (_req: Request, res: Response) => {
    res.status(200).json({ grnList: procurementService.getGoodsReceivedNotes() });
  });

  app.post('/api/procurement/grn/receive', (req: Request, res: Response) => {
    const result = procurementService.receiveGrn(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result);
  });

  app.get('/api/procurement/barcode/:barcode', (req: Request, res: Response) => {
    const { barcode } = req.params;
    const catalogItem = CATALOG_ITEMS.find((c) => c.barcode === barcode);
    if (catalogItem) {
      res.status(200).json({ type: 'MENU_ITEM', data: catalogItem });
      return;
    }
    const ingResult = procurementService.searchByBarcode(barcode);
    res.status(200).json(ingResult);
  });

  // Vite Integration in Development vs Production static build
  const port = 3000;
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: ROOT_DIR
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(ROOT_DIR, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(ROOT_DIR, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Road Not Taken POS] autorun server listening on 0.0.0.0:${port}`);
  });
}
