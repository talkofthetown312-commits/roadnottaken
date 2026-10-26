import React from 'react';
import { UtensilsCrossed, ChefHat, Package, Cloud, Zap, Scale, LayoutGrid } from 'lucide-react';

export type ActiveTab = 'cashier' | 'tables' | 'kds' | 'inventory' | 'shifts' | 'cloud';

interface TopBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onSimulateWebhook: (aggregator: 'ZOMATO' | 'SWIGGY') => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onTabChange,
  onSimulateWebhook,
}) => {
  return (
    <header className="flex items-center justify-between gap-6 px-6 py-3.5 bg-white border-b border-slate-200">
      {/* Zone 1: Brand Wordmark (Single element, no nested pills) */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white shadow-sm font-bold text-sm tracking-wider">
          P
        </div>
        <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
          Petpooja Edge POS
        </span>
      </div>

      {/* Zone 2: Navigation Links (Single-line, concise) */}
      <nav className="flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => onTabChange('cashier')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'cashier'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          <span>Cashier POS</span>
        </button>

        <button
          onClick={() => onTabChange('tables')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'tables'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Floor & Split Bill</span>
        </button>

        <button
          onClick={() => onTabChange('kds')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'kds'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ChefHat className="w-3.5 h-3.5" />
          <span>Kitchen KDS & LAN</span>
        </button>

        <button
          onClick={() => onTabChange('inventory')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Recipe BOM & Stock</span>
        </button>

        <button
          onClick={() => onTabChange('shifts')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'shifts'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Shift & Z-Report</span>
        </button>

        <button
          onClick={() => onTabChange('cloud')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'cloud'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Cloud className="w-3.5 h-3.5" />
          <span>Cloud Core & Sync</span>
        </button>
      </nav>

      {/* Zone 3: Single Primary Action */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onSimulateWebhook('ZOMATO')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-xs whitespace-nowrap"
          title="Simulate signed Zomato delivery order webhook"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Simulate Zomato Order</span>
        </button>

        <button
          onClick={() => onSimulateWebhook('SWIGGY')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors shadow-xs whitespace-nowrap"
          title="Simulate signed Swiggy delivery order webhook"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Simulate Swiggy Order</span>
        </button>
      </div>
    </header>
  );
};
