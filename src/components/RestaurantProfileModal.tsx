import React, { useState } from 'react';
import { Store, X, Save, Building2, MapPin, Receipt, Phone, Mail, Printer, QrCode, Clock, Percent } from 'lucide-react';
import { RestaurantProfile } from '../server/types';

interface RestaurantProfileModalProps {
  profile: RestaurantProfile;
  onSave: (updated: Partial<RestaurantProfile>) => Promise<void>;
  onClose: () => void;
}

export const RestaurantProfileModal: React.FC<RestaurantProfileModalProps> = ({
  profile,
  onSave,
  onClose,
}) => {
  const [restaurantName, setRestaurantName] = useState(profile.restaurant_name);
  const [outletName, setOutletName] = useState(profile.outlet_name);
  const [address, setAddress] = useState(profile.address);
  const [gstin, setGstin] = useState(profile.gstin);
  const [fssaiLicence, setFssaiLicence] = useState(profile.fssai_licence);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email || '');
  const [cgstRate, setCgstRate] = useState(profile.tax_cgst_rate ?? 2.5);
  const [sgstRate, setSgstRate] = useState(profile.tax_sgst_rate ?? 2.5);
  const [printerIp, setPrinterIp] = useState(profile.printer_ip || '192.168.1.100');
  const [printerPort, setPrinterPort] = useState(profile.printer_port || 9100);
  const [printerPaperWidth, setPrinterPaperWidth] = useState<'58mm' | '80mm'>(profile.printer_paper_width || '80mm');
  const [merchantUpiVpa, setMerchantUpiVpa] = useState(profile.merchant_upi_vpa || 'talkofthetown@upi');
  const [kioskTimeout, setKioskTimeout] = useState(profile.kiosk_idle_timeout_seconds || 60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({
        restaurant_name: restaurantName,
        outlet_name: outletName,
        address,
        gstin,
        fssai_licence: fssaiLicence,
        phone,
        email: email || undefined,
        tax_cgst_rate: Number(cgstRate),
        tax_sgst_rate: Number(sgstRate),
        printer_ip: printerIp,
        printer_port: Number(printerPort),
        printer_paper_width: printerPaperWidth,
        merchant_upi_vpa: merchantUpiVpa,
        kiosk_idle_timeout_seconds: Number(kioskTimeout),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-bold tracking-tight">
              Restaurant Configuration & Hardware Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 leading-relaxed">
            <strong>Road Not Taken POS</strong> · Authoritative configuration stored in SQLite. Settings take effect immediately across Cashier POS, Captain Handhelds, KOT network printers, and Customer Touch Kiosks.
          </div>

          {/* Section 1: Brand & Outlet */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">1. Brand & Outlet Identity</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-slate-400" />
                  <span>Restaurant Brand Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="e.g. Talk of the Town"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Branch / Outlet Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={outletName}
                  onChange={(e) => setOutletName(e.target.value)}
                  placeholder="e.g. Imphal Main Outlet"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Full Physical Address</span>
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Building, Street, Area, City, Pin"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Contact Phone</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Official Email</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="talkofthetown312@gmail.com"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Tax & Legal Compliance */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">2. Tax & Legal Compliance</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-slate-400" />
                  <span>GSTIN Number</span>
                </label>
                <input
                  type="text"
                  required
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="14AABCT9988Z1Z5"
                  className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  FSSAI License No.
                </label>
                <input
                  type="text"
                  required
                  value={fssaiLicence}
                  onChange={(e) => setFssaiLicence(e.target.value)}
                  placeholder="21623001000452"
                  className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-slate-400" />
                  <span>CGST Rate (%)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="28"
                  value={cgstRate}
                  onChange={(e) => setCgstRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-slate-400" />
                  <span>SGST Rate (%)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="28"
                  value={sgstRate}
                  onChange={(e) => setSgstRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Thermal Printer & Peripherals */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>3. Thermal ESC/POS Printer & Hardware</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Printer LAN IP
                </label>
                <input
                  type="text"
                  value={printerIp}
                  onChange={(e) => setPrinterIp(e.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Printer Port
                </label>
                <input
                  type="number"
                  value={printerPort}
                  onChange={(e) => setPrinterPort(parseInt(e.target.value) || 9100)}
                  placeholder="9100"
                  className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Paper Roll Width
                </label>
                <select
                  value={printerPaperWidth}
                  onChange={(e) => setPrinterPaperWidth(e.target.value as '58mm' | '80mm')}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-slate-900"
                >
                  <option value="80mm">80mm (48 characters standard)</option>
                  <option value="58mm">58mm (32 characters compact)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Customer Kiosk & Payments */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-slate-500" />
              <span>4. UPI Payment & Customer Kiosk Mode</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Merchant UPI ID (VPA)
                </label>
                <input
                  type="text"
                  value={merchantUpiVpa}
                  onChange={(e) => setMerchantUpiVpa(e.target.value)}
                  placeholder="talkofthetown@upi"
                  className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">Used to generate dynamic QR codes with exact order invoice totals.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Kiosk Idle Auto-Reset (seconds)</span>
                </label>
                <input
                  type="number"
                  min="15"
                  max="300"
                  value={kioskTimeout}
                  onChange={(e) => setKioskTimeout(parseInt(e.target.value) || 45)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">Time before customer self-order screen resets to start page.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Updating SQLite...' : 'Save All Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
