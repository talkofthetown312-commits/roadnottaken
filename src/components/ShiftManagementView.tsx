import React, { useState } from 'react';
import {
  DollarSign,
  QrCode,
  CreditCard,
  Truck,
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  Printer,
  FileText,
  Plus,
  Minus,
  TrendingUp,
  Scale
} from 'lucide-react';
import { CashierShift, PrintSpoolJob } from '../server/types.js';

interface ShiftManagementViewProps {
  activeShift: CashierShift | null;
  shiftHistory: CashierShift[];
  onOpenShift: (cashierName: string, openingFloat: number) => Promise<void>;
  onRecordAdjustment: (shiftId: string, type: 'CASH_IN' | 'CASH_OUT', amount: number, reason: string) => Promise<void>;
  onCloseBlindDrop: (shiftId: string, actualCashCounted: number, varianceReason?: string) => Promise<void>;
  onViewPrintJob: (job: PrintSpoolJob) => void;
}

export const ShiftManagementView: React.FC<ShiftManagementViewProps> = ({
  activeShift,
  shiftHistory,
  onOpenShift,
  onRecordAdjustment,
  onCloseBlindDrop,
  onViewPrintJob,
}) => {
  // Opening shift state
  const [newCashierName, setNewCashierName] = useState('Anita Deshmukh');
  const [newOpeningFloat, setNewOpeningFloat] = useState(2000);

  // Petty cash adjustment state
  const [adjType, setAdjType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_OUT');
  const [adjAmount, setAdjAmount] = useState<number>(300);
  const [adjReason, setAdjReason] = useState('Vegetable / Milk Vendor Petty Expense');

  // Blind cash drop state
  const [actualCashCounted, setActualCashCounted] = useState<number | ''>('');
  const [varianceReason, setVarianceReason] = useState('');
  const [isSubmittingBlindDrop, setIsSubmittingBlindDrop] = useState(false);

  // Handle shift open
  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCashierName || newOpeningFloat < 0) return;
    await onOpenShift(newCashierName, newOpeningFloat);
  };

  // Handle cash adjustment
  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift || adjAmount <= 0) return;
    await onRecordAdjustment(activeShift.shift_id, adjType, adjAmount, adjReason);
    setAdjAmount(0);
    setAdjReason('');
  };

  // Handle blind cash drop
  const handleBlindDropSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift || actualCashCounted === '') return;
    setIsSubmittingBlindDrop(true);
    try {
      await onCloseBlindDrop(activeShift.shift_id, Number(actualCashCounted), varianceReason);
      setActualCashCounted('');
      setVarianceReason('');
    } finally {
      setIsSubmittingBlindDrop(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Active Shift Status or Shift Opener */}
      {!activeShift ? (
        <div className="bg-white p-6 rounded-lg border border-slate-200 max-w-md mx-auto shadow-xs text-center space-y-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Cashier Shift Closed
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Terminal POS-01 currently has no active cashier shift. Open a shift with an initial petty cash float to begin billing.
            </p>
          </div>

          <form onSubmit={handleStartShift} className="space-y-3 text-left">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Cashier Name:</label>
              <input
                type="text"
                value={newCashierName}
                onChange={(e) => setNewCashierName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded font-medium focus:ring-1 focus:ring-slate-900"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Opening Cash Float (₹):</label>
              <input
                type="number"
                min="0"
                step="50"
                value={newOpeningFloat}
                onChange={(e) => setNewOpeningFloat(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded font-mono font-bold text-slate-900 focus:ring-1 focus:ring-slate-900"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded font-bold text-xs uppercase tracking-wider transition-colors shadow-2xs"
            >
              Open Shift & Unlock Register
            </button>
          </form>
        </div>
      ) : (
        /* Active Shift Dashboard */
        <div className="space-y-6">
          {/* Active Shift Header Strip */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-emerald-50 text-emerald-600">
                  <Unlock className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Active Cashier Register Shift
                </h3>
                <span className="text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                  REGISTER OPEN
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                Cashier: <strong className="text-slate-800">{activeShift.cashier_name}</strong> · Terminal: {activeShift.terminal_id} · Opened at: {new Date(activeShift.opened_at).toLocaleTimeString()}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block">
                  Opening Petty Float
                </span>
                <span className="text-lg font-mono font-bold text-slate-900 tabular-nums">
                  ₹{activeShift.opening_float.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Tender Breakdown KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold">Cash Sales</span>
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                ₹{activeShift.cash_sales.toFixed(2)}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold">UPI / QR</span>
                <QrCode className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                ₹{activeShift.upi_sales.toFixed(2)}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold">Card (POS)</span>
                <CreditCard className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                ₹{activeShift.card_sales.toFixed(2)}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold">Aggregator</span>
                <Truck className="w-3.5 h-3.5 text-orange-600" />
              </div>
              <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                ₹{activeShift.aggregator_sales.toFixed(2)}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-slate-200 bg-orange-50/20 border-orange-200/60">
              <div className="flex items-center justify-between text-orange-700 mb-1">
                <span className="text-[11px] uppercase tracking-wider font-bold">Total Sales</span>
                <TrendingUp className="w-3.5 h-3.5 text-orange-600" />
              </div>
              <span className="text-lg font-bold font-mono text-orange-600 tabular-nums">
                ₹{activeShift.total_sales.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Operational Actions Grid: Petty Cash Drops & Blind Drop Reconciliation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 6 Columns: Mid-Shift Petty Cash In / Out Drops */}
            <div className="lg:col-span-6 bg-white rounded-lg border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                    Petty Cash In / Out Drops
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Record supplier payouts or mid-day safe transfers
                  </p>
                </div>
                <div className="text-right font-mono text-xs text-slate-600">
                  <span>+₹{activeShift.cash_in_total.toFixed(2)}</span>
                  <span className="text-slate-400 mx-1">·</span>
                  <span className="text-red-600">-₹{activeShift.cash_out_total.toFixed(2)}</span>
                </div>
              </div>

              <form onSubmit={handleAdjustmentSubmit} className="space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjType('CASH_OUT')}
                    className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      adjType === 'CASH_OUT'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Cash Out (Payout / Drop)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjType('CASH_IN')}
                    className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      adjType === 'CASH_IN'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cash In (Change Received)</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Amount (₹):</label>
                    <input
                      type="number"
                      min="1"
                      step="10"
                      value={adjAmount || ''}
                      onChange={(e) => setAdjAmount(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded font-mono font-bold"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Reason / Note:</label>
                    <input
                      type="text"
                      value={adjReason}
                      onChange={(e) => setAdjReason(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800"
                      placeholder="e.g. Milk vendor payout"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold text-xs transition-colors"
                >
                  Record Petty Cash Transaction
                </button>
              </form>
            </div>

            {/* Right 6 Columns: Blind Cash Drop Shift Close */}
            <div className="lg:col-span-6 bg-white rounded-lg border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="pb-3 border-b border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Scale className="w-4 h-4 text-orange-600" />
                  <span>Blind Cash Drop & Shift Close</span>
                </h4>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Audit Protocol: Physical cash is entered blind without showing expected total.
                </p>
              </div>

              {/* Drawer Ledger math */}
              <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1 font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Opening Cash Float:</span>
                  <span>₹{activeShift.opening_float.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>+ Cash Orders Inward:</span>
                  <span>₹{activeShift.cash_sales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>+ Cash In Drops:</span>
                  <span>₹{activeShift.cash_in_total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>- Cash Out Payouts:</span>
                  <span className="text-red-600">-₹{activeShift.cash_out_total.toFixed(2)}</span>
                </div>
                <div className="pt-1.5 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                  <span>Expected Drawer Cash:</span>
                  <span className="text-emerald-700">₹{activeShift.expected_cash.toFixed(2)}</span>
                </div>
              </div>

              {/* Blind Drop Submit Form */}
              <form onSubmit={handleBlindDropSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Actual Physical Cash Counted in Drawer (₹):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={actualCashCounted}
                    onChange={(e) => setActualCashCounted(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Count currency notes & enter total"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded font-mono font-bold text-slate-900 focus:ring-1 focus:ring-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Cashier Variance Notes (Optional):
                  </label>
                  <input
                    type="text"
                    value={varianceReason}
                    onChange={(e) => setVarianceReason(e.target.value)}
                    placeholder="Explain any change shortage or rounding"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actualCashCounted === '' || isSubmittingBlindDrop}
                  className={`w-full py-2.5 px-4 rounded font-bold text-xs uppercase tracking-wider text-white transition-all shadow-xs ${
                    actualCashCounted === '' || isSubmittingBlindDrop
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-500 cursor-pointer'
                  }`}
                >
                  {isSubmittingBlindDrop ? 'Reconciling & Spooling Z-Report...' : 'Submit Blind Drop & Print Z-Report'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Historical Closed Z-Reports Ledger */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-600" />
              <span>Shift Audit & Z-Report History</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">
              Immutable end-of-day register audit records spooled to ESC/POS thermal printer
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">{shiftHistory.length} Shifts Recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4">Shift & Z-Report #</th>
                <th className="py-2.5 px-3">Cashier</th>
                <th className="py-2.5 px-3 text-right">Total Net Sales</th>
                <th className="py-2.5 px-3 text-right">Expected Cash</th>
                <th className="py-2.5 px-3 text-right">Actual Drop</th>
                <th className="py-2.5 px-3">Variance</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shiftHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No closed shifts recorded yet. Close the active shift to generate the first Z-Report!
                  </td>
                </tr>
              ) : (
                shiftHistory.map((s) => (
                  <tr key={s.shift_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <div>{s.z_report_number || s.shift_id}</div>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {new Date(s.opened_at).toLocaleDateString()} · {new Date(s.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-medium text-slate-800">
                      {s.cashier_name}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      ₹{s.total_sales.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums">
                      ₹{s.expected_cash.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      ₹{s.actual_cash_counted.toFixed(2)}
                    </td>

                    <td className="py-3 px-3">
                      {Math.abs(s.variance) < 0.01 ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-mono font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>EXACT MATCH</span>
                        </span>
                      ) : s.variance > 0 ? (
                        <span className="inline-flex items-center gap-1 text-blue-600 font-mono font-bold text-[11px]">
                          <Plus className="w-3.5 h-3.5" />
                          <span>+₹{s.variance.toFixed(2)} (OVER)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 font-mono font-bold text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>-₹{Math.abs(s.variance).toFixed(2)} (SHORT)</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {s.z_report_text && (
                        <button
                          onClick={() =>
                            onViewPrintJob({
                              job_id: s.z_report_number || s.shift_id,
                              order_id: s.shift_id,
                              job_type: 'Z_REPORT',
                              target_printer: 'Cashier Audit Printer (Thermal 80mm)',
                              status: 'SENT',
                              formatted_text: s.z_report_text || '',
                              hex_preview: '1B 40 1B 42 03 02 1B 61 01 1B 45 01 1D 21 11 ... 1D 56 42 00',
                              created_at: s.closed_at || new Date().toISOString()
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 transition-colors font-semibold"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Print Slip</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
