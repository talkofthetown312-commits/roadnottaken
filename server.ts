import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { getDatabase, CATALOG_ITEMS } from './src/server/db.js';
import { InventoryService } from './src/server/inventoryService.js';
import { OrderRepository } from './src/server/orderRepository.js';
import { ThermalPrinterService } from './src/server/printerService.js';
import { CloudSyncController } from './src/server/cloudSyncController.js';
import { SyncEngine } from './src/server/syncEngine.js';
import { AggregatorWebhookEngine } from './src/server/aggregatorWebhook.js';
import { OrderInput } from './src/server/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // Initialize SQLite & Domain Services
  const db = await getDatabase();
  const inventoryService = new InventoryService(db);
  const orderRepo = new OrderRepository(db, inventoryService);
  const printerService = new ThermalPrinterService(db);
  const shiftService = new (await import('./src/server/shiftService.js')).ShiftService(db, printerService);
  const tableService = new (await import('./src/server/tableService.js')).TableService(db, orderRepo, printerService);
  const crmService = new (await import('./src/server/crmLoyaltyService.js')).CrmLoyaltyService(db);
  const cloudController = new CloudSyncController(db);
  const syncEngine = new SyncEngine(orderRepo, cloudController);
  const webhookEngine = new AggregatorWebhookEngine(
    db,
    orderRepo,
    printerService,
    cloudController
  );

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
        shiftHistory
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Edge Cashier Order Creation (Billing Screen)
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

    // Spool both Kitchen KOT and Customer Receipt
    const kotJob = printerService.enqueueKOT(order);
    const rcptJob = printerService.enqueueReceipt(order);

    // Asynchronously trigger sync cycle if online
    void syncEngine.executeSyncCycle();

    res.status(201).json({
      success: true,
      order_id: order.order_id,
      kot_job_id: kotJob.job_id,
      receipt_job_id: rcptJob.job_id
    });
  });

  // 3. Captain Android LAN Order (Handheld Floor Terminal Simulator)
  app.post('/api/lan/orders', (req: Request, res: Response) => {
    const order = req.body as OrderInput;
    if (!order?.order_id || !Array.isArray(order.items) || order.items.length === 0) {
      res.status(400).json({ error: 'Valid order_id and items are required' });
      return;
    }

    // Idempotency Guard: prevent duplicate KOTs if weak Wi-Fi causes Android double-tap
    if (orderRepo.existsById(order.order_id)) {
      res.status(200).json({
        success: true,
        order_id: order.order_id,
        duplicate_ignored: true,
        message: 'Order already exists on Master POS. Duplicate KOT prevented.'
      });
      return;
    }

    const result = orderRepo.createOrder(order, true, 'PENDING');
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    // Spool Kitchen KOT immediately for floor order
    const kotJob = printerService.enqueueKOT(order, 'Kitchen KOT (Floor Captain Dispatch)');

    // Trigger sync cycle asynchronously
    void syncEngine.executeSyncCycle();

    res.status(201).json({
      success: true,
      order_id: order.order_id,
      duplicate_ignored: false,
      kot_job_id: kotJob.job_id
    });
  });

  // 4. Update Order Status (KDS & Captain updates: PENDING -> PREPARING -> COMPLETED / CANCELLED)
  app.patch('/api/edge/orders/:id/status', (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    const result = orderRepo.updateOrderStatus(id, status);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    // Status change queues order for re-sync
    void syncEngine.executeSyncCycle();

    res.status(200).json({ success: true, order_id: id, status });
  });

  // 5. Network Simulation Controls (Simulate ISP Outage)
  app.post('/api/edge/network-mode', (req: Request, res: Response) => {
    const { online } = req.body;
    syncEngine.setOnlineStatus(Boolean(online));
    res.status(200).json({
      success: true,
      isOnline: syncEngine.getOnlineStatus(),
      telemetry: syncEngine.getTelemetry()
    });
  });

  // 6. Manual Sync Outbox Trigger
  app.post('/api/edge/trigger-sync', async (_req: Request, res: Response) => {
    const result = await syncEngine.triggerImmediateSync();
    res.status(200).json({
      ...result,
      telemetry: syncEngine.getTelemetry(),
      stats: orderRepo.getSyncStats()
    });
  });

  // 7. Inventory Restock
  app.post('/api/inventory/restock', (req: Request, res: Response) => {
    const { ingredient_id, amount } = req.body;
    if (!ingredient_id || !amount) {
      res.status(400).json({ error: 'ingredient_id and amount are required' });
      return;
    }
    inventoryService.restockIngredient(ingredient_id, Number(amount));
    res.status(200).json({
      success: true,
      inventory: inventoryService.getInventoryStatus()
    });
  });

  // 8. Aggregator Webhook Simulator (Zomato / Swiggy)
  app.post('/api/webhooks/simulate', (req: Request, res: Response) => {
    const { aggregator } = req.body as { aggregator: 'ZOMATO' | 'SWIGGY' };
    if (aggregator !== 'ZOMATO' && aggregator !== 'SWIGGY') {
      res.status(400).json({ error: 'Aggregator must be ZOMATO or SWIGGY' });
      return;
    }

    const simResult = webhookEngine.simulateIncomingOrder(aggregator);
    res.status(200).json(simResult);
  });

  // 9. Hardware Printer Spool Queue
  app.get('/api/printers/spool', (_req: Request, res: Response) => {
    res.status(200).json({
      spool: printerService.getRecentJobs(25)
    });
  });

  // 10. Cashier Shift Management & Z-Report Endpoints (Milestone 9)
  app.get('/api/shifts/active', (_req: Request, res: Response) => {
    const shift = shiftService.getActiveShift('POS-01');
    res.status(200).json({ shift });
  });

  app.post('/api/shifts/open', (req: Request, res: Response) => {
    try {
      const { cashierName, openingFloat, terminalId } = req.body;
      const shift = shiftService.openShift(
        terminalId || 'POS-01',
        cashierName || 'Anita Deshmukh',
        Number(openingFloat) || 2000
      );
      res.status(201).json({ success: true, shift });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/shifts/adjustment', (req: Request, res: Response) => {
    try {
      const { shiftId, type, amount, reason } = req.body;
      if (!shiftId || !type || !amount) {
        res.status(400).json({ error: 'shiftId, type, and amount are required' });
        return;
      }
      const adj = shiftService.recordAdjustment(shiftId, type, Number(amount), reason || 'Cash adjustment');
      res.status(201).json({ success: true, adjustment: adj, shift: shiftService.getActiveShift('POS-01') });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/shifts/adjustments/:shiftId', (req: Request, res: Response) => {
    const { shiftId } = req.params;
    const adjustments = shiftService.getAdjustments(shiftId);
    res.status(200).json({ adjustments });
  });

  app.post('/api/shifts/close-blind-drop', (req: Request, res: Response) => {
    try {
      const { shiftId, actualCashCounted, varianceReason } = req.body;
      if (!shiftId || actualCashCounted === undefined) {
        res.status(400).json({ error: 'shiftId and actualCashCounted are required' });
        return;
      }
      const result = shiftService.executeBlindDropAndCloseShift(
        shiftId,
        Number(actualCashCounted),
        varianceReason
      );

      // Trigger cloud sync for the closed shift
      void syncEngine.executeSyncCycle();

      res.status(200).json({
        success: true,
        shift: result.shift,
        z_report: result.zReportFormatted,
        hex_preview: result.hexPreview
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 11. Dining Floor Table Management & Split-Bill Engine (Milestone 10)
  app.get('/api/tables', (_req: Request, res: Response) => {
    res.status(200).json({ tables: tableService.getFloorTables() });
  });

  app.post('/api/tables/transfer', (req: Request, res: Response) => {
    const { fromTableId, toTableId } = req.body;
    const result = tableService.transferTable(fromTableId, toTableId);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    void syncEngine.executeSyncCycle();
    res.status(200).json({ success: true, tables: tableService.getFloorTables() });
  });

  app.post('/api/tables/merge', (req: Request, res: Response) => {
    const { primaryTableId, secondaryTableId } = req.body;
    const result = tableService.mergeTables(primaryTableId, secondaryTableId);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    void syncEngine.executeSyncCycle();
    res.status(200).json({ success: true, tables: tableService.getFloorTables() });
  });

  app.post('/api/tables/split-equal', (req: Request, res: Response) => {
    const { orderId, splitCount, tenders } = req.body;
    const result = tableService.splitOrderEqual(orderId, Number(splitCount), tenders || []);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    void syncEngine.executeSyncCycle();
    res.status(200).json(result);
  });

  app.post('/api/tables/split-items', (req: Request, res: Response) => {
    const { orderId, itemBucketMap, tenderA, tenderB } = req.body;
    const result = tableService.splitOrderByItems(
      orderId,
      itemBucketMap || {},
      tenderA || 'CASH',
      tenderB || 'UPI'
    );
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    void syncEngine.executeSyncCycle();
    res.status(200).json(result);
  });

  // 12. Customer CRM, Loyalty Wallet & Dynamic BharatQR / UPI Soundbox (Milestone 11)
  app.get('/api/customers', (req: Request, res: Response) => {
    const phone = req.query.phone as string | undefined;
    if (phone) {
      const customer = crmService.getCustomerByPhone(phone);
      res.status(200).json({ customer });
      return;
    }
    res.status(200).json({
      customers: crmService.getAllCustomers(),
      ledger: crmService.getRecentLedger(20)
    });
  });

  app.post('/api/customers/upsert', (req: Request, res: Response) => {
    try {
      const { phone, name, email } = req.body;
      if (!phone) {
        res.status(400).json({ error: 'phone is required' });
        return;
      }
      const customer = crmService.upsertCustomer(phone, name || 'Walk-in Guest', email);
      res.status(200).json({
        success: true,
        customer,
        customers: crmService.getAllCustomers()
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/payments/upi/create-intent', (req: Request, res: Response) => {
    try {
      const { amount, invoiceNumber } = req.body;
      const intent = crmService.createUpiPaymentIntent(Number(amount) || 0, invoiceNumber);
      res.status(201).json({ success: true, intent });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/payments/upi/verify-soundbox', (req: Request, res: Response) => {
    try {
      const { intentId, payerVpa } = req.body;
      if (!intentId) {
        res.status(400).json({ error: 'intentId is required' });
        return;
      }
      const intent = crmService.verifyUpiPaymentCallback(intentId, payerVpa);
      res.status(200).json({ success: true, intent });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 13. Multi-Outlet Cloud Ledger & Analytics
  app.get('/api/cloud/ledger', (_req: Request, res: Response) => {
    res.status(200).json({
      orders: cloudController.getCloudOrders(),
      metrics: cloudController.getCloudMetrics()
    });
  });

  // Vite Integration in Development
  const port = 3000;
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Petpooja POS] Server listening on port ${port} (0.0.0.0:${port})`);
  });
}

startServer().catch((err) => {
  console.error('[Petpooja POS] Failed to start server:', err);
  process.exit(1);
});
