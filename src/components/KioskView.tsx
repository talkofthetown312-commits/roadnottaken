import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  QrCode,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Flame,
  Check,
  RotateCcw,
  Volume2
} from 'lucide-react';
import { MenuItem, OrderInput, RestaurantProfile, PersistedOrder } from '../server/types.js';

interface KioskViewProps {
  catalog: MenuItem[];
  restaurantProfile: RestaurantProfile;
  onPlaceKioskOrder: (order: OrderInput) => Promise<{
    success: boolean;
    order_id: string;
    invoice_number: string;
    upi_uri: string;
    kot_job_id?: string;
  }>;
}

export const KioskView: React.FC<KioskViewProps> = ({
  catalog,
  restaurantProfile,
  onPlaceKioskOrder,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [tableNumber, setTableNumber] = useState<string>('Table 01');
  const [cart, setCart] = useState<{ [itemId: string]: { item: MenuItem; quantity: number } }>({});
  const [cartBumping, setCartBumping] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<{
    order_id: string;
    invoice_number: string;
    upi_uri: string;
    grand_total: number;
  } | null>(null);

  // Auto reset kiosk after completion or idle
  const [secondsRemaining, setSecondsRemaining] = useState<number>(restaurantProfile.kiosk_idle_timeout_seconds || 45);

  const categories = ['All', ...Array.from(new Set(catalog.map((i) => i.category).filter(Boolean)))];

  const filteredItems = catalog.filter((item) => {
    return selectedCategory === 'All' || item.category === selectedCategory;
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

    // Trigger cart bump animation
    setCartBumping(true);
    setTimeout(() => setCartBumping(false), 300);
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

  const cartList = Object.values(cart).filter((entry) => Boolean(entry && entry.item && typeof entry.item.price === 'number'));
  const subTotal = cartList.reduce((sum, entry) => sum + (Number(entry.item.price) || 0) * (Number(entry.quantity) || 1), 0);
  const taxRate = ((restaurantProfile.tax_cgst_rate || 2.5) + (restaurantProfile.tax_sgst_rate || 2.5)) / 100;
  const taxTotal = Math.round(subTotal * taxRate * 100) / 100;
  const grandTotal = subTotal + taxTotal;
  const totalCartCount = cartList.reduce((sum, entry) => sum + entry.quantity, 0);

  const handleCheckout = async () => {
    if (cartList.length === 0) return;
    setIsSubmitting(true);

    const orderId = crypto.randomUUID();
    const invoiceNumber = `KSK-${Date.now().toString().slice(-6)}`;

    const items = cartList.map((entry) => ({
      order_item_id: crypto.randomUUID(),
      item_id: entry.item.item_id,
      item_name: entry.item.name,
      quantity: entry.quantity,
      unit_price: entry.item.price,
      sub_total: entry.item.price * entry.quantity,
    }));

    const orderInput: OrderInput = {
      order_id: orderId,
      outlet_id: 'OUTLET-IMF-01',
      terminal_id: 'KIOSK-STAND-01',
      table_id: orderType === 'DINE_IN' ? tableNumber : undefined,
      invoice_number: invoiceNumber,
      order_status: 'PREPARING',
      order_type: orderType,
      payment_method: 'UPI',
      sub_total: subTotal,
      tax_total: taxTotal,
      discount_total: 0,
      grand_total: grandTotal,
      items,
    };

    try {
      const res = await onPlaceKioskOrder(orderInput);
      if (res.success) {
        setCompletedOrder({
          order_id: res.order_id,
          invoice_number: res.invoice_number,
          upi_uri: res.upi_uri,
          grand_total: grandTotal,
        });
        setCart({});
        setSecondsRemaining(restaurantProfile.kiosk_idle_timeout_seconds || 45);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetKiosk = () => {
    setCart({});
    setCompletedOrder(null);
    setSelectedCategory('All');
    setOrderType('DINE_IN');
  };

  // Timer countdown on completed order
  useEffect(() => {
    if (!completedOrder) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          handleResetKiosk();
          return 45;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [completedOrder]);

  return (
    <div className="min-h-[calc(100vh-60px)] bg-slate-900 text-white flex flex-col justify-between">
      {/* Top Kiosk Header */}
      <header className="px-8 py-5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-600/30 font-black text-xl">
            T
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{restaurantProfile.restaurant_name}</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                Self-Order Kiosk
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              {restaurantProfile.outlet_name} · Touch screen to customize your meal
            </p>
          </div>
        </div>

        {/* Order Mode Toggle (Dine In vs Takeaway) */}
        <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
          <button
            onClick={() => setOrderType('DINE_IN')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              orderType === 'DINE_IN'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Dine In</span>
          </button>
          <button
            onClick={() => setOrderType('TAKEAWAY')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              orderType === 'TAKEAWAY'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Takeaway</span>
          </button>
        </div>
      </header>

      {/* Main Kiosk Content */}
      {completedOrder ? (
        /* Order Completed Screen with Dynamic UPI QR Code */
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest block font-bold">
                Order Sent to Wok Kitchen
              </span>
              <h2 className="text-2xl font-black text-white mt-1">
                Token #{completedOrder.invoice_number.slice(-4)}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Invoice Reference: {completedOrder.invoice_number}
              </p>
            </div>

            {/* Dynamic UPI Payment Box */}
            <div className="p-5 bg-white text-slate-900 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Scan UPI to Pay</span>
                <span className="text-lg font-black font-mono text-slate-900">
                  ₹{completedOrder.grand_total.toFixed(2)}
                </span>
              </div>

              <div className="w-48 h-48 mx-auto bg-slate-50 border-2 border-slate-900 rounded-lg p-2 flex flex-col items-center justify-center">
                <QrCode className="w-36 h-36 text-slate-900" />
                <span className="text-[10px] font-mono font-bold text-slate-600 mt-1">
                  {restaurantProfile.merchant_upi_vpa || 'talkofthetown@upi'}
                </span>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50 py-1.5 rounded">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Instant Soundbox Payment Voice Confirmation</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-2">
              <span>Auto-resetting in {secondsRemaining}s</span>
              <button
                onClick={handleResetKiosk}
                className="text-orange-400 hover:text-orange-300 font-bold underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Start Next Order</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Dish Browsing & Selection View */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-8 items-start">
          {/* Left Column (8 cols): Category Filters & Large Dish Photo Grid */}
          <div className="lg:col-span-8 space-y-6">
            {/* Category Ribbon */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap active:scale-95 ${
                    selectedCategory === cat
                      ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Dish Cards Grid with High-Res Photos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredItems.map((item) => {
                const inCartQty = cart[item.item_id]?.quantity || 0;
                return (
                  <div
                    key={item.item_id}
                    onClick={() => addToCart(item)}
                    className="bg-slate-800/90 border border-slate-700 hover:border-orange-500 rounded-2xl overflow-hidden cursor-pointer transition-all duration-150 active:scale-[0.98] group flex flex-col justify-between shadow-md hover:shadow-orange-950/20"
                  >
                    {/* Dish Photography */}
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                      <img
                        src={item.image_url || 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80'}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback to high-res stir fry image if specific URL fails
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />

                      {/* Veg / Non-Veg Indicator and Portion Badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span
                          className={`w-3.5 h-3.5 rounded-sm border-2 border-white/80 shadow-md ${
                            item.is_veg ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                          title={item.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
                        />
                        {item.portion_size && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-900/90 text-white backdrop-blur-md border border-white/20">
                            {item.portion_size}
                          </span>
                        )}
                      </div>

                      {/* In-cart count indicator badge */}
                      {inCartQty > 0 && (
                        <div className="absolute top-3 right-3 bg-orange-600 text-white font-mono font-black text-xs w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-900 animate-in zoom-in duration-100">
                          {inCartQty}
                        </div>
                      )}

                      {/* Price Badge Over Image */}
                      <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-md text-white px-3 py-1 rounded-lg font-mono font-black text-base border border-slate-700">
                        ₹{item.price}
                      </div>
                    </div>

                    {/* Dish Info */}
                    <div className="p-4 flex flex-col justify-between flex-1">
                      <div>
                        <h3 className="text-base font-bold text-white group-hover:text-orange-400 transition-colors">
                          {item.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-mono">
                          {item.category}
                        </span>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column (4 cols): Sticky Touch Cart & Fast Checkout */}
          <div className="lg:col-span-4 bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-6 sticky top-28 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-4">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl bg-orange-600/20 text-orange-400 border border-orange-500/30 transition-transform ${cartBumping ? 'scale-110' : 'scale-100'}`}>
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Your Tray</h3>
                  <span className="text-xs text-slate-400 font-mono">{totalCartCount} items selected</span>
                </div>
              </div>
              {cartList.length > 0 && (
                <button
                  onClick={() => setCart({})}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {cartList.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Flame className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400 font-medium">Tray is empty</p>
                  <p className="text-[11px] text-slate-500">Tap any Chowmein, Rice, or Chilly dish to add</p>
                </div>
              ) : (
                cartList.map(({ item, quantity }) => (
                  <div
                    key={item.item_id}
                    className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/60 flex items-center justify-between gap-3 animate-in fade-in duration-150"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                      <span className="text-xs font-mono font-semibold text-orange-400">
                        ₹{item.price} × {quantity} = ₹{item.price * quantity}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 bg-slate-800 rounded-lg p-1 border border-slate-700">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.item_id, -1);
                        }}
                        className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white active:scale-90"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold text-xs w-5 text-center text-white">
                        {quantity}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.item_id, 1);
                        }}
                        className="w-6 h-6 rounded bg-orange-600 hover:bg-orange-500 flex items-center justify-center text-white active:scale-90"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bill Summary */}
            {cartList.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-slate-700 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Sub-total</span>
                  <span className="font-mono text-white">₹{subTotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>GST (CGST {restaurantProfile.tax_cgst_rate}% + SGST {restaurantProfile.tax_sgst_rate}%)</span>
                  <span className="font-mono text-white">₹{taxTotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-black text-white pt-2 border-t border-slate-700">
                  <span>Total Payable</span>
                  <span className="font-mono text-orange-400 text-lg">₹{grandTotal.toFixed(2)}</span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                  className="w-full mt-4 py-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-sm tracking-wide uppercase transition-all shadow-xl shadow-orange-600/30 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Sending to Kitchen...</span>
                  ) : (
                    <>
                      <span>Proceed to Pay & Print Token</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
