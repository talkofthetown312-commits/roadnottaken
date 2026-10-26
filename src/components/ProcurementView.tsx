import React, { useState } from 'react';
import {
  Truck,
  Plus,
  PackageCheck,
  Building2,
  FileText,
  AlertTriangle,
  Printer,
  Barcode,
  Search,
  CheckCircle2,
  Calendar,
  DollarSign
} from 'lucide-react';
import {
  Supplier,
  PurchaseOrder,
  GoodsReceivedNote,
  InventoryItem,
  PrintSpoolJob
} from '../server/types';

interface ProcurementViewProps {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  grnList: GoodsReceivedNote[];
  inventory: InventoryItem[];
  onCreatePO: (poData: {
    supplier_id: string;
    notes?: string;
    expected_delivery_date: string;
    items: Array<{ ingredient_id: string; ordered_quantity: number; unit_price: number }>;
  }) => Promise<any>;
  onReceiveGrn: (grnData: {
    po_id: string;
    invoice_ref_number: string;
    received_by: string;
    discrepancy_note?: string;
    items: Array<{ ingredient_id: string; received_quantity: number; rejected_quantity?: number; unit_price: number; remarks?: string }>;
  }) => Promise<{ success: boolean; grn?: GoodsReceivedNote; spoolJob?: PrintSpoolJob; error?: string }>;
  onCreateSupplier: (data: Omit<Supplier, 'supplier_id' | 'rating' | 'is_active'>) => Promise<any>;
  onViewPrintJob: (job: PrintSpoolJob) => void;
}

export const ProcurementView: React.FC<ProcurementViewProps> = ({
  suppliers,
  purchaseOrders,
  grnList,
  inventory,
  onCreatePO,
  onReceiveGrn,
  onCreateSupplier,
  onViewPrintJob,
}) => {
  const [activeTab, setActiveTab] = useState<'pos' | 'grn' | 'suppliers'>('pos');
  const [showCreatePoModal, setShowCreatePoModal] = useState(false);
  const [showGrnModal, setShowGrnModal] = useState<PurchaseOrder | null>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeResult, setBarcodeResult] = useState<{ name: string; type: string; info: string } | null>(null);

  // New PO State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.supplier_id || '');
  const [poDeliveryDate, setPoDeliveryDate] = useState<string>(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [poNotes, setPoNotes] = useState<string>('');
  const [poDraftItems, setPoDraftItems] = useState<Array<{ ingredient_id: string; ordered_quantity: number; unit_price: number }>>([
    { ingredient_id: inventory[0]?.ingredient_id || 'TOT-001', ordered_quantity: 10, unit_price: 220 }
  ]);
  const [isSubmittingPo, setIsSubmittingPo] = useState(false);

  // GRN Modal State
  const [grnInvoiceRef, setGrnInvoiceRef] = useState<string>('');
  const [grnReceivedBy, setGrnReceivedBy] = useState<string>('Inventory Store Manager');
  const [grnDiscrepancyNotes, setGrnDiscrepancyNotes] = useState<string>('');
  const [grnItemEntries, setGrnItemEntries] = useState<{ [ingId: string]: { received_quantity: number; rejected_quantity: number; unit_price: number } }>({});
  const [isSubmittingGrn, setIsSubmittingGrn] = useState(false);

  // New Supplier State
  const [newSupName, setNewSupName] = useState('');
  const [newSupCategory, setNewSupCategory] = useState<any>('Dairy');
  const [newSupContact, setNewSupContact] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupGstin, setNewSupGstin] = useState('');

  // Barcode quick lookup
  const handleBarcodeSearch = async (codeToSearch?: string) => {
    const code = (codeToSearch || barcodeInput).trim();
    if (!code) return;
    try {
      const res = await fetch(`/api/procurement/barcode/${code}`);
      const data = await res.json();
      if (data.type === 'MENU_ITEM') {
        setBarcodeResult({
          name: data.data.name,
          type: 'Catalog Menu Dish',
          info: `Price: ₹${data.data.price} · Category: ${data.data.category} · Station: ${data.data.station}`
        });
      } else if (data.type === 'INGREDIENT') {
        setBarcodeResult({
          name: data.data.name,
          type: 'Raw Material Ingredient',
          info: `Current Stock: ${data.data.current_stock} ${data.data.unit} · Weighted Avg Cost: ₹${data.data.cost_per_unit}/${data.data.unit}`
        });
      } else {
        setBarcodeResult({
          name: `Barcode: ${code}`,
          type: 'Not Registered',
          info: 'Item barcode not found in catalog or raw material inventory.'
        });
      }
    } catch {
      setBarcodeResult(null);
    }
  };

  const openGrnForPo = (po: PurchaseOrder) => {
    setShowGrnModal(po);
    setGrnInvoiceRef(`INV-SUP-${Math.floor(1000 + Math.random() * 9000)}`);
    const initialMap: typeof grnItemEntries = {};
    for (const item of po.items) {
      initialMap[item.ingredient_id] = {
        received_quantity: Math.max(0, item.ordered_quantity - item.received_quantity),
        rejected_quantity: 0,
        unit_price: item.unit_price,
      };
    }
    setGrnItemEntries(initialMap);
  };

  const handleExecuteGrn = async () => {
    if (!showGrnModal) return;
    setIsSubmittingGrn(true);
    try {
      const itemsPayload = showGrnModal.items.map((it) => {
        const entry = grnItemEntries[it.ingredient_id] || {
          received_quantity: it.ordered_quantity,
          rejected_quantity: 0,
          unit_price: it.unit_price
        };
        return {
          ingredient_id: it.ingredient_id,
          received_quantity: entry.received_quantity,
          rejected_quantity: entry.rejected_quantity,
          unit_price: entry.unit_price,
        };
      });

      const res = await onReceiveGrn({
        po_id: showGrnModal.po_id,
        invoice_ref_number: grnInvoiceRef,
        received_by: grnReceivedBy,
        discrepancy_note: grnDiscrepancyNotes || undefined,
        items: itemsPayload,
      });

      if (res.success) {
        setShowGrnModal(null);
        if (res.spoolJob) {
          onViewPrintJob(res.spoolJob);
        }
      }
    } finally {
      setIsSubmittingGrn(false);
    }
  };

  const handleCreatePoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPo(true);
    try {
      await onCreatePO({
        supplier_id: selectedSupplierId,
        notes: poNotes || undefined,
        expected_delivery_date: `${poDeliveryDate} 10:00:00`,
        items: poDraftItems,
      });
      setShowCreatePoModal(false);
      setPoNotes('');
    } finally {
      setIsSubmittingPo(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Procurement Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <span className="text-xs font-medium text-slate-500 block">Vetted Suppliers</span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            {suppliers.length}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Dairy, Poultry, Dry Goods</span>
        </div>

        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <span className="text-xs font-medium text-slate-500 block">Open Purchase Orders</span>
          <span className="text-2xl font-bold font-mono text-blue-600 mt-1 block">
            {purchaseOrders.filter((p) => p.status === 'ISSUED' || p.status === 'PARTIALLY_RECEIVED').length}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Awaiting delivery & GRN</span>
        </div>

        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <span className="text-xs font-medium text-slate-500 block">Goods Received (GRN)</span>
          <span className="text-2xl font-bold font-mono text-emerald-600 mt-1 block">
            {grnList.length}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Atomic inventory inwardings</span>
        </div>

        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <span className="text-xs font-medium text-slate-500 block">Total Inward Valuation</span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            ₹{grnList.reduce((sum, g) => sum + g.total_received_cost, 0).toFixed(2)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Weighted avg cost basis</span>
        </div>
      </div>

      {/* Barcode & SKU Peripheral Hardware Scanner Hub */}
      <div className="p-4 bg-white rounded-lg border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0">
            <Barcode className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <span>Barcode & SKU Peripheral Bridge</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 font-semibold">
                USB HID / Camera Ready
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Scans hardware EAN-13 barcodes on stock deliveries or customer dishes for instant lookup.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBarcodeSearch()}
              placeholder="Scan or enter EAN barcode..."
              className="pl-3 pr-8 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-slate-900 w-56"
            />
            <button
              onClick={() => handleBarcodeSearch()}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-900"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick barcode simulation buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setBarcodeInput('TOT-BAR-001');
                void handleBarcodeSearch('TOT-BAR-001');
              }}
              className="px-2 py-1 text-[10px] font-mono font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
              title="TOT-001 Chicken Raw Material Barcode"
            >
              Chicken (TOT-001)
            </button>
            <button
              onClick={() => {
                setBarcodeInput('8903001001011');
                void handleBarcodeSearch('8903001001011');
              }}
              className="px-2 py-1 text-[10px] font-mono font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
              title="Veg Chowmein (Small) Menu Barcode"
            >
              Chowmein (Dish)
            </button>
          </div>
        </div>
      </div>

      {/* Barcode Search Result Card */}
      {barcodeResult && (
        <div className="p-3.5 rounded-lg bg-orange-50/80 border border-orange-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-slate-900">{barcodeResult.name}</span>
              <span className="text-[11px] font-semibold text-orange-800 ml-2">[{barcodeResult.type}]</span>
              <p className="text-[11px] text-slate-600 mt-0.5 font-mono">{barcodeResult.info}</p>
            </div>
          </div>
          <button
            onClick={() => setBarcodeResult(null)}
            className="text-xs text-slate-400 hover:text-slate-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation & Primary Action */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'pos'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Purchase Orders ({purchaseOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('grn')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'grn'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Goods Received Notes ({grnList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'suppliers'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Suppliers Directory ({suppliers.length})</span>
          </button>
        </div>

        {activeTab === 'pos' && (
          <button
            onClick={() => setShowCreatePoModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Purchase Order</span>
          </button>
        )}

        {activeTab === 'suppliers' && (
          <button
            onClick={() => setShowSupplierModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Supplier</span>
          </button>
        )}
      </div>

      {/* Tab 1: Purchase Orders Ledger */}
      {activeTab === 'pos' && (
        <div className="space-y-3">
          {purchaseOrders.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-lg border border-slate-200 text-slate-400 text-xs">
              <p>No Purchase Orders recorded yet.</p>
              <p className="text-[11px] mt-1 text-slate-500">Click "Create Purchase Order" to issue an order to a supplier.</p>
            </div>
          ) : (
            purchaseOrders.map((po) => (
              <div
                key={po.po_id}
                className="p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-sm text-slate-900">{po.po_number}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-semibold text-xs text-slate-800">{po.supplier_name}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        po.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : po.status === 'PARTIALLY_RECEIVED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {po.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                      ₹{po.grand_total.toFixed(2)}
                    </span>

                    {(po.status === 'ISSUED' || po.status === 'PARTIALLY_RECEIVED') && (
                      <button
                        onClick={() => openGrnForPo(po)}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors shadow-2xs"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>Receive Delivery (GRN)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* PO Line Items */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {po.items.map((it) => (
                    <div key={it.po_item_id} className="p-2 bg-slate-50 rounded border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-slate-800 block">{it.ingredient_name}</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Ordered: {it.ordered_quantity} {it.unit} @ ₹{it.unit_price}
                        </span>
                      </div>
                      <span className={`text-[11px] font-mono font-bold ${it.received_quantity >= it.ordered_quantity ? 'text-emerald-700' : 'text-slate-700'}`}>
                        Recvd: {it.received_quantity}
                      </span>
                    </div>
                  ))}
                </div>

                {po.notes && (
                  <p className="text-[11px] text-slate-500 italic">Notes: {po.notes}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Goods Received Notes (GRN) Ledger */}
      {activeTab === 'grn' && (
        <div className="space-y-3">
          {grnList.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-lg border border-slate-200 text-slate-400 text-xs">
              <p>No Goods Received Notes recorded yet.</p>
              <p className="text-[11px] mt-1 text-slate-500">Receive stock deliveries against issued Purchase Orders to generate GRNs.</p>
            </div>
          ) : (
            grnList.map((grn) => (
              <div
                key={grn.grn_id}
                className="p-4 bg-white rounded-lg border border-slate-200 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-sm text-emerald-800">{grn.grn_number}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-xs text-slate-700">PO: <strong className="font-mono">{grn.po_number}</strong></span>
                    <span className="text-slate-400">·</span>
                    <span className="font-semibold text-xs text-slate-800">{grn.supplier_name}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        grn.status === 'ACCEPTED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {grn.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      Inv Ref: <strong className="font-mono text-slate-800">{grn.invoice_ref_number}</strong>
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                      ₹{grn.total_received_cost.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* GRN Inward Items */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {grn.items.map((gi) => (
                    <div key={gi.grn_item_id} className="p-2.5 bg-slate-50 rounded border border-slate-100">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-slate-900">{gi.ingredient_name}</span>
                        <span className="font-mono font-bold text-slate-900">₹{gi.total_cost.toFixed(2)}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-1">
                        Received: <strong>{gi.received_quantity} {gi.unit}</strong> @ ₹{gi.unit_price}
                        {gi.rejected_quantity > 0 && (
                          <span className="text-red-600 ml-1.5">(Rejected: {gi.rejected_quantity})</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Received By: <strong>{grn.received_by}</strong> on {new Date(grn.received_at).toLocaleDateString()}</span>
                  {grn.discrepancy_note && (
                    <span className="text-amber-700 italic">Discrepancy: {grn.discrepancy_note}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Suppliers Directory */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {suppliers.map((s) => (
            <div key={s.supplier_id} className="p-4 bg-white rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{s.name}</h4>
                  <span className="text-[10px] font-semibold text-orange-700 block mt-0.5">{s.category}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                  ★ {s.rating}
                </span>
              </div>

              <div className="text-xs text-slate-600 space-y-0.5 pt-1 border-t border-slate-100">
                <p>Contact: <strong className="text-slate-800">{s.contact_person}</strong></p>
                <p>Phone: <strong className="font-mono text-slate-800">{s.phone}</strong></p>
                <p className="font-mono text-[11px] text-slate-500">GSTIN: {s.gstin}</p>
                <p className="text-[11px] text-slate-500">Credit Terms: {s.payment_terms_days} days</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Receive Delivery (GRN) */}
      {showGrnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Goods Received Note (GRN) Inwarding
                </h3>
                <span className="text-xs text-slate-500">
                  PO: <strong className="font-mono text-slate-800">{showGrnModal.po_number}</strong> · Supplier: {showGrnModal.supplier_name}
                </span>
              </div>
              <button onClick={() => setShowGrnModal(null)} className="text-slate-400 hover:text-slate-900">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supplier Delivery Invoice Ref #</label>
                <input
                  type="text"
                  required
                  value={grnInvoiceRef}
                  onChange={(e) => setGrnInvoiceRef(e.target.value)}
                  placeholder="e.g. INV-HERITAGE-4412"
                  className="w-full px-2.5 py-1.5 font-mono bg-slate-50 border border-slate-200 rounded focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Received By (Store Keeper)</label>
                <input
                  type="text"
                  required
                  value={grnReceivedBy}
                  onChange={(e) => setGrnReceivedBy(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded focus:bg-white"
                />
              </div>
            </div>

            {/* Line items verification */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 block">Verify Delivery Quantities & Unit Costs:</span>
              {showGrnModal.items.map((it) => {
                const entry = grnItemEntries[it.ingredient_id] || {
                  received_quantity: it.ordered_quantity,
                  rejected_quantity: 0,
                  unit_price: it.unit_price
                };
                return (
                  <div key={it.po_item_id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">{it.ingredient_name}</span>
                      <span className="text-slate-500 font-mono">Ordered: {it.ordered_quantity} {it.unit}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Accepted Qty ({it.unit}):</label>
                        <input
                          type="number"
                          min="0"
                          value={entry.received_quantity}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setGrnItemEntries((prev) => ({
                              ...prev,
                              [it.ingredient_id]: { ...entry, received_quantity: val }
                            }));
                          }}
                          className="w-full px-2 py-1 font-mono bg-white border border-slate-200 rounded"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Rejected/Damaged Qty:</label>
                        <input
                          type="number"
                          min="0"
                          value={entry.rejected_quantity}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setGrnItemEntries((prev) => ({
                              ...prev,
                              [it.ingredient_id]: { ...entry, rejected_quantity: val }
                            }));
                          }}
                          className="w-full px-2 py-1 font-mono bg-white border border-slate-200 rounded"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Agreed Unit Rate (₹):</label>
                        <input
                          type="number"
                          step="0.01"
                          value={entry.unit_price}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setGrnItemEntries((prev) => ({
                              ...prev,
                              [it.ingredient_id]: { ...entry, unit_price: val }
                            }));
                          }}
                          className="w-full px-2 py-1 font-mono bg-white border border-slate-200 rounded"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Discrepancy / Inspection Notes (Optional)</label>
              <textarea
                value={grnDiscrepancyNotes}
                onChange={(e) => setGrnDiscrepancyNotes(e.target.value)}
                placeholder="e.g. 500g paneer damaged during transit. Temperature verified 4 deg C."
                rows={2}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGrnModal(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingGrn}
                onClick={handleExecuteGrn}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors shadow-sm flex items-center gap-1.5"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>{isSubmittingGrn ? 'Inwarding Stock...' : 'Commit GRN & Recalculate Weighted Cost'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Purchase Order */}
      {showCreatePoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Create Formal Purchase Order</h3>
              <button onClick={() => setShowCreatePoModal(false)} className="text-slate-400 hover:text-slate-900">✕</button>
            </div>

            <form onSubmit={handleCreatePoSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Supplier</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                >
                  {suppliers.map((s) => (
                    <option key={s.supplier_id} value={s.supplier_id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  required
                  value={poDeliveryDate}
                  onChange={(e) => setPoDeliveryDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Raw Material Line Items</label>
                {poDraftItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <select
                      value={item.ingredient_id}
                      onChange={(e) => {
                        const newId = e.target.value;
                        const ing = inventory.find((i) => i.ingredient_id === newId);
                        const updated = [...poDraftItems];
                        updated[idx] = {
                          ...updated[idx],
                          ingredient_id: newId,
                          unit_price: ing ? ing.cost_per_unit : 0.5
                        };
                        setPoDraftItems(updated);
                      }}
                      className="flex-1 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                    >
                      {inventory.map((ing) => (
                        <option key={ing.ingredient_id} value={ing.ingredient_id}>
                          {ing.name} ({ing.unit})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.ordered_quantity}
                      onChange={(e) => {
                        const updated = [...poDraftItems];
                        updated[idx] = { ...updated[idx], ordered_quantity: Number(e.target.value) };
                        setPoDraftItems(updated);
                      }}
                      className="w-24 px-2 py-1.5 font-mono bg-slate-50 border border-slate-200 rounded text-xs"
                    />

                    <input
                      type="number"
                      step="0.01"
                      placeholder="Rate"
                      value={item.unit_price}
                      onChange={(e) => {
                        const updated = [...poDraftItems];
                        updated[idx] = { ...updated[idx], unit_price: Number(e.target.value) };
                        setPoDraftItems(updated);
                      }}
                      className="w-24 px-2 py-1.5 font-mono bg-slate-50 border border-slate-200 rounded text-xs"
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setPoDraftItems([
                      ...poDraftItems,
                      { ingredient_id: inventory[0]?.ingredient_id || 'ing-paneer', ordered_quantity: 1000, unit_price: 0.5 }
                    ]);
                  }}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                >
                  + Add Another Line Item
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Special Delivery Instructions</label>
                <textarea
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="e.g. Inspect cold seal. Morning inwarding only."
                  rows={2}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePoModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPo}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded shadow-sm"
                >
                  {isSubmittingPo ? 'Issuing PO...' : 'Issue Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Supplier */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add Raw Material Supplier</h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-slate-900">✕</button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onCreateSupplier({
                  name: newSupName,
                  category: newSupCategory,
                  contact_person: newSupContact,
                  phone: newSupPhone,
                  gstin: newSupGstin || '29AAACH1234F1Z8',
                  payment_terms_days: 15,
                });
                setShowSupplierModal(false);
                setNewSupName('');
              }}
              className="space-y-3"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Supplier Name</label>
                <input
                  type="text"
                  required
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  placeholder="e.g. Amul Dairy Cooperative"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={newSupCategory}
                  onChange={(e) => setNewSupCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                >
                  <option value="Dairy">Dairy</option>
                  <option value="Poultry & Meat">Poultry & Meat</option>
                  <option value="Produce & Veg">Produce & Veg</option>
                  <option value="Dry Grocery & Grains">Dry Grocery & Grains</option>
                  <option value="Packaging & Eco-ware">Packaging & Eco-ware</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  required
                  value={newSupContact}
                  onChange={(e) => setNewSupContact(e.target.value)}
                  placeholder="Key Account Rep"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={newSupPhone}
                  onChange={(e) => setNewSupPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  className="w-full px-2.5 py-1.5 font-mono bg-slate-50 border border-slate-200 rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supplier GSTIN</label>
                <input
                  type="text"
                  value={newSupGstin}
                  onChange={(e) => setNewSupGstin(e.target.value)}
                  placeholder="29AAACH1234F1Z8"
                  className="w-full px-2.5 py-1.5 font-mono bg-slate-50 border border-slate-200 rounded"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-3 py-1.5 font-semibold text-slate-600 bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-slate-900 rounded shadow-sm"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
