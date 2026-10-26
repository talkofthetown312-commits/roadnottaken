import React from 'react';
import {
  UtensilsCrossed,
  ChefHat,
  Package,
  Cloud,
  Zap,
  Scale,
  LayoutGrid,
  Truck,
  Store,
  Settings,
  Tv,
  Users,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { RestaurantProfile } from '../server/types';

export type ActiveTab =
  | 'cashier'
  | 'kiosk'
  | 'tables'
  | 'kds'
  | 'inventory'
  | 'procurement'
  | 'shifts'
  | 'salary'
  | 'rules'
  | 'assistant'
  | 'cloud';

interface TopBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onSimulateWebhook: (aggregator: 'ZOMATO' | 'SWIGGY') => void;
  restaurantProfile?: RestaurantProfile | null;
  onOpenProfileSettings?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onTabChange,
  onSimulateWebhook,
  restaurantProfile,
  onOpenProfileSettings,
}) => {
  return (
    <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 bg-white border-b border-slate-200">
      {/* Zone 1: System Brand Wordmark & Distinct Restaurant Identity */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white shadow-xs font-black text-sm tracking-wider">
            R
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-tight text-slate-900 whitespace-nowrap leading-tight">
              Road Not Taken
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-orange-600 leading-none">
              Enterprise POS
            </span>
          </div>
        </div>

        {/* Dedicated Restaurant / Branch Identity (Configurable in SQLite) */}
        {restaurantProfile && (
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-200">
            <button
              onClick={onOpenProfileSettings}
              className="group flex items-center gap-2 text-left py-1 px-2 rounded-md hover:bg-slate-100 border border-slate-200/80 transition-colors"
              title="Click to configure Restaurant Name, Tax rates, Printers, and UPI"
            >
              <Store className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-900 transition-colors" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800 leading-tight group-hover:text-orange-600 transition-colors">
                  {restaurantProfile.restaurant_name}
                </span>
                <span className="text-[10px] text-slate-500 leading-none">
                  {restaurantProfile.outlet_name}
                </span>
              </div>
              <Settings className="w-3 h-3 text-slate-400 group-hover:text-slate-700 ml-1 opacity-70" />
            </button>
          </div>
        )}
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-thin">
        <button
          onClick={() => onTabChange('cashier')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'cashier'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          <span>Cashier POS</span>
        </button>

        <button
          onClick={() => onTabChange('kiosk')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'kiosk'
              ? 'bg-orange-600 text-white shadow-xs font-bold'
              : 'text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200/70'
          }`}
          title="Customer Self-Ordering Touch Kiosk with Photos & Dynamic UPI QR"
        >
          <Tv className="w-3.5 h-3.5" />
          <span>Self-Order Kiosk</span>
        </button>

        <button
          onClick={() => onTabChange('tables')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'tables'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Floor & Split</span>
        </button>

        <button
          onClick={() => onTabChange('kds')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'kds'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ChefHat className="w-3.5 h-3.5" />
          <span>Kitchen KDS</span>
        </button>

        <button
          onClick={() => onTabChange('inventory')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'inventory'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Recipe BOM & Stock</span>
        </button>

        <button
          onClick={() => onTabChange('procurement')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'procurement'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>PO & Inward</span>
        </button>

        <button
          onClick={() => onTabChange('shifts')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'shifts'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Shift & Z-Report</span>
        </button>

        <button
          onClick={() => onTabChange('salary')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'salary'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Staff & Salary</span>
        </button>

        <button
          onClick={() => onTabChange('rules')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'rules'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Rule Book & SOP</span>
        </button>

        <button
          onClick={() => onTabChange('assistant')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'assistant'
              ? 'bg-purple-900 text-white shadow-xs font-bold'
              : 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/70'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          <span>Operations AI</span>
        </button>

        <button
          onClick={() => onTabChange('cloud')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'cloud'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Cloud className="w-3.5 h-3.5" />
          <span>Cloud & Sync</span>
        </button>
      </nav>

      {/* Zone 3: Settings button & Webhook simulators */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenProfileSettings}
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors whitespace-nowrap"
          title="Open Restaurant Profile, Printer, and UPI Configuration"
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Settings</span>
        </button>

        <button
          onClick={() => onSimulateWebhook('ZOMATO')}
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-xs whitespace-nowrap"
          title="Simulate signed Zomato delivery order webhook"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Zomato</span>
        </button>

        <button
          onClick={() => onSimulateWebhook('SWIGGY')}
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors shadow-xs whitespace-nowrap"
          title="Simulate signed Swiggy delivery order webhook"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Swiggy</span>
        </button>
      </div>
    </header>
  );
};
