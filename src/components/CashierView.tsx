import React, { useState, useEffect } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  Printer,
  Search,
  CheckCircle2,
  DollarSign,
  QrCode,
  CreditCard,
  UserCheck,
  Sparkles,
  UserPlus
} from 'lucide-react';
import {
  MenuItem,
  OrderInput,
  OrderItemInput,
  OrderType,
  PaymentMethod,
  PrintSpoolJob,
  CashierShift,
  DiningTable,
  CustomerProfile,
  UpiPaymentIntent
} from '../server/types.js';
import { UpiSoundboxModal } from './UpiSoundboxModal.js';

interface CashierViewProps {
  catalog: MenuItem[];
  tables: DiningTable[];
  customers: CustomerProfile[];
  initialTableId?: string;
  activeShift: CashierShift | null;
  onPlaceOrder: (order: OrderInput) => Promise<{ success: boolean; kot_job_id?: string; receipt_job_id?: string }>;
  onUpsertCustomer: (phone: string, name: string, email?: string) => Promise<CustomerProfile | null>;
  onCreateUpiIntent: (amount: number, invoiceNumber: string) => Promise<UpiPaymentIntent>;
  onVerifyUpiSoundbox: (intentId: string, payerVpa: string) => Promise<UpiPaymentIntent>;
  onViewPrintJob: (job: PrintSpoolJob) => void;
  recentJobs: PrintSpoolJob[];
}

export const CashierView: React.FC<CashierViewProps> = ({
  catalog,
  tables,
  customers,
  initialTableId,
  activeShift,
  onPlaceOrder,
  onUpsertCustomer,
  onCreateUpiIntent,
  onVerifyUpiSoundbox,
  onViewPrintJob,
  recentJobs,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>(initialTableId || 'T-01');
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [cart, setCart] = useState<{ [itemId: string]: { item: MenuItem; quantity: number } }>({});
  const [hasSeededInitialCart, setHasSeededInitialCart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Customer CRM & Loyalty Wallet State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [redeemLoyaltyPoints, setRedeemLoyaltyPoints] = useState<boolean>(false);
  const [showNewGuestForm, setShowNewGuestForm] = useState<boolean>(false);
  const [newGuestPhone, setNewGuestPhone] = useState<string>('');
  const [newGuestName, setNewGuestName] = useState<string>('');
  const [isSavingGuest, setIsSavingGuest] = useState<boolean>(false);

  // Dynamic UPI Soundbox Modal State
  const [activeUpiIntent, setActiveUpiIntent] = useState<UpiPaymentIntent | null>(null);

  useEffect(() => {
    if (!hasSeededInitialCart && catalog.length >= 3) {
      setCart({
        [catalog[0].item_id]: { item: catalog[0], quantity: 1 },
        [catalog[2].item_id]: { item: catalog[2], quantity: 2 },
      });
      setHasSeededInitialCart(true);
    }
  }, [catalog, hasSeededInitialCart]);

  useEffect(() => {
    if (initialTableId) {
      setSelectedTable(initialTableId);
      setOrderType('DINE_IN');
    }
  }, [initialTableId]);

  const categories = ['All', 'North Indian', 'Tandoor', 'Rice & Biryani', 'Beverages', 'Desserts'];

  const filteredItems = catalog.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev[item.item_id];
      if (existing) {
        return {
          ...prev,
          [item.item_id]: { ...existing, quantity: existing.quantity + 1 },
        };
      }
      return {
        ...prev,
        [item.item_id]: { item, quantity: 1 },
      };
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: { ...existing, quantity: newQty },
      };
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const cartList = Object.values(cart).filter((entry) => Boolean(entry && entry.item));
  const subTotal = cartList.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0);

  const selectedCustomer = customers.find((c) => c.customer_id === selectedCustomerId) || null;
  const maxRedeemablePoints = selectedCustomer
    ? Math.min(selectedCustomer.loyalty_points, Math.floor(subTotal * 0.5))
    : 0;
  const pointsRedeemed = redeemLoyaltyPoints ? maxRedeemablePoints : 0;
  const combinedDiscount = discountAmount + pointsRedeemed;

  const taxTotal = Math.round(subTotal * 0.05 * 100) / 100;
  const grandTotal = Math.max(0, subTotal + taxTotal - combinedDiscount);
  const pointsEarnedPreview = selectedCustomer ? Math.max(0, Math.floor(grandTotal * 0.05)) : 0;

  const handleRegisterGuest = async () => {
    const cleanPhone = newGuestPhone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10) return;
    setIsSavingGuest(true);
    try {
      const created = await onUpsertCustomer(cleanPhone, newGuestName || 'Walk-in Guest');
      if (created) {
        setSelectedCustomerId(created.customer_id);
        setShowNewGuestForm(false);
        setNewGuestPhone('');
        setNewGuestName('');
        setToastMessage(`Registered ${created.name} (+50 Welcome Loyalty Points)!`);
        setTimeout(() => setToastMessage(null), 3500);
      }
    } finally {
      setIsSavingGuest(false);
    }
  };

  const executeOrderPlacement = async (invoiceNumber: string, upiUtrReference?: string) => {
    const orderId = crypto.randomUUID();
    const items: OrderItemInput[] = cartList.map((entry) => ({
      order_item_id: crypto.randomUUID(),
      item_id: entry.item.item_id,
      item_name: entry.item.name,
      quantity: entry.quantity,
      unit_price: entry.item.price,
      sub_total: entry.item.price * entry.quantity,
    }));

    const orderInput: OrderInput = {
      order_id: orderId,
      outlet_id: 'OUTLET-BLR-01',
      terminal_id: 'POS-01',
      table_id: orderType === 'DINE_IN' ? selectedTable : undefined,
      invoice_number: invoiceNumber,
      order_status: 'PREPARING',
      order_type: orderType,
      payment_method: paymentMethod,
      customer_id: selectedCustomer?.customer_id,
      customer_phone: selectedCustomer?.phone,
      customer_name: selectedCustomer?.name,
      loyalty_points_redeemed: pointsRedeemed,
      loyalty_points_earned: pointsEarnedPreview,
      upi_utr_reference: upiUtrReference,
      sub_total: subTotal,
      tax_total: taxTotal,
      discount_total: combinedDiscount,
      grand_total: grandTotal,
      items,
    };

    const res = await onPlaceOrder(orderInput);
    if (res.success) {
      setCart({});
      setDiscountAmount(0);
      setRedeemLoyaltyPoints(false);
      setToastMessage(
        upiUtrReference
          ? `Order #${invoiceNumber} settled via UPI (UTR ${upiUtrReference}) & KOT spooled!`
          : `Order #${invoiceNumber} billed & KOT spooled!`
      );
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleCheckout = async () => {
    if (cartList.length === 0) return;
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    // If tender is UPI, launch the Dynamic BharatQR & Soundbox Verification Modal
    if (paymentMethod === 'UPI') {
      setIsSubmitting(true);
      try {
        const intent = await onCreateUpiIntent(grandTotal, invoiceNumber);
        setActiveUpiIntent(intent);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await executeOrderPlacement(invoiceNumber);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto items-start">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 border border-emerald-500/30 text-white rounded-lg shadow-xl text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left 7 Columns: Catalog & Item Selection */}
      <div className="lg:col-span-7 space-y-4">
        {/* Category Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-sans"
            />
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredItems.map((item) => {
            const inCartQty = cart[item.item_id]?.quantity || 0;
            return (
              <div
                key={item.item_id}
                onClick={() => addToCart(item)}
                className="bg-white p-4 rounded-lg border border-slate-200 hover:border-slate-400 cursor-pointer transition-all flex flex-col justify-between group shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-xs inline-block ${
                          item.is_veg ? 'bg-emerald-600' : 'bg-red-600'
                        }`}
                        title={item.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
                      />
                      <h4 className="text-sm font-bold text-slate-900 tracking-tight group-hover:text-orange-600 transition-colors">
                        {item.name}
                      </h4>
                    </div>
                    {inCartQty > 0 && (
                      <span className="text-xs font-bold text-orange-600 font-mono">
                        x{inCartQty}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    Station: <strong className="font-medium text-slate-700">{item.station}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                      ₹{item.price}
                    </span>
                    <button
                      type="button"
                      className="p-1 rounded bg-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Spooled ESC/POS Prints Strip */}
        {recentJobs.length > 0 && (
          <div className="bg-white p-4 rounded-lg border border-slate-200 mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-orange-600" />
                <span>Recent ESC/POS Print Spooler Jobs</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Click to preview raw thermal slip</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {recentJobs.slice(0, 4).map((job) => (
                <button
                  key={job.job_id}
                  onClick={() => onViewPrintJob(job)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-xs text-left shrink-0 transition-colors"
                >
                  <span className="font-mono font-bold text-slate-800">{job.job_type}</span>
                  <span className="text-slate-400" aria-hidden="true">·</span>
                  <span className="text-slate-600 truncate max-w-[120px]">{job.order_id.slice(0, 8)}...</span>
                  <span className="text-emerald-600 font-medium">✓</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right 5 Columns: Billing Order Cart & Payment Settlement */}
      <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-5 space-y-4 shadow-xs">
        {/* Order Header / Table Selection */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <span className="text-xs text-slate-500 font-medium">Active Dining Table:</span>
            <div className="mt-1">
              <select
                value={selectedTable}
                onChange={(e) => {
                  setSelectedTable(e.target.value);
                  setOrderType('DINE_IN');
                }}
                disabled={orderType !== 'DINE_IN'}
                className="px-2.5 py-1 text-xs font-mono font-semibold rounded bg-slate-100 border border-slate-200 text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 disabled:opacity-50"
              >
                {(tables.length > 0 ? tables.map((t) => t.table_id) : ['T-01', 'T-02', 'T-03', 'T-04', 'T-05']).map((tblId) => {
                  const tblObj = tables.find((t) => t.table_id === tblId);
                  return (
                    <option key={tblId} value={tblId}>
                      {tblId} {tblObj ? `(${tblObj.section} · ${tblObj.status})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-500 font-medium">Channel:</span>
            <div className="flex items-center gap-1 mt-1">
              {(['DINE_IN', 'TAKEAWAY', 'DELIVERY'] as OrderType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`px-2 py-1 text-[11px] font-semibold rounded ${
                    orderType === type
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type === 'DINE_IN' ? 'Dine-In' : type === 'TAKEAWAY' ? 'Takeaway' : 'Delivery'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Tender Selector */}
        <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-md border border-slate-200">
          <div className="flex items-center gap-1 text-xs">
            <span className="font-semibold text-slate-700">Tender:</span>
            {activeShift && (
              <span className="text-[10px] text-emerald-700 font-mono">
                ({activeShift.cashier_name})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                paymentMethod === 'CASH'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <DollarSign className="w-3 h-3" />
              <span>Cash</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('UPI')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                paymentMethod === 'UPI'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <QrCode className="w-3 h-3" />
              <span>UPI / QR</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('CARD')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                paymentMethod === 'CARD'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-3 h-3" />
              <span>Card</span>
            </button>
          </div>
        </div>

        {/* Customer CRM & Loyalty Wallet Box */}
        <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <UserCheck className="w-3.5 h-3.5 text-orange-600" />
              <span>Customer CRM & Loyalty</span>
            </div>

            <button
              type="button"
              onClick={() => setShowNewGuestForm(!showNewGuestForm)}
              className="flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700"
            >
              <UserPlus className="w-3 h-3" />
              <span>{showNewGuestForm ? 'Cancel' : '+ New Guest'}</span>
            </button>
          </div>

          {showNewGuestForm ? (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
              <input
                type="tel"
                maxLength={10}
                value={newGuestPhone}
                onChange={(e) => setNewGuestPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="10-digit Mobile"
                className="sm:col-span-5 px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
              <input
                type="text"
                value={newGuestName}
                onChange={(e) => setNewGuestName(e.target.value)}
                placeholder="Guest Name"
                className="sm:col-span-4 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
              <button
                type="button"
                disabled={newGuestPhone.length < 10 || isSavingGuest}
                onClick={handleRegisterGuest}
                className="sm:col-span-3 px-2.5 py-1.5 text-xs font-bold bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-40"
              >
                {isSavingGuest ? '...' : 'Save'}
              </button>
            </div>
          ) : (
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                setRedeemLoyaltyPoints(false);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="">Walk-in Guest (Select or attach phone for Loyalty Points)</option>
              {customers.map((c) => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.name} ({c.phone}) · {c.tier} · {c.loyalty_points} Pts
                </option>
              ))}
            </select>
          )}

          {selectedCustomer && (
            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/80 text-[11px]">
              <div className="text-slate-600">
                <span className="font-semibold text-slate-900">{selectedCustomer.tier}</span>
                <span className="mx-1.5">·</span>
                <span className="font-mono">{selectedCustomer.loyalty_points} Pts</span>
                <span className="mx-1.5">·</span>
                <span className="text-emerald-700 font-semibold">
                  Earns +{pointsEarnedPreview} Pts
                </span>
              </div>

              {maxRedeemablePoints > 0 && (
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-orange-700">
                  <input
                    type="checkbox"
                    checked={redeemLoyaltyPoints}
                    onChange={(e) => setRedeemLoyaltyPoints(e.target.checked)}
                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span>Redeem ₹{maxRedeemablePoints}</span>
                </label>
              )}
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
          {cartList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <p>Cart is currently empty.</p>
              <p className="text-[11px] mt-1 text-slate-500">Punch dishes from the menu to build invoice.</p>
            </div>
          ) : (
            cartList.map(({ item, quantity }) => (
              <div
                key={item.item_id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-md bg-slate-50 border border-slate-100 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <h5 className="font-semibold text-slate-900 truncate">{item.name}</h5>
                  <span className="text-slate-500 font-mono text-[11px]">
                    ₹{item.price} each
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateQuantity(item.item_id, -1)}
                    className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-mono font-bold text-slate-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.item_id, 1)}
                    className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="text-right min-w-[65px]">
                  <span className="font-mono font-bold text-slate-900">
                    ₹{item.price * quantity}
                  </span>
                </div>

                <button
                  onClick={() => removeFromCart(item.item_id)}
                  className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Financial Calculation Breakdown */}
        <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600 font-medium">
            <span>Sub Total:</span>
            <span className="font-mono tabular-nums text-slate-900">₹{subTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-slate-600 font-medium">
            <span>Manual Discount (₹):</span>
            <input
              type="number"
              min="0"
              max={subTotal}
              value={discountAmount || ''}
              onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
              placeholder="0.00"
              className="w-20 px-2 py-0.5 text-right font-mono bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {pointsRedeemed > 0 && (
            <div className="flex justify-between text-orange-700 font-semibold">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Loyalty Redeemed ({pointsRedeemed} Pts):</span>
              </span>
              <span className="font-mono tabular-nums">-₹{pointsRedeemed.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-slate-600 font-medium">
            <span>GST Tax (5% CGST + SGST):</span>
            <span className="font-mono tabular-nums text-slate-900">₹{taxTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
            <span>Grand Total:</span>
            <span className="font-mono text-base text-orange-600">₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Primary Checkout Action */}
        <button
          onClick={handleCheckout}
          disabled={cartList.length === 0 || isSubmitting}
          className={`w-full py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-wider text-white transition-all shadow-sm flex items-center justify-center gap-2 ${
            cartList.length === 0 || isSubmitting
              ? 'bg-slate-300 cursor-not-allowed'
              : paymentMethod === 'UPI'
              ? 'bg-blue-600 hover:bg-blue-500 cursor-pointer'
              : 'bg-orange-600 hover:bg-orange-500 cursor-pointer'
          }`}
        >
          {paymentMethod === 'UPI' && <QrCode className="w-4 h-4" />}
          <span>
            {isSubmitting
              ? 'Processing...'
              : paymentMethod === 'UPI'
              ? `Generate Dynamic UPI QR (₹${grandTotal.toFixed(2)})`
              : 'Fire KOT & Settle Bill'}
          </span>
        </button>
      </div>

      {/* Dynamic BharatQR / UPI Soundbox Verification Modal */}
      {activeUpiIntent && (
        <UpiSoundboxModal
          intent={activeUpiIntent}
          customerName={selectedCustomer?.name}
          onVerifyCallback={onVerifyUpiSoundbox}
          onCompleteOrderWithUpi={async (verified) => {
            await executeOrderPlacement(verified.invoice_number, verified.utr_number);
            setActiveUpiIntent(null);
          }}
          onClose={() => setActiveUpiIntent(null)}
        />
      )}
    </div>
  );
};
