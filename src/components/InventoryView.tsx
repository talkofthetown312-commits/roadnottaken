import React, { useState } from 'react';
import { Package, AlertCircle, CheckCircle2, Plus, Sparkles, RefreshCw, Search, Filter } from 'lucide-react';
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
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>(catalog[0]?.item_id || 'cm-veg-s');
  const [restockingId, setRestockingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTreatment, setSelectedTreatment] = useState<string>('All');

  const selectedItem = catalog.find((c) => c.item_id === selectedMenuItemId) || catalog[0] || {
    item_id: 'unknown',
    name: 'Selected Dish',
    price: 0,
    category: 'Chowmein'
  };
  const itemBOM = bomList.filter((b) => b.item_id === selectedMenuItemId);

  // Extract unique categories from 144 items
  const categories = ['All', ...Array.from(new Set(inventory.map((i) => i.category).filter(Boolean) as string[]))];
  const treatments = ['All', 'Recipe-Linked', 'Recurring Stock', 'Fixed Asset'];

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ingredient_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesTreatment = selectedTreatment === 'All' || item.treatment === selectedTreatment;
    return matchesSearch && matchesCategory && matchesTreatment;
  });

  const lowStockCount = inventory.filter((i) => i.is_low_stock && i.treatment !== 'Fixed Asset').length;
  const totalValuation = inventory.reduce(
    (sum, i) => sum + i.current_stock * i.cost_per_unit,
    0
  );

  const handleRestock = async (ing: InventoryItem) => {
    setRestockingId(ing.ingredient_id);
    const amount = ing.unit === 'pcs' || ing.unit === 'unit' || ing.unit === 'box' || ing.unit === 'packet'
      ? 50
      : ing.unit === 'litre' || ing.unit === 'can'
      ? 10
      : 25; // kg
    try {
      await onRestock(ing.ingredient_id, amount);
    } finally {
      setRestockingId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Inventory Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Master Inventory
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {inventory.length}
            </span>
            <span className="text-xs text-slate-500">Catalogued Items (TOT-001 to TOT-144)</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Categories & Treatments
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-slate-900">
              14
            </span>
            <span className="text-xs text-slate-500">Food, Packaging, Assets & Ops</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Replenishment Required
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-bold font-mono ${
                lowStockCount > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {lowStockCount}
            </span>
            <span className="text-xs text-slate-500">
              {lowStockCount > 0 ? 'Pending GRN Receipt / Inward' : 'Stock Levels Verified'}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Stock Valuation
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-slate-900">
              ₹{totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-slate-500">Weighted Average Basis</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Master Inventory Table */}
        <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-600" />
                  <span>Talk of the Town Master Inventory Ledger (144 Items)</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Authoritative records (TOT-001 to TOT-144) • Tracked in SQLite
                </p>
              </div>
              <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                Showing {filteredInventory.length} of {inventory.length}
              </span>
            </div>

            {/* Filter and Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search item, ID (TOT-...), category..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'All' ? 'All Categories (14)' : cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedTreatment}
                  onChange={(e) => setSelectedTreatment(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                >
                  {treatments.map((tr) => (
                    <option key={tr} value={tr}>
                      {tr === 'All' ? 'All Treatments' : tr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold z-10">
                <tr>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Item / Material</th>
                  <th className="py-2.5 px-2">Category</th>
                  <th className="py-2.5 px-2">Treatment</th>
                  <th className="py-2.5 px-3 text-right">Current Stock</th>
                  <th className="py-2.5 px-2 text-center">Unit</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((ing) => (
                  <tr key={ing.ingredient_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-600 text-[11px]">
                      {ing.ingredient_id}
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {ing.name}
                    </td>

                    <td className="py-2.5 px-2 text-slate-600 text-[11px] truncate max-w-[140px]" title={ing.category}>
                      {ing.category}
                    </td>

                    <td className="py-2.5 px-2">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        ing.treatment === 'Recipe-Linked'
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : ing.treatment === 'Fixed Asset'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {ing.treatment || 'Stock'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {ing.current_stock.toLocaleString()}
                    </td>

                    <td className="py-2.5 px-2 text-center font-mono text-slate-500 text-[11px]">
                      {ing.unit}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleRestock(ing)}
                        disabled={restockingId === ing.ingredient_id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 transition-colors font-semibold text-[11px]"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Inward</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 4 Columns: Recipe Bill of Materials (BOM) Explorer */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <div className="p-1.5 bg-orange-50 text-orange-600 rounded-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                Recipe Bill of Materials (BOM)
              </h4>
              <p className="text-[11px] text-slate-500 font-mono">
                Formula linked to reopening menu
              </p>
            </div>
          </div>

          {/* Menu Item Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Select Reopening Dish:
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
              When 1 serving is punched at POS, SQLite atomically deducts these exact raw materials:
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {itemBOM.length > 0 ? (
                itemBOM.map((bom) => (
                  <div
                    key={bom.ingredient_id}
                    className="flex items-center justify-between text-xs p-2 bg-white rounded border border-slate-100"
                  >
                    <div>
                      <span className="font-medium text-slate-800 block">{bom.ingredient_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{bom.ingredient_id}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      {bom.quantity_required} {bom.unit}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-slate-400 bg-white rounded border border-slate-100">
                  Fixed Starters formula links directly to raw cuts & seasonings.
                </div>
              )}
              <div className="flex items-center justify-between text-xs p-2 bg-white rounded border border-slate-100">
                <div>
                  <span className="font-medium text-slate-800 block">Takeaway Packaging Container</span>
                  <span className="text-[10px] text-slate-400 font-mono">TOT-031</span>
                </div>
                <span className="font-mono font-bold text-slate-900">1 pcs (Takeaway/Delivery)</span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>If an order is cancelled or voided, ingredients restore automatically.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
