import React, { useState } from 'react';
import { Cloud, ArrowRight, ShieldCheck, CheckCircle2, Clock, AlertCircle, Zap, RefreshCw } from 'lucide-react';
import { CloudOrderRecord, PersistedOrder, WebhookLog } from '../server/types.js';

interface CloudSyncViewProps {
  localOrders: PersistedOrder[];
  cloudOrders: CloudOrderRecord[];
  cloudMetrics: {
    totalRevenue: number;
    totalOrders: number;
    dineInRevenue: number;
    takeawayRevenue: number;
    deliveryRevenue: number;
    activeOutletsCount: number;
  };
  webhookLogs: WebhookLog[];
  onTriggerSync: () => void;
  onSimulateWebhook: (aggregator: 'ZOMATO' | 'SWIGGY') => void;
}

export const CloudSyncView: React.FC<CloudSyncViewProps> = ({
  localOrders,
  cloudOrders,
  cloudMetrics,
  webhookLogs,
  onTriggerSync,
  onSimulateWebhook,
}) => {
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookLog | null>(null);

  const pendingLocalCount = localOrders.filter((o) => o.sync_status === 'PENDING').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner: Multi-Outlet Cloud Overview */}
      <div className="bg-white p-5 rounded-lg border border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-600" />
              <span>Multi-Outlet Cloud Core & Sync Engine Outbox</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enterprise PostgreSQL backend aggregating sales, inventory, and Zomato/Swiggy delivery feeds across all franchise branches.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSimulateWebhook('ZOMATO')}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Push Zomato Webhook</span>
            </button>
            <button
              onClick={() => onSimulateWebhook('SWIGGY')}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Push Swiggy Webhook</span>
            </button>
          </div>
        </div>

        {/* Cloud Financial KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Cloud Revenue
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
              ₹{cloudMetrics.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Cloud Ingested Orders
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
              {cloudMetrics.totalOrders}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Delivery / Aggregator Share
            </span>
            <span className="text-xl font-bold font-mono text-orange-600 tabular-nums">
              ₹{cloudMetrics.deliveryRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Edge Outbox Sync Queue
            </span>
            <span
              className={`text-xl font-bold font-mono tabular-nums ${
                pendingLocalCount > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {pendingLocalCount} Pending
            </span>
          </div>
        </div>
      </div>

      {/* Dual Ledger Comparison: Local SQLite vs Cloud PostgreSQL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: Local Edge SQLite Store */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Local Edge Store (SQLite WAL)
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Terminal POS-01 · Active Outbox State
              </p>
            </div>
            <button
              onClick={onTriggerSync}
              className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-700 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3 text-slate-500" />
              <span>Sync Outbox</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
            {localOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No local orders found in SQLite edge database.
              </div>
            ) : (
              localOrders.map((o) => (
                <div key={o.order_id} className="p-3.5 hover:bg-slate-50/70 transition-colors text-xs flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-slate-900">
                        #{o.invoice_number}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">{o.order_type}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      UUID: {o.order_id.slice(0, 18)}...
                    </div>
                  </div>

                  <div className="text-right space-y-0.5">
                    <span className="font-mono font-bold text-slate-900 block">
                      ₹{o.grand_total.toFixed(2)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 font-mono font-bold text-[11px] ${
                        o.sync_status === 'SYNCED'
                          ? 'text-emerald-600'
                          : o.sync_status === 'PENDING'
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}
                    >
                      {o.sync_status === 'SYNCED' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : o.sync_status === 'PENDING' ? (
                        <Clock className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      <span>{o.sync_status}</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Cloud Core Store */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-blue-50/40">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Cloud Core Store (PostgreSQL Mirror)
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Central Multi-Tenant Ledger · Ingested Records
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {cloudOrders.length} Ingested
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
            {cloudOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Cloud database is awaiting sync payload from Edge or Aggregator.
              </div>
            ) : (
              cloudOrders.map((co) => (
                <div key={co.order_id} className="p-3.5 hover:bg-slate-50/70 transition-colors text-xs flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-slate-900">
                        #{co.invoice_number}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">{co.order_type}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Received at: {new Date(co.received_at).toLocaleTimeString()}
                    </div>
                  </div>

                  <div className="text-right space-y-0.5">
                    <span className="font-mono font-bold text-slate-900 block">
                      ₹{co.grand_total.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-emerald-600 font-semibold font-mono">
                      CONFIRMED IN CLOUD
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Aggregator Webhook Audit Logs Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Zomato & Swiggy Webhook Ingestion Audit Log</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">
              Timing-safe HMAC-SHA256 signature verification & Cloud-to-Edge downlink
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">X-Aggregator-Signature</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4">Webhook ID</th>
                <th className="py-2.5 px-3">Aggregator</th>
                <th className="py-2.5 px-3">HMAC SHA256 Signature</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-4 text-right">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {webhookLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No webhook dispatches received yet. Click "Simulate Zomato Order" in top bar to test!
                  </td>
                </tr>
              ) : (
                webhookLogs.map((wh) => (
                  <tr key={wh.webhook_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {wh.webhook_id}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`font-semibold font-mono px-2 py-0.5 rounded text-[11px] ${
                          wh.aggregator === 'ZOMATO'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-orange-50 text-orange-700 border border-orange-200'
                        }`}
                      >
                        {wh.aggregator}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>HMAC Timing-Safe Verified</span>
                      </span>
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {wh.status}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {new Date(wh.created_at).toLocaleTimeString()}
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
