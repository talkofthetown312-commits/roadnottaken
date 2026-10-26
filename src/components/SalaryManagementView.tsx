import React, { useState } from 'react';
import {
  Users,
  DollarSign,
  Plus,
  Calendar,
  CheckCircle2,
  Printer,
  FileText,
  BadgeAlert,
  ArrowUpRight,
  CreditCard,
  Building,
  UserCheck
} from 'lucide-react';
import { StaffMember, PayrollRecord, StaffRole, PrintSpoolJob } from '../server/types.js';

interface SalaryManagementViewProps {
  staffList: StaffMember[];
  payrollList: PayrollRecord[];
  onAddStaff: (data: { name: string; role: StaffRole; phone: string; monthly_base_salary: number; bank_account_info?: string }) => Promise<void>;
  onRecordPayroll: (data: {
    staff_id: string;
    month: string;
    days_worked: number;
    overtime_hours: number;
    advance_deductions: number;
    bonus: number;
    payment_method: 'BANK_TRANSFER' | 'CASH' | 'UPI';
  }) => Promise<void>;
  onViewPrintJob: (job: PrintSpoolJob) => void;
}

export const SalaryManagementView: React.FC<SalaryManagementViewProps> = ({
  staffList,
  payrollList,
  onAddStaff,
  onRecordPayroll,
  onViewPrintJob,
}) => {
  const [activeTab, setActiveTab] = useState<'roster' | 'payroll'>('roster');
  const [showAddStaffModal, setShowAddStaffModal] = useState<boolean>(false);
  const [showPayoutModal, setShowPayoutModal] = useState<StaffMember | null>(null);

  // Add Staff Form
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState<StaffRole>('ASSISTANT_COOK');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffSalary, setStaffSalary] = useState<number>(18000);
  const [staffBank, setStaffBank] = useState('');
  const [isAddingStaff, setIsAddingStaff] = useState(false);

  // Payout Form
  const [payMonth, setPayMonth] = useState('October 2026');
  const [payDaysWorked, setPayDaysWorked] = useState(30);
  const [payOvertimeHours, setPayOvertimeHours] = useState(0);
  const [payAdvanceDeduction, setPayAdvanceDeduction] = useState(0);
  const [payBonus, setPayBonus] = useState(0);
  const [payMethod, setPayMethod] = useState<'BANK_TRANSFER' | 'CASH' | 'UPI'>('BANK_TRANSFER');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  const totalMonthlyPayrollCommitment = staffList.reduce((sum, s) => sum + s.monthly_base_salary, 0);
  const totalPaidOutThisMonth = payrollList.reduce((sum, p) => sum + p.net_payout, 0);

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName || !staffPhone) return;
    setIsAddingStaff(true);
    try {
      await onAddStaff({
        name: staffName,
        role: staffRole,
        phone: staffPhone,
        monthly_base_salary: Number(staffSalary),
        bank_account_info: staffBank
      });
      setShowAddStaffModal(false);
      setStaffName('');
      setStaffPhone('');
      setStaffBank('');
    } finally {
      setIsAddingStaff(false);
    }
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayoutModal) return;
    setIsSubmittingPayout(true);
    try {
      await onRecordPayroll({
        staff_id: showPayoutModal.staff_id,
        month: payMonth,
        days_worked: Number(payDaysWorked),
        overtime_hours: Number(payOvertimeHours),
        advance_deductions: Number(payAdvanceDeduction),
        bonus: Number(payBonus),
        payment_method: payMethod
      });
      setShowPayoutModal(null);
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const calculatePreviewNet = (member: StaffMember) => {
    const daily = member.monthly_base_salary / 30;
    const base = daily * payDaysWorked;
    const ot = payOvertimeHours * (daily / 8 * 1.5);
    return Math.max(0, Math.round(base + ot + payBonus - payAdvanceDeduction));
  };

  const roleLabels: Record<StaffRole, string> = {
    HEAD_CHEF: 'Head Chef (Wok Master)',
    ASSISTANT_COOK: 'Assistant Cook (Prep)',
    FLOOR_CAPTAIN: 'Floor Captain (LAN POS)',
    CASHIER: 'Cashier (Counter POS)',
    STORE_KEEPER: 'Store Keeper (GRN)',
    KITCHEN_HELPER: 'Kitchen Helper (Sanitize)'
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header Metrics */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600" />
            <span>Staff Roster & Salary Management</span>
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Operational staff ledger · Daily wage math · Salary slip generation
          </p>
        </div>

        <button
          onClick={() => setShowAddStaffModal(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <span className="text-xs font-medium text-slate-500 block">Active Staff on Roster</span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            {staffList.filter((s) => s.is_active).length}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Kitchen, Floor & Counter</span>
        </div>

        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <span className="text-xs font-medium text-slate-500 block">Monthly Base Payroll</span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            ₹{totalMonthlyPayrollCommitment.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Standard 30-day baseline</span>
        </div>

        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <span className="text-xs font-medium text-slate-500 block">Disbursed This Month</span>
          <span className="text-2xl font-bold font-mono text-emerald-600 mt-1 block">
            ₹{totalPaidOutThisMonth.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Logged salary disbursements</span>
        </div>

        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <span className="text-xs font-medium text-slate-500 block">Salary Slips Generated</span>
          <span className="text-2xl font-bold font-mono text-blue-600 mt-1 block">
            {payrollList.length}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">ESC/POS thermal records</span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'roster'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Active Staff Roster ({staffList.length})
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'payroll'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Payroll Disbursal History ({payrollList.length})
        </button>
      </div>

      {/* Tab 1: Staff Roster Table */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="py-3 px-4">Staff ID</th>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3 text-right">Base Monthly Salary</th>
                <th className="py-3 px-3 text-right">Daily Wage Rate</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffList.map((staff) => (
                <tr key={staff.staff_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">{staff.staff_id}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{staff.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono truncate max-w-[200px] block">
                      {staff.bank_account_info || 'Cash Disbursement'}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
                      {roleLabels[staff.role] || staff.role}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">{staff.phone}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                    ₹{staff.monthly_base_salary.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-500">
                    ₹{staff.daily_wage_rate.toFixed(2)}/day
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setShowPayoutModal(staff)}
                      className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded font-semibold text-xs transition-colors shadow-2xs active:scale-95"
                    >
                      Disburse Slip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Payroll Ledger History */}
      {activeTab === 'payroll' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="py-3 px-4">Payroll Ref</th>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-3">Month</th>
                <th className="py-3 px-3 text-right">Days Worked</th>
                <th className="py-3 px-3 text-right">Overtime</th>
                <th className="py-3 px-3 text-right">Deductions</th>
                <th className="py-3 px-3 text-right">Net Paid</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payrollList.map((pay) => (
                <tr key={pay.payroll_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">{pay.payroll_id}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{pay.staff_name}</span>
                    <span className="text-[11px] text-slate-500 font-mono">{pay.role}</span>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-700">{pay.month}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">{pay.days_worked} d</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">₹{pay.overtime_pay.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right font-mono text-red-600">-₹{pay.advance_deductions.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-sm">
                    ₹{pay.net_payout.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600">{pay.payment_method}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold text-[10px] font-mono">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{pay.payment_status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">Add New Staff Member</h3>
            <form onSubmit={handleAddStaffSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="e.g. L. Biren Singh"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Role / Designation</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as StaffRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900"
                >
                  <option value="HEAD_CHEF">Head Chef (Wok Master)</option>
                  <option value="ASSISTANT_COOK">Assistant Cook (Prep)</option>
                  <option value="FLOOR_CAPTAIN">Floor Captain (LAN POS)</option>
                  <option value="CASHIER">Cashier (Counter)</option>
                  <option value="STORE_KEEPER">Store Keeper (GRN)</option>
                  <option value="KITCHEN_HELPER">Kitchen Helper (Sanitize)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    required
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    placeholder="9862000000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Base Monthly (₹)</label>
                  <input
                    type="number"
                    required
                    value={staffSalary}
                    onChange={(e) => setStaffSalary(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Bank / Disbursal Details</label>
                <input
                  type="text"
                  value={staffBank}
                  onChange={(e) => setStaffBank(e.target.value)}
                  placeholder="Bank Name, IFSC, A/C or Cash"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingStaff}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-bold"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disburse Salary Slip Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Generate Salary Slip</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {showPayoutModal.name} · {roleLabels[showPayoutModal.role]}
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                ₹{showPayoutModal.monthly_base_salary}/mo
              </span>
            </div>

            <form onSubmit={handlePayoutSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Salary Month</label>
                  <input
                    type="text"
                    value={payMonth}
                    onChange={(e) => setPayMonth(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Days Worked (out of 30)</label>
                  <input
                    type="number"
                    max={31}
                    min={0}
                    value={payDaysWorked}
                    onChange={(e) => setPayDaysWorked(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Overtime (Hours)</label>
                  <input
                    type="number"
                    min={0}
                    value={payOvertimeHours}
                    onChange={(e) => setPayOvertimeHours(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Advance Deductions (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={payAdvanceDeduction}
                    onChange={(e) => setPayAdvanceDeduction(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-mono text-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Festival / Perf Bonus (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={payBonus}
                    onChange={(e) => setPayBonus(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-mono text-emerald-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-medium"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                    <option value="CASH">Cash Drawer Outflow</option>
                    <option value="UPI">Direct UPI Transfer</option>
                  </select>
                </div>
              </div>

              {/* Net Payout Summary Card */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 block">Computed Net Payout</span>
                  <span className="text-lg font-black font-mono text-slate-900">
                    ₹{calculatePreviewNet(showPayoutModal).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-right text-[11px] text-slate-400 font-mono">
                  Base: ₹{Math.round((showPayoutModal.monthly_base_salary / 30) * payDaysWorked)}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayout}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Payout & Issue Slip</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
