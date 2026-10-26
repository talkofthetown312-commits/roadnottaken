import { useState, useEffect, useCallback } from 'react';
import { TopBar, ActiveTab } from './components/TopBar';
import { NetworkSubBar } from './components/NetworkSubBar';
import { CashierView } from './components/CashierView';
import { TableManagementView } from './components/TableManagementView';
import { KitchenKdsView } from './components/KitchenKdsView';
import { InventoryView } from './components/InventoryView';
import { ShiftManagementView } from './components/ShiftManagementView';
import { CloudSyncView } from './components/CloudSyncView';
import { ThermalReceiptModal } from './components/ThermalReceiptModal';
import {
  MenuItem,
  OrderInput,
  OrderStatus,
  PersistedOrder,
  InventoryItem,
  RecipeBOM,
  PrintSpoolJob,
  CloudOrderRecord,
  WebhookLog,
  CashierShift,
  DiningTable,
  PaymentMethod,
  CustomerProfile,
  UpiPaymentIntent
} from './server/types';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('cashier');
  const [catalog, setCatalog] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [preselectedTable, setPreselectedTable] = useState<string>('T-01');
  const [orders, setOrders] = useState<PersistedOrder[]>([]);
  const [inventory, setInventory] = useState<(InventoryItem & { is_low_stock: boolean })[]>([]);
  const [bomList, setBomList] = useState<RecipeBOM[]>([]);
  const [spoolJobs, setSpoolJobs] = useState<PrintSpoolJob[]>([]);
  const [activeShift, setActiveShift] = useState<CashierShift | null>(null);
  const [shiftHistory, setShiftHistory] = useState<CashierShift[]>([]);
  const [syncStats, setSyncStats] = useState({ total: 0, pending: 0, synced: 0, failed: 0 });
  const [syncTelemetry, setSyncTelemetry] = useState<{
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncTimestamp: string | null;
  }>({
    isOnline: true,
    isSyncing: false,
    lastSyncTimestamp: null,
  });
  const [cloudOrders, setCloudOrders] = useState<CloudOrderRecord[]>([]);
  const [cloudMetrics, setCloudMetrics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    dineInRevenue: 0,
    takeawayRevenue: 0,
    deliveryRevenue: 0,
    activeOutletsCount: 1,
  });
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [selectedPrintJob, setSelectedPrintJob] = useState<PrintSpoolJob | null>(null);

  const fetchBootstrapData = useCallback(async () => {
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) return;
      const data = await res.json();
      setCatalog(data.catalog || []);
      setTables(data.tables || []);
      setCustomers(data.customers || []);
      setOrders(data.orders || []);
      setInventory(data.inventory || []);
      setBomList(data.bom || []);
      setSpoolJobs(data.spoolJobs || []);
      setActiveShift(data.activeShift || null);
      setShiftHistory(data.shiftHistory || []);
      setSyncStats(data.syncStats || { total: 0, pending: 0, synced: 0, failed: 0 });
      setSyncTelemetry(data.syncTelemetry || { isOnline: true, isSyncing: false, lastSyncTimestamp: null });
      setCloudOrders(data.cloudOrders || []);
      setCloudMetrics(data.cloudMetrics || {
        totalRevenue: 0,
        totalOrders: 0,
        dineInRevenue: 0,
        takeawayRevenue: 0,
        deliveryRevenue: 0,
        activeOutletsCount: 1,
      });
      setWebhookLogs(data.webhookLogs || []);
    } catch (err) {
      console.warn('[Petpooja App] Bootstrap fetch warning:', err);
    }
  }, []);

  useEffect(() => {
    void fetchBootstrapData();
    const interval = setInterval(() => {
      void fetchBootstrapData();
    }, 3500);
    return () => clearInterval(interval);
  }, [fetchBootstrapData]);

  const handlePlaceOrder = async (order: OrderInput) => {
    const res = await fetch('/api/edge/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    const data = await res.json();
    await fetchBootstrapData();
    return data;
  };

  const handlePunchLanOrder = async (order: OrderInput) => {
    const res = await fetch('/api/lan/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    const data = await res.json();
    await fetchBootstrapData();
    return data;
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    await fetch(`/api/edge/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await fetchBootstrapData();
  };

  const handleToggleNetwork = async (online: boolean) => {
    await fetch('/api/edge/network-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ online }),
    });
    await fetchBootstrapData();
  };

  const handleTriggerSync = async () => {
    await fetch('/api/edge/trigger-sync', { method: 'POST' });
    await fetchBootstrapData();
  };

  const handleRestock = async (ingredientId: string, amount: number) => {
    await fetch('/api/inventory/restock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredient_id: ingredientId, amount }),
    });
    await fetchBootstrapData();
  };

  const handleSimulateWebhook = async (aggregator: 'ZOMATO' | 'SWIGGY') => {
    await fetch('/api/webhooks/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aggregator }),
    });
    await fetchBootstrapData();
  };

  // Shift & Z-Report Handlers
  const handleOpenShift = async (cashierName: string, openingFloat: number) => {
    await fetch('/api/shifts/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cashierName, openingFloat, terminalId: 'POS-01' }),
    });
    await fetchBootstrapData();
  };

  const handleRecordAdjustment = async (
    shiftId: string,
    type: 'CASH_IN' | 'CASH_OUT',
    amount: number,
    reason: string
  ) => {
    await fetch('/api/shifts/adjustment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shiftId, type, amount, reason }),
    });
    await fetchBootstrapData();
  };

  const handleCloseBlindDrop = async (
    shiftId: string,
    actualCashCounted: number,
    varianceReason?: string
  ) => {
    const res = await fetch('/api/shifts/close-blind-drop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shiftId, actualCashCounted, varianceReason }),
    });
    const data = await res.json();
    if (data.success && data.z_report) {
      setSelectedPrintJob({
        job_id: data.shift.z_report_number || 'Z-REP',
        order_id: shiftId,
        job_type: 'Z_REPORT',
        target_printer: 'Cashier Audit Printer (Thermal 80mm)',
        status: 'SENT',
        formatted_text: data.z_report,
        hex_preview: data.hex_preview || '1B 40 ... 1D 56 42 00',
        created_at: new Date().toISOString()
      });
    }
    await fetchBootstrapData();
  };

  // Dining Table & Split Billing Handlers
  const handleTransferTable = async (fromTableId: string, toTableId: string) => {
    const res = await fetch('/api/tables/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromTableId, toTableId }),
    });
    const data = await res.json();
    await fetchBootstrapData();
    return data;
  };

  const handleMergeTables = async (primaryTableId: string, secondaryTableId: string) => {
    const res = await fetch('/api/tables/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primaryTableId, secondaryTableId }),
    });
    const data = await res.json();
    await fetchBootstrapData();
    return data;
  };

  const handleSplitEqual = async (
    orderId: string,
    splitCount: number,
    tenders: PaymentMethod[]
  ) => {
    const res = await fetch('/api/tables/split-equal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, splitCount, tenders }),
    });
    const data = await res.json();
    await fetchBootstrapData();
    return data;
  };

  const handleSplitItems = async (
    orderId: string,
    itemBucketMap: { [orderItemId: string]: 'A' | 'B' },
    tenderA: PaymentMethod,
    tenderB: PaymentMethod
  ) => {
    const res = await fetch('/api/tables/split-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, itemBucketMap, tenderA, tenderB }),
    });
    const data = await res.json();
    await fetchBootstrapData();
    return data;
  };

  // Customer CRM & Dynamic BharatQR / UPI Soundbox Handlers
  const handleUpsertCustomer = async (
    phone: string,
    name: string,
    email?: string
  ): Promise<CustomerProfile | null> => {
    const res = await fetch('/api/customers/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, name, email }),
    });
    const data = await res.json();
    await fetchBootstrapData();
    return data.customer || null;
  };

  const handleCreateUpiIntent = async (
    amount: number,
    invoiceNumber: string
  ): Promise<UpiPaymentIntent> => {
    const res = await fetch('/api/payments/upi/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, invoiceNumber }),
    });
    const data = await res.json();
    return data.intent;
  };

  const handleVerifyUpiSoundbox = async (
    intentId: string,
    payerVpa: string
  ): Promise<UpiPaymentIntent> => {
    const res = await fetch('/api/payments/upi/verify-soundbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intentId, payerVpa }),
    });
    const data = await res.json();
    return data.intent;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans selection:bg-orange-500/20 selection:text-orange-900">
      {/* 3-Zone Top Bar */}
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSimulateWebhook={handleSimulateWebhook}
      />

      {/* Edge Node & Outbox Sync Sub-Bar */}
      <NetworkSubBar
        isOnline={syncTelemetry.isOnline}
        isSyncing={syncTelemetry.isSyncing}
        pendingCount={syncStats.pending}
        syncedCount={syncStats.synced}
        failedCount={syncStats.failed}
        lastSyncTimestamp={syncTelemetry.lastSyncTimestamp}
        onToggleNetwork={handleToggleNetwork}
        onTriggerSync={handleTriggerSync}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-12">
        {activeTab === 'cashier' && (
          <CashierView
            catalog={catalog}
            tables={tables}
            customers={customers}
            initialTableId={preselectedTable}
            activeShift={activeShift}
            onPlaceOrder={handlePlaceOrder}
            onUpsertCustomer={handleUpsertCustomer}
            onCreateUpiIntent={handleCreateUpiIntent}
            onVerifyUpiSoundbox={handleVerifyUpiSoundbox}
            onViewPrintJob={(job) => setSelectedPrintJob(job)}
            recentJobs={spoolJobs}
          />
        )}

        {activeTab === 'tables' && (
          <TableManagementView
            tables={tables}
            onTransferTable={handleTransferTable}
            onMergeTables={handleMergeTables}
            onSplitEqual={handleSplitEqual}
            onSplitItems={handleSplitItems}
            onViewPrintJob={(job) => setSelectedPrintJob(job)}
            onOpenTableInCashier={(tableId: string) => {
              setPreselectedTable(tableId);
              setActiveTab('cashier');
            }}
          />
        )}

        {activeTab === 'kds' && (
          <KitchenKdsView
            orders={orders}
            catalog={catalog}
            onUpdateStatus={handleUpdateStatus}
            onPunchLanOrder={handlePunchLanOrder}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            inventory={inventory}
            bomList={bomList}
            catalog={catalog}
            onRestock={handleRestock}
          />
        )}

        {activeTab === 'shifts' && (
          <ShiftManagementView
            activeShift={activeShift}
            shiftHistory={shiftHistory}
            onOpenShift={handleOpenShift}
            onRecordAdjustment={handleRecordAdjustment}
            onCloseBlindDrop={handleCloseBlindDrop}
            onViewPrintJob={(job) => setSelectedPrintJob(job)}
          />
        )}

        {activeTab === 'cloud' && (
          <CloudSyncView
            localOrders={orders}
            cloudOrders={cloudOrders}
            cloudMetrics={cloudMetrics}
            webhookLogs={webhookLogs}
            onTriggerSync={handleTriggerSync}
            onSimulateWebhook={handleSimulateWebhook}
          />
        )}
      </main>

      {/* Thermal Paper Slip Modal Previewer */}
      <ThermalReceiptModal
        job={selectedPrintJob}
        onClose={() => setSelectedPrintJob(null)}
      />
    </div>
  );
}
