import React, { useState } from 'react';
import {
  BookOpen,
  CheckSquare,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  Scale,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { SopChecklistItem } from '../server/types.js';

interface RuleBookViewProps {
  checklists: SopChecklistItem[];
  onToggleChecklist: (id: string, completed: boolean) => Promise<void>;
}

export const RuleBookView: React.FC<RuleBookViewProps> = ({
  checklists,
  onToggleChecklist,
}) => {
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'OPENING' | 'CLOSING' | 'HYGIENE_SAFETY' | 'CASH_SHIFT'>('ALL');
  const [activeSection, setActiveSection] = useState<'sop' | 'manual'>('sop');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filteredChecklists = checklists.filter((item) => {
    return activeCategory === 'ALL' || item.category === activeCategory;
  });

  const completedCount = checklists.filter((c) => c.completed).length;
  const progressPercent = Math.round((completedCount / (checklists.length || 1)) * 100);

  const handleToggle = async (id: string, currentStatus: boolean) => {
    setTogglingId(id);
    try {
      await onToggleChecklist(id, !currentStatus);
    } finally {
      setTogglingId(null);
    }
  };

  const SOP_CATEGORIES = [
    { key: 'ALL', label: 'All Protocols' },
    { key: 'OPENING', label: 'Morning Opening' },
    { key: 'CLOSING', label: 'Night Closing' },
    { key: 'HYGIENE_SAFETY', label: 'Hygiene & HACCP' },
    { key: 'CASH_SHIFT', label: 'Cash & Shift' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-orange-600" />
            <span>Operational Rule Book & SOP Protocols</span>
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Standard Operating Procedures · Food Safety Manual · Kitchen Portioning Standards
          </p>
        </div>

        {/* View Switcher: Interactive SOP vs Reference Manual */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveSection('sop')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSection === 'sop'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Interactive SOP Checklist</span>
          </button>
          <button
            onClick={() => setActiveSection('manual')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSection === 'manual'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Official Rule Book Manual</span>
          </button>
        </div>
      </div>

      {activeSection === 'sop' ? (
        /* Section 1: Interactive SOP Checklist */
        <div className="space-y-6">
          {/* Progress Banner */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Daily Operations Compliance
              </span>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {completedCount} / {checklists.length} Tasks
                </span>
                <span className="text-xs font-bold text-emerald-600 font-mono px-2 py-0.5 rounded bg-emerald-50">
                  {progressPercent}% Complete
                </span>
              </div>
            </div>

            <div className="w-full sm:w-64 bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {SOP_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key as any)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap active:scale-95 ${
                  activeCategory === cat.key
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* SOP Items List */}
          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 shadow-xs">
            {filteredChecklists.map((sop) => (
              <div
                key={sop.id}
                onClick={() => handleToggle(sop.id, sop.completed)}
                className={`p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 transition-colors ${
                  sop.completed ? 'bg-slate-50/40' : ''
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <input
                    type="checkbox"
                    checked={sop.completed}
                    onChange={() => {}}
                    disabled={togglingId === sop.id}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                  <div>
                    <span
                      className={`text-xs font-semibold block ${
                        sop.completed ? 'text-slate-400 line-through' : 'text-slate-900'
                      }`}
                    >
                      {sop.task}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                      <span className="uppercase font-bold text-slate-500">{sop.category}</span>
                      <span>·</span>
                      <span>Frequency: {sop.frequency}</span>
                      {sop.completed && sop.completed_at && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-600 font-medium">
                            Completed {new Date(sop.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    sop.completed
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {sop.completed ? 'VERIFIED' : 'PENDING'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Section 2: Official Operational Rule Book Manual */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Rule 1: Recipe Portioning & Grammage Standards */}
          <div className="p-5 bg-white rounded-lg border border-slate-200 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Scale className="w-4 h-4 text-orange-600" />
              <h3 className="text-sm font-bold text-slate-900">1. Recipe Portioning & Grammage Standards</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              To guarantee consistent food cost margins and taste profile at Talk of the Town, all cooks must strictly adhere to measured raw batch weights:
            </p>
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 flex justify-between">
                <span className="font-semibold text-slate-800">Chowmein Noodles (Dry)</span>
                <span className="text-slate-600">Small: 80g · Med: 120g · Large: 250g</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 flex justify-between">
                <span className="font-semibold text-slate-800">Steamed Rice (Raw Basis)</span>
                <span className="text-slate-600">Small: 80g · Med: 120g · Large: 250g</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 flex justify-between">
                <span className="font-semibold text-slate-800">Chicken Cut Portioning</span>
                <span className="text-slate-600">Small: 60g · Med: 100g · Large: 200g</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 flex justify-between">
                <span className="font-semibold text-slate-800">Pork Cut Portioning</span>
                <span className="text-slate-600">Small: 60g · Med: 100g · Large: 200g</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 flex justify-between">
                <span className="font-semibold text-slate-800">Chilly Starters (Full Size)</span>
                <span className="text-slate-600">Chicken/Pork: 280g raw + 100g capsicum/onion</span>
              </div>
            </div>
          </div>

          {/* Rule 2: Cash Handling & Shift Variance Rules */}
          <div className="p-5 bg-white rounded-lg border border-slate-200 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <ClipboardList className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">2. Cash Drawer & Shift Handover Rules</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cash drawer security and variance controls for all counter cashiers:
            </p>
            <ul className="space-y-2 text-xs text-slate-700 list-disc pl-4 leading-relaxed">
              <li><strong>Baseline Opening Float</strong>: Exactly ₹2,000 must be in the physical cash drawer at 10:00 AM opening.</li>
              <li><strong>Variance Tolerance</strong>: Discrepancies under ±₹50 are flagged as minor cash rounding. Any variance exceeding ₹50 requires mandatory manager investigation note.</li>
              <li><strong>Z-Report Protocol</strong>: At the end of each shift, the cashier must count physical currency notes before tapping "Close Shift & Print Z-Report".</li>
              <li><strong>No Cash Handover Without Sign-off</strong>: The incoming cashier and outgoing cashier must both sign the physical printed thermal Z-Slip.</li>
            </ul>
          </div>

          {/* Rule 3: Food Safety & HACCP Hygiene */}
          <div className="p-5 bg-white rounded-lg border border-slate-200 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">3. Food Safety, HACCP & Storage</h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-700 list-disc pl-4 leading-relaxed">
              <li><strong>FIFO (First In, First Out)</strong>: All delivered meat (TOT-001 Chicken, TOT-002 Pork) must be dated and stored in the deep freezer at -18°C or chiller at &lt;4°C.</li>
              <li><strong>Cross-Contamination Prevention</strong>: Use dedicated red cutting boards for raw chicken/pork and green boards strictly for fresh vegetables (cabbage, carrot, capsicum).</li>
              <li><strong>Oil Quality Standard</strong>: Cooking oil in high-flame woks must be discarded and recorded if darkened beyond standard caramel color threshold.</li>
              <li><strong>FSSAI Compliance</strong>: Wear hairnets, aprons, and sanitize hands every 60 minutes.</li>
            </ul>
          </div>

          {/* Rule 4: Fire & Gas Emergency Protocol */}
          <div className="p-5 bg-white rounded-lg border border-slate-200 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Flame className="w-4 h-4 text-red-600" />
              <h3 className="text-sm font-bold text-slate-900">4. High-Flame Gas & Emergency Protocol</h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-700 list-disc pl-4 leading-relaxed">
              <li><strong>Main Gas Valve Cutoff</strong>: In the event of an unusual flame flare or gas smell, the Head Chef must immediately shut the master red emergency cutoff valve on TOT-066.</li>
              <li><strong>Grease Fire Safety</strong>: NEVER throw water on hot oil wok fires. Use the wet chemical / CO2 fire extinguisher located next to Station #1.</li>
              <li><strong>Night-time Verification</strong>: The closing manager must physically confirm all 4 wok pilot lights and main pipeline regulators are closed before exiting the premises.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
