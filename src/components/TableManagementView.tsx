import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  Users,
  ArrowRightLeft,
  GitMerge,
  Split,
  Printer,
  CheckCircle2,
  UtensilsCrossed,
  Clock
} from 'lucide-react';
import {
  DiningTable,
  PaymentMethod,
  PrintSpoolJob,
  TableSection
} from '../server/types.js';

interface TableManagementViewProps {
  tables: DiningTable[];
  onTransferTable: (fromTableId: string, toTableId: string) => Promise<{ success: boolean; error?: string }>;
  onMergeTables: (primaryTableId: string, secondaryTableId: string) => Promise<{ success: boolean; error?: string }>;
  onSplitEqual: (
    orderId: string,
    splitCount: number,
    tenders: PaymentMethod[]
  ) => Promise<{ success: boolean; spoolJobs?: PrintSpoolJob[]; error?: string }>;
  onSplitItems: (
    orderId: string,
    itemBucketMap: { [orderItemId: string]: 'A' | 'B' },
    tenderA: PaymentMethod,
    tenderB: PaymentMethod
  ) => Promise<{ success: boolean; spoolJobs?: PrintSpoolJob[]; error?: string }>;
  onOpenTableInCashier: (tableId: string) => void;
  onViewPrintJob: (job: PrintSpoolJob) => void;
}

export const TableManagementView: React.FC<TableManagementViewProps> = ({
  tables,
  onTransferTable,
  onMergeTables,
  onSplitEqual,
  onSplitItems,
  onOpenTableInCashier,
  onViewPrintJob,
}) => {
  const [sectionFilter, setSectionFilter] = useState<'ALL' | TableSection>('ALL');
  const [selectedTableId, setSelectedTableId] = useState<string>('T-02');
  const [splitTab, setSplitTab] = useState<'equal' | 'items' | 'transfer'>('equal');

  // Equal split state
  const [equalGuestCount, setEqualGuestCount] = useState<number>(2);
  const [equalTenders, setEqualTenders] = useState<PaymentMethod[]>(['CASH', 'UPI', 'CARD', 'CASH', 'UPI', 'CARD']);

  // Item-wise split state
  const [itemBucketMap, setItemBucketMap] = useState<{ [orderItemId: string]: 'A' | 'B' }>({});
  const [tenderA, setTenderA] = useState<PaymentMethod>('CASH');
  const [tenderB, setTenderB] = useState<PaymentMethod>('UPI');

  // Transfer & Merge target states
  const [transferTargetId, setTransferTargetId] = useState<string>('T-01');
  const [mergeTargetId, setMergeTargetId] = useState<string>('T-06');

  const [statusFeedback, setStatusFeedback] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);
  const [lastSpooledSplits, setLastSpooledSplits] = useState<PrintSpoolJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedTable = tables.find((t) => t.table_id === selectedTableId) || tables[0];
  const activeOrder = selectedTable?.active_order || null;

  // Initialize default item bucket assignments whenever activeOrder changes
  useEffect(() => {
    if (activeOrder && activeOrder.items.length > 0) {
      const nextMap: { [id: string]: 'A' | 'B' } = {};
      activeOrder.items.forEach((it, idx) => {
        nextMap[it.order_item_id] = idx % 2 === 0 ? 'A' : 'B';
      });
      setItemBucketMap(nextMap);
    }
  }, [activeOrder?.order_id]);

  const availableTables = tables.filter((t) => t.status === 'AVAILABLE' && t.table_id !== selectedTable?.table_id);
  const mergeCandidateTables = tables.filter((t) => t.table_id !== selectedTable?.table_id);

  useEffect(() => {
    if (availableTables.length > 0 && !availableTables.some((t) => t.table_id === transferTargetId)) {
      setTransferTargetId(availableTables[0].table_id);
    }
  }, [availableTables, transferTargetId]);

  const filteredTables = tables.filter((t) =>
    sectionFilter === 'ALL' ? true : t.section === sectionFilter
  );

  const occupiedCount = tables.filter((t) => t.status === 'OCCUPIED').length;
  const availableCount = tables.filter((t) => t.status === 'AVAILABLE').length;
  const runningFloorValue = tables.reduce(
    (sum, t) => sum + (t.active_order && !t.merged_with_table_id ? t.active_order.grand_total : 0),
    0
  );

  const handleEqualSplitSubmit = async () => {
    if (!activeOrder) return;
    setIsProcessing(true);
    setStatusFeedback(null);
    try {
      const res = await onSplitEqual(
        activeOrder.order_id,
        equalGuestCount,
        equalTenders.slice(0, equalGuestCount)
      );
      if (res.success) {
        setLastSpooledSplits(res.spoolJobs || []);
        setStatusFeedback({
          type: 'ok',
          message: `Order #${activeOrder.invoice_number} split equally across ${equalGuestCount} guests & settled! ${res.spoolJobs?.length || 0} thermal receipts spooled.`
        });
      } else {
        setStatusFeedback({ type: 'err', message: res.error || 'Equal split failed' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleItemSplitSubmit = async () => {
    if (!activeOrder) return;
    setIsProcessing(true);
    setStatusFeedback(null);
    try {
      const res = await onSplitItems(activeOrder.order_id, itemBucketMap, tenderA, tenderB);
      if (res.success) {
        setLastSpooledSplits(res.spoolJobs || []);
        setStatusFeedback({
          type: 'ok',
          message: `Seat/Item split completed (#${activeOrder.invoice_number}-A & -B)! Both receipts spooled and table freed.`
        });
      } else {
        setStatusFeedback({ type: 'err', message: res.error || 'Item split failed' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransferSubmit = async () => {
    if (!selectedTable || !transferTargetId) return;
    setIsProcessing(true);
    setStatusFeedback(null);
    try {
      const res = await onTransferTable(selectedTable.table_id, transferTargetId);
      if (res.success) {
        setSelectedTableId(transferTargetId);
        setStatusFeedback({
          type: 'ok',
          message: `Transferred running order from ${selectedTable.table_id} to ${transferTargetId}.`
        });
      } else {
        setStatusFeedback({ type: 'err', message: res.error || 'Transfer failed' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMergeSubmit = async () => {
    if (!selectedTable || !mergeTargetId) return;
    setIsProcessing(true);
    setStatusFeedback(null);
    try {
      const res = await onMergeTables(selectedTable.table_id, mergeTargetId);
      if (res.success) {
        setStatusFeedback({
          type: 'ok',
          message: `Merged ${mergeTargetId} into primary table ${selectedTable.table_id}. Running KOT items consolidated atomically.`
        });
      } else {
        setStatusFeedback({ type: 'err', message: res.error || 'Table merge failed' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Compute live preview math for Equal Split
  const equalSharesPreview = React.useMemo(() => {
    if (!activeOrder) return [];
    const totalMinor = Math.round(activeOrder.grand_total * 100);
    const baseMinor = Math.floor(totalMinor / equalGuestCount);
    return Array.from({ length: equalGuestCount }, (_, idx) => {
      const isLast = idx === equalGuestCount - 1;
      const amount = (isLast ? totalMinor - baseMinor * (equalGuestCount - 1) : baseMinor) / 100;
      return {
        index: idx + 1,
        invoiceSuffix: `${activeOrder.invoice_number}-S${idx + 1}`,
        amount,
        tender: equalTenders[idx] || 'CASH'
      };
    });
  }, [activeOrder, equalGuestCount, equalTenders]);

  // Compute live preview math for Item-Wise Split
  const itemSplitPreview = React.useMemo(() => {
    if (!activeOrder) return { subA: 0, grandA: 0, subB: 0, grandB: 0, countA: 0, countB: 0 };
    const itemsA = activeOrder.items.filter((i) => (itemBucketMap[i.order_item_id] || 'A') === 'A');
    const itemsB = activeOrder.items.filter((i) => itemBucketMap[i.order_item_id] === 'B');
    const subA = itemsA.reduce((s, i) => s + i.sub_total, 0);
    const subB = itemsB.reduce((s, i) => s + i.sub_total, 0);
    const grandA = Math.round(subA * 1.05 * 100) / 100;
    const grandB = Math.round(subB * 1.05 * 100) / 100;
    return { subA, grandA, subB, grandB, countA: itemsA.length, countB: itemsB.length };
  }, [activeOrder, itemBucketMap]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Floor Summary Bar */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-orange-600" />
            <span>Visual Dining Floor Map & Split-Billing Engine</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Live table occupancy across dining zones with atomic SQLite table transfer, multi-table order merging, and equal or seat-wise split billing.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono shrink-0">
          <div className="text-right">
            <span className="text-slate-500 block">Floor Occupancy</span>
            <strong className="text-slate-900 font-bold">
              {occupiedCount} Occupied · {availableCount} Available
            </strong>
          </div>
          <span className="text-slate-300" aria-hidden="true">|</span>
          <div className="text-right">
            <span className="text-slate-500 block">Running Floor Value</span>
            <strong className="text-orange-600 font-bold tabular-nums">
              ₹{runningFloorValue.toFixed(2)}
            </strong>
          </div>
        </div>
      </div>

      {/* Feedback Banner & Spooled Split Receipts */}
      {statusFeedback && (
        <div
          className={`p-4 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            statusFeedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusFeedback.message}</span>
          </div>

          {lastSpooledSplits.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {lastSpooledSplits.map((job) => (
                <button
                  key={job.job_id}
                  onClick={() => onViewPrintJob(job)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-emerald-300 text-emerald-900 font-mono font-semibold hover:bg-emerald-100 transition-colors"
                >
                  <Printer className="w-3 h-3" />
                  <span>View Split Slip</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Interactive Floor Plan Matrix */}
        <div className="lg:col-span-7 space-y-4">
          {/* Section Filter Tabs */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              {(['ALL', 'AC Main Hall', 'Open Courtyard', 'Bar Lounge'] as const).map((sec) => (
                <button
                  key={sec}
                  onClick={() => setSectionFilter(sec)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                    sectionFilter === sec
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {sec === 'ALL' ? 'All Zones (12)' : sec}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-slate-500 font-mono">
              Click any table to inspect or split bill
            </div>
          </div>

          {/* 12-Table Visual Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {filteredTables.map((tbl) => {
              const isSelected = tbl.table_id === selectedTable?.table_id;
              const isOccupied = tbl.status === 'OCCUPIED';

              return (
                <button
                  key={tbl.table_id}
                  type="button"
                  onClick={() => {
                    setSelectedTableId(tbl.table_id);
                    setStatusFeedback(null);
                  }}
                  className={`p-4 rounded-lg border text-left transition-all flex flex-col justify-between min-h-[132px] ${
                    isSelected
                      ? 'ring-2 ring-slate-900 border-slate-900 bg-white shadow-sm'
                      : isOccupied
                      ? 'bg-amber-50/50 border-amber-300 hover:border-amber-400'
                      : 'bg-white border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <div className="w-full">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {tbl.table_id}
                      </span>
                      <span
                        className={`text-[11px] font-mono font-bold uppercase ${
                          isOccupied ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {tbl.merged_with_table_id
                          ? `MERGED → ${tbl.merged_with_table_id}`
                          : tbl.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <span>{tbl.section}</span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-0.5 font-mono">
                        <Users className="w-3 h-3" />
                        {tbl.capacity}
                      </span>
                    </div>
                  </div>

                  {isOccupied && tbl.active_order ? (
                    <div className="w-full pt-2.5 mt-2.5 border-t border-amber-200/80 flex items-baseline justify-between">
                      <span className="text-[11px] font-mono text-slate-600 truncate">
                        #{tbl.active_order.invoice_number}
                      </span>
                      <span className="text-sm font-mono font-bold text-orange-600 tabular-nums">
                        ₹{tbl.active_order.grand_total.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Ready to seat</span>
                      <span className="font-mono">₹0.00</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 5 Columns: Selected Table Inspector & Split-Bill Console */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-5 space-y-4 shadow-xs">
          {selectedTable && (
            <>
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 font-mono">
                      {selectedTable.table_id} — {selectedTable.table_name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedTable.section} · Capacity: {selectedTable.capacity} Seats · Status: {selectedTable.status}
                  </p>
                </div>

                {activeOrder && (
                  <div className="text-right font-mono">
                    <span className="text-[11px] text-slate-500 block">
                      #{activeOrder.invoice_number}
                    </span>
                    <span className="text-base font-bold text-orange-600 tabular-nums">
                      ₹{activeOrder.grand_total.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {!activeOrder ? (
                /* Available Table State */
                <div className="py-8 text-center space-y-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <UtensilsCrossed className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">
                      {selectedTable.table_name} is Available
                    </h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Punch a new Dine-In order on this table from the Cashier Terminal, or select an occupied table (such as T-02 or T-06) to split bills or transfer tables.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenTableInCashier(selectedTable.table_id)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    <span>Punch Order on {selectedTable.table_id}</span>
                  </button>
                </div>
              ) : (
                /* Occupied Table — Split-Bill & Transfer/Merge Console */
                <div className="space-y-4">
                  {/* Running KOT Items Summary */}
                  <div className="bg-slate-50 p-3 rounded-md border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pb-1 border-b border-slate-200">
                      <span>RUNNING TABLE ITEMS ({activeOrder.items.length})</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>Sub: ₹{activeOrder.sub_total.toFixed(2)} + GST: ₹{activeOrder.tax_total.toFixed(2)}</span>
                      </span>
                    </div>
                    {activeOrder.items.map((it) => (
                      <div key={it.order_item_id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-800 font-medium">
                          {it.item_name} <span className="text-slate-400 font-mono">x{it.quantity}</span>
                        </span>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          ₹{it.sub_total.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Mode Selector Tabs: Equal Split | Seat/Item Split | Transfer & Merge */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setSplitTab('equal')}
                      className={`flex-1 py-1.5 px-2 rounded-md font-semibold transition-colors whitespace-nowrap ${
                        splitTab === 'equal'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Equal Split (1/N)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitTab('items')}
                      className={`flex-1 py-1.5 px-2 rounded-md font-semibold transition-colors whitespace-nowrap ${
                        splitTab === 'items'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Seat / Item Split
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitTab('transfer')}
                      className={`flex-1 py-1.5 px-2 rounded-md font-semibold transition-colors whitespace-nowrap ${
                        splitTab === 'transfer'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Transfer / Merge
                    </button>
                  </div>

                  {/* TAB 1: Equal Split Calculator */}
                  {splitTab === 'equal' && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">
                          Divide Equally Across Guests:
                        </span>
                        <div className="flex items-center gap-1">
                          {[2, 3, 4, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setEqualGuestCount(num)}
                              className={`w-7 h-7 rounded font-mono text-xs font-bold transition-colors ${
                                equalGuestCount === num
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
                        {equalSharesPreview.map((share, idx) => (
                          <div
                            key={share.index}
                            className="p-2.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <span className="font-semibold text-slate-900 block">
                                Guest {share.index} Share
                              </span>
                              <span className="text-[11px] font-mono text-slate-500">
                                #{share.invoiceSuffix}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <select
                                value={equalTenders[idx] || 'CASH'}
                                onChange={(e) => {
                                  const next = [...equalTenders];
                                  next[idx] = e.target.value as PaymentMethod;
                                  setEqualTenders(next);
                                }}
                                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800"
                              >
                                <option value="CASH">Cash</option>
                                <option value="UPI">UPI QR</option>
                                <option value="CARD">Card</option>
                              </select>

                              <span className="font-mono font-bold text-slate-900 tabular-nums min-w-[70px] text-right">
                                ₹{share.amount.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleEqualSplitSubmit}
                        disabled={isProcessing}
                        className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <Split className="w-3.5 h-3.5" />
                        <span>
                          {isProcessing
                            ? 'Splitting & Spooling...'
                            : `Settle ${equalGuestCount} Split Bills & Print Receipts`}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* TAB 2: Seat / Item-Wise Split Calculator */}
                  {splitTab === 'items' && (
                    <div className="space-y-3 pt-1">
                      <p className="text-[11px] text-slate-500">
                        Assign each dish to <strong>Bill A</strong> or <strong>Bill B</strong> to generate two separate tax invoices:
                      </p>

                      <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                        {activeOrder.items.map((it) => {
                          const bucket = itemBucketMap[it.order_item_id] || 'A';
                          return (
                            <div
                              key={it.order_item_id}
                              className="p-2 bg-slate-50 rounded border border-slate-200 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold text-slate-900 block truncate">
                                  {it.item_name} (x{it.quantity})
                                </span>
                                <span className="font-mono text-[11px] text-slate-500">
                                  ₹{it.sub_total.toFixed(2)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setItemBucketMap((prev) => ({
                                      ...prev,
                                      [it.order_item_id]: 'A'
                                    }))
                                  }
                                  className={`px-2.5 py-1 rounded font-mono text-xs font-bold transition-colors ${
                                    bucket === 'A'
                                      ? 'bg-slate-900 text-white'
                                      : 'bg-white text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  Bill A
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setItemBucketMap((prev) => ({
                                      ...prev,
                                      [it.order_item_id]: 'B'
                                    }))
                                  }
                                  className={`px-2.5 py-1 rounded font-mono text-xs font-bold transition-colors ${
                                    bucket === 'B'
                                      ? 'bg-orange-600 text-white'
                                      : 'bg-white text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  Bill B
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Bill A & Bill B Summary Boxes */}
                      <div className="grid grid-cols-2 gap-2.5 text-xs">
                        <div className="p-2.5 rounded border border-slate-200 bg-slate-50 space-y-1.5">
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span>Bill A ({itemSplitPreview.countA} items)</span>
                            <span className="font-mono tabular-nums">₹{itemSplitPreview.grandA.toFixed(2)}</span>
                          </div>
                          <select
                            value={tenderA}
                            onChange={(e) => setTenderA(e.target.value as PaymentMethod)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold"
                          >
                            <option value="CASH">Tender: Cash</option>
                            <option value="UPI">Tender: UPI QR</option>
                            <option value="CARD">Tender: Card</option>
                          </select>
                        </div>

                        <div className="p-2.5 rounded border border-slate-200 bg-slate-50 space-y-1.5">
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span>Bill B ({itemSplitPreview.countB} items)</span>
                            <span className="font-mono tabular-nums text-orange-600">
                              ₹{itemSplitPreview.grandB.toFixed(2)}
                            </span>
                          </div>
                          <select
                            value={tenderB}
                            onChange={(e) => setTenderB(e.target.value as PaymentMethod)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold"
                          >
                            <option value="UPI">Tender: UPI QR</option>
                            <option value="CASH">Tender: Cash</option>
                            <option value="CARD">Tender: Card</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleItemSplitSubmit}
                        disabled={isProcessing || itemSplitPreview.countA === 0 || itemSplitPreview.countB === 0}
                        className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider text-white transition-colors ${
                          isProcessing || itemSplitPreview.countA === 0 || itemSplitPreview.countB === 0
                            ? 'bg-slate-300 cursor-not-allowed'
                            : 'bg-orange-600 hover:bg-orange-500'
                        }`}
                      >
                        Settle Seat-Wise Bills (A & B) & Print
                      </button>
                    </div>
                  )}

                  {/* TAB 3: Table Transfer & Multi-Table Merge */}
                  {splitTab === 'transfer' && (
                    <div className="space-y-4 pt-1">
                      {/* Transfer Running Order to Empty Table */}
                      <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                          <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                          <span>Transfer Guests to Available Table</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={transferTargetId}
                            onChange={(e) => setTransferTargetId(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-medium"
                          >
                            {availableTables.map((t) => (
                              <option key={t.table_id} value={t.table_id}>
                                {t.table_id} — {t.table_name} ({t.section})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleTransferSubmit}
                            disabled={isProcessing || availableTables.length === 0}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold whitespace-nowrap"
                          >
                            Transfer Table
                          </button>
                        </div>
                      </div>

                      {/* Merge Another Table Into Primary Table */}
                      <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                          <GitMerge className="w-3.5 h-3.5 text-orange-600" />
                          <span>Merge Another Table Into {selectedTable.table_id}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          If the selected table also has a running order (e.g., T-06), its KOT items are consolidated into {selectedTable.table_id} atomically.
                        </p>
                        <div className="flex items-center gap-2">
                          <select
                            value={mergeTargetId}
                            onChange={(e) => setMergeTargetId(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-medium"
                          >
                            {mergeCandidateTables.map((t) => (
                              <option key={t.table_id} value={t.table_id}>
                                {t.table_id} ({t.status === 'OCCUPIED' ? `Occupied · ₹${t.active_order?.grand_total.toFixed(0) || 0}` : 'Available'})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleMergeSubmit}
                            disabled={isProcessing}
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded text-xs font-semibold whitespace-nowrap"
                          >
                            Merge Tables
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
