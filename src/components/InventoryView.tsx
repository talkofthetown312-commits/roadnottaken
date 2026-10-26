import React, { useState } from 'react';
import { Package, AlertCircle, CheckCircle2, Plus, Sparkles, RefreshCw } from 'lucide-react';
import { InventoryItem, MenuItem, RecipeBOM } from '../server/types.js';

interface InventoryViewProps {
  inventory: (InventoryItem & { is_low_stock: boolean })[];
  bomList: RecipeBOM[];
  catalog: MenuItem[];
  onRestock: (ingredientId: string, amount: number) => Promise<void>;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  bomList,
  catalog,
  onRestock,
}) => {
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>('item-001');
  const [restockingId, setRestockingId] = useState<string | null>(null);

  const selectedItem = catalog.find((c) => c.item_id === selectedMenuItemId) || catalog[0];
  const itemBOM = bomList.filter((b) => b.item_id === selectedMenuItemId);

  const lowStockCount = inventory.filter((i) => i.is_low_stock).length;
  const totalValuation = inventory.reduce(
    (sum, i) => sum + i.current_stock * i.cost_per_unit,
    0
  );

  const handleRestock = async (ing: InventoryItem) => {
    setRestockingId(ing.ingredient_id);
    const amount = ing.unit === 'pcs' ? 100 : ing.unit === 'ml' ? 3000 : 5000;
    try {
      await onRestock(ing.ingredient_id, amount);
    } finally {
      setRestockingId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Inventory Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Raw Material Items
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {inventory.length}
            </span>
            <span className="text-xs text-slate-500">Tracked Ingredients</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Low Stock Alerts
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-bold font-mono ${
                lowStockCount > 0 ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {lowStockCount}
            </span>
            <span className="text-xs text-slate-500">
              {lowStockCount > 0 ? 'Requires Replenishment' : 'All Stock Healthy'}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Inventory Valuation
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-slate-900">
              ₹{totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-slate-500">Cost Basis</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Raw Materials Table */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Live Ingredient Stock Ledger
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Auto-deducted inside SQLite transaction on every order
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">Unit: Grams / mL / Pcs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Ingredient Name</th>
                  <th className="py-2.5 px-3 text-right">Current Stock</th>
                  <th className="py-2.5 px-3 text-right">Reorder Point</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map((ing) => (
                  <tr key={ing.ingredient_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {ing.name}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {ing.current_stock.toLocaleString()} {ing.unit}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-500 tabular-nums">
                      {ing.reorder_level.toLocaleString()} {ing.unit}
                    </td>

                    <td className="py-3 px-3">
                      {ing.is_low_stock ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-bold font-mono">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>LOW</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>NOMINAL</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRestock(ing)}
                        disabled={restockingId === ing.ingredient_id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 transition-colors font-semibold"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Restock</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 5 Columns: Recipe Bill of Materials (BOM) Explorer */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <div className="p-1.5 bg-orange-50 text-orange-600 rounded-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                Recipe Bill of Materials (BOM)
              </h4>
              <p className="text-[11px] text-slate-500 font-mono">
                Inspect ingredient formula per dish
              </p>
            </div>
          </div>

          {/* Menu Item Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Select Menu Dish:
            </label>
            <select
              value={selectedMenuItemId}
              onChange={(e) => setSelectedMenuItemId(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-800 focus:ring-1 focus:ring-slate-900"
            >
              {catalog.map((m) => (
                <option key={m.item_id} value={m.item_id}>
                  {m.name} (₹{m.price})
                </option>
              ))}
            </select>
          </div>

          {/* BOM Breakdown Card */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-xs text-slate-900">{selectedItem.name}</span>
              <span className="text-xs font-mono font-semibold text-orange-600">
                Menu Price: ₹{selectedItem.price}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              When 1 portion is punched by cashier or floor captain, SQLite automatically decrements these exact quantities:
            </p>

            <div className="space-y-2">
              {itemBOM.map((bom) => (
                <div
                  key={bom.ingredient_id}
                  className="flex items-center justify-between text-xs p-2 bg-white rounded border border-slate-100"
                >
                  <span className="font-medium text-slate-800">{bom.ingredient_name}</span>
                  <span className="font-mono font-bold text-slate-900">
                    {bom.quantity_required} {bom.unit}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs p-2 bg-white rounded border border-slate-100">
                <span className="font-medium text-slate-800">Eco-Craft Packaging Box</span>
                <span className="font-mono font-bold text-slate-900">1 pcs (Takeaway/Delivery)</span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>If order is CANCELLED, stock is immediately restored.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
