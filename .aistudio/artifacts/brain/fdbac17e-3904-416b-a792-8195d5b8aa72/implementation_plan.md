# Enterprise Restaurant POS & ERP — Operational Modules Implementation

Comprehensive restaurant management suite for Talk of the Town / Road Not Taken POS, incorporating customer self-ordering kiosk mode, hardware configuration, operations AI assistant, staff salary & payroll management, operational SOP rule book, and culinary photography.

## Implemented Modules & Architecture

### 1. Customer Self-Ordering Touch Kiosk (`KioskView.tsx`)
- **Visual Food Catalog**: High-resolution dish photos for all 34 reopening dishes (Chowmein, Fried Rice, Chilly Starters) across sizes (`Small`, `Medium`, `Large`, `Full`).
- **Touch-First Cart**: Tactile quantity stepper with cart bounce micro-animation and order summary.
- **Dynamic UPI Payment QR**: Built-in NPCI BharatQR generator encoding exact order invoice totals with instant payment status indication.
- **Auto-Reset Idle Timer**: Configurable countdown (default 45-60s) returning kiosk to welcoming splash mode.

### 2. Restaurant Profile & Hardware Configuration (`RestaurantProfileModal.tsx`)
- **Brand & Legal Compliance**: Restaurant Name, Outlet Name, Address, Contact Phone, Email, GSTIN, and FSSAI License.
- **Tax Rate Configuration**: CGST (2.5%) and SGST (2.5%) rate overrides with live invoice recalculation.
- **Thermal ESC/POS Hardware**: Network Printer IP, Port (9100), and Paper Width selection (`58mm` / `80mm`).
- **Payment & Terminal Settings**: Merchant UPI VPA for dynamic QR generation and Kiosk idle timeout seconds.

### 3. Staff Salary & Payroll Management (`SalaryManagementView.tsx`)
- **Staff Roster**: Role-based employee directory (`HEAD_CHEF`, `ASSISTANT_COOK`, `FLOOR_CAPTAIN`, `CASHIER`, `KITCHEN_HELPER`, `STORE_KEEPER`).
- **Salary Computation Engine**: Base monthly salary, pro-rated daily wages (`base / 30`), overtime hours calculation (1.5x hourly rate), advance wage deductions, and performance bonuses.
- **Disbursement & Thermal Slips**: Automated payroll ledger entry with printable thermal salary slips.

### 4. Operational Rule Book & Standard Operating Procedures (`RuleBookView.tsx`)
- **Interactive Checklists**: Morning Opening, Night Closing, Hygiene & HACCP Food Safety, and Cash Shift Handovers with live progress tracking.
- **Official Policy Manual**: Standardized portioning guides, cash drawer variance protocols, and emergency escalation workflows.

### 5. Operations AI Assistant (`AssistantView.tsx` & `/api/assistant/ask`)
- **Live Grounded Intelligence**: Directly inspects SQLite edge database tables (`orders`, `inventory_items`, `shifts`, `payroll_ledger`, `sop_checklists`).
- **Pre-Engineered Prompts**: Daily sales summaries, 144 master inventory reorder alerts, recipe food cost margins, and SOP compliance reviews.

### 6. Deployment Resilience & Zero-Mock Integrity
- **Production Trampoline**: Self-bootstrapping `server.ts` with tsx runtime for headless container deployments.
- **Zero Mock State**: 0 orders, 0 mock customers, and unverified 0 stock placeholders for the 144 items (`TOT-001` through `TOT-144`), ready for live inwards via GRN.

## Verification
- `npm run lint` (`tsc --noEmit`) passes with 0 errors.
- `compile_applet` passes and `npm run build` generates production assets in <600ms.
- REST endpoints verified live on `http://localhost:3000/api/bootstrap`, `/api/assistant/ask`, `/api/sop`, and `/api/payroll`.
