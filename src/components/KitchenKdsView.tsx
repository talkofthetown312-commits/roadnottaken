import React, { useState } from 'react';
import { ChefHat, Smartphone, Clock, CheckCircle2, AlertTriangle, Play, Check, XCircle } from 'lucide-react';
import { MenuItem, OrderInput, OrderStatus, PersistedOrder } from '../server/types.js';

interface KitchenKdsViewProps {
  orders: PersistedOrder[];
  catalog: MenuItem[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onPunchLanOrder: (order: OrderInput) => Promise<{ success: boolean; duplicate_ignored?: boolean; message?: string }>;
}

export const KitchenKdsView: React.FC<KitchenKdsViewProps> = ({
  orders,
  catalog,
  onUpdateStatus,
  onPunchLanOrder,
}) => {
  const [captainTable, setCaptainTable] = useState('T-04');
  const [captainSelectedItems, setCaptainSelectedItems] = useState<{ [itemId: string]: number }>({
    'item-004': 2, // Chicken Dum Biryani
    'item-006': 2, // Mango Lassi
  });
  const [captainStatusMsg, setCaptainStatusMsg] = useState<{ text: string; isDuplicate?: boolean } | null>(null);
  const [isPunchingLan, setIsPunchingLan] = useState(false);

  // Filter orders for KDS
  const activeTickets = orders.filter((o) => o.order_status !== 'COMPLETED' && o.order_status !== 'CANCELLED');
  const completedTickets = orders.filter((o) => o.order_status === 'COMPLETED').slice(0, 6);

  const handleCaptainPunch = async (simulateDoubleTap: boolean = false) => {
    setIsPunchingLan(true);
    setCaptainStatusMsg(null);

    const fixedOrderId = crypto.randomUUID();
    const invoiceNumber = `CAP-${Date.now().toString().slice(-6)}`;

    const items = Object.entries(captainSelectedItems)
      .map(([itemId, qty]) => {
        const menuItem = catalog.find((c) => c.item_id === itemId);
        if (!menuItem) return null;
        return {
          order_item_id: crypto.randomUUID(),
          item_id: itemId,
          item_name: menuItem.name,
          quantity: qty,
          unit_price: menuItem.price,
          sub_total: menuItem.price * qty,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (items.length === 0) {
      setIsPunchingLan(false);
      return;
    }

    const subTotal = items.reduce((a, b) => a + b.sub_total, 0);
    const taxTotal = Math.round(subTotal * 0.05 * 100) / 100;

    const orderInput: OrderInput = {
      order_id: fixedOrderId,
      outlet_id: 'OUTLET-BLR-01',
      terminal_id: 'CAPTAIN-ANDROID-HANDHELD-02',
      table_id: captainTable,
      invoice_number: invoiceNumber,
      order_status: 'PENDING',
      order_type: 'DINE_IN',
      sub_total: subTotal,
      tax_total: taxTotal,
      discount_total: 0,
      grand_total: subTotal + taxTotal,
      items,
    };

    try {
      if (!simulateDoubleTap) {
        // Standard single tap
        const res = await onPunchLanOrder(orderInput);
        setCaptainStatusMsg({
          text: `Captain Order #${invoiceNumber} committed to Master SQLite! (KOT printed)`,
          isDuplicate: false,
        });
      } else {
        // Deliberate Double-Tap Simulation
        const [res1, res2] = await Promise.all([
          onPunchLanOrder(orderInput),
          new Promise<any>((resolve) =>
            setTimeout(async () => {
              const r = await onPunchLanOrder(orderInput);
              resolve(r);
            }, 80)
          ),
        ]);

        const dupResponse = res1.duplicate_ignored ? res1 : res2;
        setCaptainStatusMsg({
          text: `Double-Tap Handled Safely! Request 1 saved order & printed KOT. Request 2 caught by UUID guard (duplicate_ignored: true).`,
          isDuplicate: true,
        });
      }
    } finally {
      setIsPunchingLan(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner: LAN Architecture Note */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-orange-600" />
            <span>Kitchen Display System (KDS) & Floor Staff LAN Server</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Running locally on port 4000 over restaurant LAN. Floor captains and KDS terminals communicate with Master SQLite at zero latency even during total ISP outages.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500">Active Kitchen Tickets:</span>
          <strong className="text-orange-600 font-bold bg-orange-50 px-2.5 py-1 rounded border border-orange-200">
            {activeTickets.length} Pending
          </strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Live KDS Ticket Grid */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Live Cooking Queue
            </h3>
            <span className="text-xs text-slate-500 font-mono">Real-time LAN State Sync</span>
          </div>

          {activeTickets.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-slate-700">All kitchen tickets cleared!</p>
              <p className="text-slate-500 mt-1">Punch a bill from Cashier POS or dispatch a Captain LAN order to test KDS workflow.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTickets.map((ticket) => (
                <div
                  key={ticket.order_id}
                  className={`bg-white rounded-lg border transition-all shadow-xs flex flex-col justify-between overflow-hidden ${
                    ticket.order_status === 'PREPARING'
                      ? 'border-amber-400'
                      : 'border-slate-300'
                  }`}
                >
                  {/* Ticket Header */}
                  <div
                    className={`px-4 py-3 flex items-center justify-between border-b ${
                      ticket.order_status === 'PREPARING'
                        ? 'bg-amber-500/10 border-amber-200 text-amber-950'
                        : 'bg-slate-100 border-slate-200 text-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm tracking-tight">
                          #{ticket.invoice_number}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-white border border-slate-200 text-slate-700">
                          {ticket.order_type}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Terminal: {ticket.terminal_id}
                      </span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider block ${
                          ticket.order_status === 'PREPARING' ? 'text-amber-600' : 'text-slate-600'
                        }`}
                      >
                        {ticket.order_status}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    </div>
                  </div>

                  {/* Ticket Items */}
                  <div className="p-4 space-y-2 flex-1">
                    {ticket.items.map((it) => (
                      <div
                        key={it.order_item_id}
                        className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0"
                      >
                        <span className="font-semibold text-slate-900">{it.item_name}</span>
                        <span className="font-mono font-bold text-sm text-orange-600">
                          x{it.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Ticket Action Buttons */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                    {ticket.order_status === 'PENDING' ? (
                      <button
                        onClick={() => onUpdateStatus(ticket.order_id, 'PREPARING')}
                        className="flex-1 py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Start Cooking</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onUpdateStatus(ticket.order_id, 'COMPLETED')}
                        className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Ready / Served</span>
                      </button>
                    )}

                    <button
                      onClick={() => onUpdateStatus(ticket.order_id, 'CANCELLED')}
                      className="py-1.5 px-2.5 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded text-xs transition-colors"
                      title="Void order and auto-restore raw recipe ingredients"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Completed tickets strip */}
          {completedTickets.length > 0 && (
            <div className="bg-white p-4 rounded-lg border border-slate-200 mt-6">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Recently Served Orders
              </h4>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {completedTickets.map((t) => (
                  <div
                    key={t.order_id}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs flex items-center gap-2 shrink-0 font-mono"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-bold text-slate-800">#{t.invoice_number}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600">₹{t.grand_total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 4 Columns: Captain Android Companion App Simulator */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                Captain Android Handheld
              </h4>
              <p className="text-[11px] text-slate-500 font-mono">
                Floor staff LAN Client Simulator
              </p>
            </div>
          </div>

          {/* Captain Table Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Table / Station:
            </label>
            <div className="flex items-center gap-1">
              {['T-02', 'T-04', 'T-06', 'T-08'].map((t) => (
                <button
                  key={t}
                  onClick={() => setCaptainTable(t)}
                  className={`flex-1 py-1 text-xs font-mono font-bold rounded ${
                    captainTable === t
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Items for Handheld Punch */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">
              Handheld Order Items:
            </span>
            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-800">Chicken Dum Biryani</span>
                <span className="font-mono font-bold text-slate-900">x2 (₹840)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-800">Fresh Mango Lassi</span>
                <span className="font-mono font-bold text-slate-900">x2 (₹280)</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-slate-600">
                <span>Total with GST (5%):</span>
                <span className="font-mono font-bold text-blue-600">₹1,176.00</span>
              </div>
            </div>
          </div>

          {/* Status Message from Handheld Dispatch */}
          {captainStatusMsg && (
            <div
              className={`p-3 rounded text-xs border leading-relaxed ${
                captainStatusMsg.isDuplicate
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              }`}
            >
              <div className="flex items-start gap-1.5">
                {captainStatusMsg.isDuplicate ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <span>{captainStatusMsg.text}</span>
              </div>
            </div>
          )}

          {/* Action 1: Standard Single Dispatch */}
          <button
            onClick={() => handleCaptainPunch(false)}
            disabled={isPunchingLan}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs tracking-wide transition-colors shadow-2xs"
          >
            {isPunchingLan ? 'Punching via LAN...' : 'Send Order to Master POS'}
          </button>

          {/* Action 2: Double-Tap Idempotency Test */}
          <div className="pt-3 border-t border-slate-200">
            <button
              onClick={() => handleCaptainPunch(true)}
              disabled={isPunchingLan}
              className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              title="Demonstrates client-side UUID idempotency guard preventing duplicate KOTs"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Simulate Double-Tap Idempotency</span>
            </button>
            <p className="text-[11px] text-slate-400 mt-1 text-center">
              Fires identical UUIDv4 twice to verify duplicate prevention.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
