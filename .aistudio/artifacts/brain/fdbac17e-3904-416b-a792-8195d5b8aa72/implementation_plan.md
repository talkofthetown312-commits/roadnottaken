# Petpooja-Class Hybrid-Offline POS Ecosystem

A complete, runnable full-stack Point-of-Sale (POS) platform combining a Local SQLite Edge Transaction Engine, Resilient Bi-Directional Cloud Sync Worker, Raw ESC/POS Thermal Print & KOT Spooler, LAN Companion & KDS Bridge, Zomato/Swiggy Aggregator Webhook Relay, Recipe-Based Raw Material Inventory Auto-Deduction, and Multi-Outlet Cloud Analytics Dashboard.

### User Review & Critical Decisions

> [!IMPORTANT]
> The roadmap is structured into an **8-Part Complete Architecture** (Parts 1–5 already architected, with Parts 6–8 plus Recipe & Inventory Auto-Deduction assembled into a single runnable full-stack application in this workspace). Please review the consolidated blueprint below and click **Proceed** to build the complete interactive system.

- **Confirmed Decision 1 (Total Architecture Roadmap)**: 8-Part End-to-End POS Ecosystem (Parts 1–5 core edge & sync foundation + Parts 6–8 operational, aggregator, inventory, and multi-outlet cloud modules).
- **Confirmed Decision 2 (Prioritized Modules)**:
  - **Part 6**: 3rd-Party Aggregator Webhook Engine (Zomato & Swiggy HMAC-verified ingestion & Cloud-to-Edge downlink).
  - **Part 6B (Inventory Extension)**: Recipe Bill-of-Materials (BOM) & Raw Material Inventory Auto-Deduction with low-stock threshold alerts.
  - **Part 7**: Interactive Cashier POS Billing Terminal, Floor Table Matrix, Captain LAN Order Simulator, and Live Kitchen Display System (KDS) with ESC/POS Receipt & KOT binary/visual inspector.
  - **Part 8**: Multi-Outlet Cloud Core Analytics Dashboard & Live Offline/Online Sync Outbox Control Center.
- **Confirmed Decision 3 (Execution Format)**: Build and wire the complete, runnable full-stack application (Express + `better-sqlite3` Edge/Cloud dual stores + React 19 UI) directly in this workspace.

---

### 1. Overview & Core Concept

- **What It Does**: Provides restaurant cashiers, floor captains, kitchen chefs, and multi-outlet franchise owners with a fault-tolerant POS workspace that processes dine-in, takeaway, delivery, and Zomato/Swiggy aggregator orders at zero latency—even when the restaurant's internet connection is completely severed.
- **Target Audience / Persona**:
  - **Cashiers & Billing Operators**: Need sub-50ms keyboard/touch item punching, split/GST tax calculation, instant KOT firing, and cash-drawer/receipt spooling.
  - **Floor Captains & Kitchen Staff (KDS)**: Need real-time LAN table ordering and ticket preparation state transitions (`PENDING` $\rightarrow$ `PREPARING` $\rightarrow$ `COMPLETED`).
  - **Restaurant Managers & Franchise Owners**: Need automated raw-material stock deduction per recipe sold and consolidated multi-outlet revenue, sync health, and aggregator performance visibility.
- **Key Value**: Eliminates revenue loss during internet blackouts while guaranteeing zero UUID collisions, zero floating-point tax drift, idempotent cloud synchronization, and real-time recipe inventory accuracy.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Cashier Billing & KOT Flow**: Select a dining table or order type (`Dine-In`, `Takeaway`, `Delivery`) $\rightarrow$ punch menu items with live GST (`5%`) & discount computation $\rightarrow$ click **Save & Fire KOT** $\rightarrow$ order commits atomically to Local SQLite (`sync_status = 'PENDING'`), deducts raw ingredients per recipe BOM, spools raw ESC/POS bytes to the Thermal Printer Previewer, and appears immediately on the Kitchen Display System (KDS).
  2. **Offline Outage & Resilient Sync Simulation Flow**: Toggle the **Network Connectivity Switch** to `Offline (ISP Outage)` $\rightarrow$ punch multiple cashier and Captain LAN orders $\rightarrow$ observe orders queueing safely in the Local SQLite Outbox (`PENDING`) while local billing and KDS continue uninterrupted $\rightarrow$ toggle network back to `Online` (or click **Trigger Sync Cycle**) $\rightarrow$ watch the `SyncWorker` batch-upsert orders into the Cloud Core Ledger with optimistic concurrency (`WHERE updated_at = ?`) and flip statuses to `SYNCED`.
  3. **Zomato / Swiggy Aggregator Webhook Flow**: Dispatch a signed Zomato or Swiggy delivery webhook payload $\rightarrow$ Cloud Core verifies the `HMAC-SHA256` signature, records the cloud order, and pushes it down to the Local Edge SQLite store with `sync_status = 'SYNCED'` $\rightarrow$ auto-spools the Kitchen KOT and triggers recipe inventory deduction.
  4. **Kitchen Display (KDS) & Inventory Flow**: Advance tickets from `PENDING` $\rightarrow$ `PREPARING` $\rightarrow$ `COMPLETED` (which automatically re-queues the updated order for Cloud sync) and inspect real-time raw ingredient stock levels (`Paneer`, `Basmati Rice`, `Butter`, `Packaging Boxes`, etc.) with one-click restock actions.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-contrast, utilitarian enterprise SaaS & POS operational workspace engineered for zero visual fatigue during 12-hour restaurant shifts.
  - *Color Palette & Mood (60-30-10 Discipline)*:
    - **60% Dominant Neutral Canvas**: Crisp warm-slate alabaster (`#F8FAFC`) in main analytical views paired with high-contrast slate surfaces (`#FFFFFF`) and deep charcoal (`#0F172A`) for terminal receipts and hardware previews.
    - **30% Structural Surfaces**: Subtle `1px solid` hairline borders (`#E2E8F0`), dense tabular grids (`36px–44px` row height), and muted secondary typography (`#475569`).
    - **10% Accent Budget**: High-intent burnt saffron/terracotta (`#EA580C`) for primary billing CTAs (`Fire KOT & Bill`), paired with semantic state colors always accompanied by explicit text labels: Emerald (`#16A34A`) for `SYNCED / COMPLETED`, Amber (`#D97706`) for `PENDING / PREPARING`, and Crimson (`#DC2626`) for `FAILED / LOW STOCK`.
  - *Typography & Hierarchy (2+1 Font Rule)*:
    - **Display & Navigation**: `Plus Jakarta Sans` (600/700 weights, tight tracking, `text-wrap: balance` on headings).
    - **Body & Controls**: `DM Sans` (400/500 weights) for fast scannability across menu items and operational forms.
    - **Financials, Timestamps, UUIDs & ESC/POS Preview**: `JetBrains Mono` with strict `font-variant-numeric: tabular-nums` so all currency columns, tax splits, quantities, and sync timestamps align vertically.
  - *Component Styling & Layout*:
    - Designed for a full `1440px` desktop viewport with a clean **3-Zone Top Bar Contract** (Zone 1: single-line brand wordmark; Zone 2: 4 concise single-line view navigation links `Cashier POS`, `Kitchen KDS`, `Inventory & BOM`, `Cloud & Sync Center`; Zone 3: 1 primary action button `Simulate Aggregator Order`).
    - Workspace toolbar below the header houses the live **Edge Network Mode Toggle (`Online` / `Offline Mode`)**, **Manual Sync Trigger**, and **Active Outlet/Terminal Context** using unboxed metadata with middle-dot (`·`) separators (strict zero-pill discipline on static metadata).
    - Single-elevation card depth (`border border-slate-200 bg-white`) with zero nested card sandwiches or thick left accent bars.

- **Interactive Feedback & Motion**:
  - Instantaneous `<150ms` button press and cart calculation feedback.
  - Live ESC/POS Thermal Paper Visualizer showing the exact 48-column monospace receipt and Kitchen KOT output alongside the raw hexadecimal byte stream (`1B 40`, `1D 21 11`, `1D 56 42 00`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual Embedded SQLite Schemas (`edge_orders` + `cloud_orders`) Inside the Node.js Backend**
  - *Chosen Approach*: Run both the canonical **Local Edge SQLite tables** (`orders`, `order_items`, `inventory_items`, `recipe_bom`, `print_spool_log`) and the **Cloud Core mirror tables** (`cloud_orders`, `cloud_order_items`, `webhook_logs`) inside the real Node.js `better-sqlite3` engine, connected via the actual `SyncWorker` HTTP loop and `cloudSyncController` batch upsert logic.
  - *Why*: Allows every single architectural component from Parts 1–8 (ACID transactions, optimistic concurrency `WHERE updated_at = ?`, per-order savepoint isolation, offline network toggle, and cloud analytics) to execute 100% genuinely in the workspace without requiring external Docker containers.
  - *Alternatives Considered*: Mocking the database in browser `localStorage` (rejected because it cannot execute real SQLite prepared statements, foreign keys, WAL mode, or server-side webhook HMAC validation).

- **Decision 2: Transactional Recipe & Raw Material Inventory Auto-Deduction**
  - *Chosen Approach*: Link every menu item (`item_id`) to a Bill of Materials (`recipe_bom`) defining exact gram/milliliter/unit consumption per dish. When `OrderRepository.createOrder()` executes, it deducts raw material stock inside the same ACID transaction (and restores stock if an order is `CANCELLED`).
  - *Why*: Prevents ghost inventory drift when operating offline and gives managers immediate low-stock visibility.

- **Decision 3: Bi-Directional Flow Without Infinite Sync Loops**
  - *Chosen Approach*: Orders created locally on the POS or Captain LAN start with `sync_status = 'PENDING'` and flow upward to the Cloud. Orders arriving from Zomato/Swiggy webhooks hit the Cloud first and are pushed down to the Edge SQLite database with `sync_status = 'SYNCED'`.
  - *Why*: Prevents the Edge `SyncWorker` from redundantly echoing cloud-originated aggregator orders back up to the Cloud unless the restaurant subsequently modifies their status (e.g., `PREPARING` $\rightarrow$ `COMPLETED`).

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

#### Complete 8-Part Roadmap Summary

| Part | Architectural Module | Status |
| :--- | :--- | :--- |
| **Part 1** | Local Edge (SQLite) & Cloud Core (PostgreSQL) Schemas (`orders` & `order_items`) | Completed |
| **Part 2** | Atomic `OrderRepository` with Prepared Statements & Concurrency Guards | Completed |
| **Part 3** | Resilient `SyncWorker` (Mutex + Exponential Backoff) & Cloud Batch Upsert API | Completed |
| **Part 4** | Raw `EscPosBuilder` Byte Encoder & `ThermalPrinterService` TCP/Spooler | Completed |
| **Part 5** | `LocalEdgeServer` for Captain Android App LAN Orders & Real-Time KDS | Completed |
| **Part 6** | Zomato/Swiggy HMAC Webhook Engine + Recipe BOM Inventory Auto-Deduction | In Plan |
| **Part 7** | Interactive Cashier POS Terminal, Captain LAN Simulator & KDS Workbench UI | In Plan |
| **Part 8** | Multi-Outlet Cloud Core Analytics & Live Sync Outbox Inspector UI | In Plan |

#### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                       FRONTEND WORKSPACE (React 19 + Tailwind CSS)                     │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Top Bar Contract: Brand Wordmark  │  4 View Nav Links  │  Simulate Webhook CTA   │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Edge Control Strip: Network Toggle (Online/Offline) · Sync Now · Pending Count   │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│         │                         │                         │                  │       │
│         ▼                         ▼                         ▼                  ▼       │
│  ┌──────────────┐         ┌──────────────┐          ┌──────────────┐   ┌────────────┐  │
│  │ View 1:      │         │ View 2:      │          │ View 3:      │   │ View 4:    │  │
│  │ Cashier POS  │         │ Kitchen KDS  │          │ Recipe BOM & │   │ Cloud Core │  │
│  │ & Thermal    │         │ & Captain    │          │ Raw Material │   │ & Sync     │  │
│  │ Spooler      │         │ LAN Console  │          │ Inventory    │   │ Inspector  │  │
│  └──────┬───────┘         └──────┬───────┘          └──────┬───────┘   └─────┬──────┘  │
└─────────┼────────────────────────┼─────────────────────────┼─────────────────┼─────────┘
          │                        │                         │                 │
          ▼                        ▼                         ▼                 ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                     NODE.JS / EXPRESS FULL-STACK ENGINE (Port 3000)                    │
│                                                                                        │
│  ┌────────────────────────────────────────────────┐    ┌────────────────────────────┐  │
│  │ LOCAL EDGE TIER                                │    │ CLOUD CORE TIER            │  │
│  │ • OrderRepository (ACID Transactions)          │    │ • POST /api/cloud/sync     │  │
│  │ • InventoryService (Recipe BOM Auto-Deduction) │───▶│   (Idempotent Batch Upsert │  │
│  │ • EscPosBuilder & ThermalPrinterService        │    │    WHERE updated_at >= old)│  │
│  │ • LocalEdgeServer (/api/lan/orders + Idempotent│    │ • POST /api/webhooks/:agg  │  │
│  │   UUID Guard)                                  │◀───│   (Zomato/Swiggy HMAC-256  │  │
│  │ • SyncWorker (Mutex, Backoff, Offline Switch)  │    │    Downlink to Edge)       │  │
│  └───────────────────────┬────────────────────────┘    └──────────────┬─────────────┘  │
│                          ▼                                            ▼                │
│         ┌─────────────────────────────────┐          ┌─────────────────────────┐       │
│         │ Local Edge SQLite (WAL Mode)    │          │ Cloud Core Ledger Store │       │
│         │ orders, order_items,            │          │ cloud_orders,           │       │
│         │ inventory_items, recipe_bom,    │          │ cloud_order_items,      │       │
│         │ print_spool_jobs                │          │ aggregator_webhooks     │       │
│         └─────────────────────────────────┘          └─────────────────────────┘       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Data Model & State

1. **Local Edge Tables (`orders`, `order_items`)**:
   - Exact schema from Part 1: `order_id` (`UUIDv4`), `outlet_id`, `terminal_id`, `invoice_number`, `order_status` (`PENDING`, `PREPARING`, `COMPLETED`, `CANCELLED`), `order_type` (`DINE_IN`, `TAKEAWAY`, `DELIVERY`), financials (`sub_total`, `tax_total`, `discount_total`, `grand_total`), `sync_status` (`PENDING`, `SYNCED`, `FAILED`), `created_at`, `updated_at`.
2. **Recipe & Raw Material Inventory Tables (`inventory_items`, `recipe_bom`)**:
   - `inventory_items`: `ingredient_id`, `name`, `unit` (`g`, `ml`, `pcs`), `current_stock`, `reorder_level`, `updated_at`.
   - `recipe_bom`: Maps `item_id` (menu dish) $\rightarrow$ `ingredient_id` + `quantity_required` per unit sold.
3. **Hardware Print Spool Log (`print_spool_jobs`)**:
   - Stores generated ESC/POS text rendering, hex byte preview (`1B 40 ...`), target station (`Main Kitchen KOT: 192.168.1.201:9100` vs `Cashier Receipt Printer`), and delivery status.
4. **Cloud Core Tables (`cloud_orders`, `cloud_order_items`, `aggregator_webhooks`)**:
   - Mirrors the Cloud PostgreSQL schema from Part 1 (`merchant_id`, `outlet_id`, `received_at`, etc.) so users can inspect the exact divergence between Local Edge SQLite and Cloud Core when offline vs. online.

#### Interactive Component & State Mapping

- **Cashier Billing View**:
  - Category filter buttons (`All`, `North Indian Mains`, `Tandoor & Breads`, `Beverages`, `Desserts`), table selector (`T-01` to `T-08`), order type switcher (`DINE_IN`, `TAKEAWAY`, `DELIVERY`), item quantity controls, discount input, and **Fire KOT & Print Bill** button.
  - Submitting an order executes `OrderRepository.createOrder()`, deducts ingredients via `InventoryService`, generates binary + visual ESC/POS output via `EscPosBuilder`, and triggers `SyncWorker` (if online).
- **Kitchen KDS & Captain LAN View**:
  - Displays live active tickets with one-click state transitions (`Start Preparing`, `Mark Completed`, `Cancel & Restore Stock`) plus a **Captain Android Handheld Simulator** that posts orders through the `/api/lan/orders` endpoint with an option to test **Double-Tap Idempotency** (sending the same `order_id` twice to verify zero duplicate KOTs).
- **Recipe BOM & Inventory View**:
  - Displays real-time raw material stock levels, recipe ingredient breakdown per menu item, low-stock warnings, and a **Restock Ingredient** action.
- **Cloud Core & Sync Engine Inspector View**:
  - Shows side-by-side comparison of **Local Edge SQLite Outbox (`PENDING` / `SYNCED` / `FAILED`)** vs **Cloud Core Ingested Orders (`received_at`)**, network outage simulation controls, exponential backoff telemetry, and a **Zomato / Swiggy Webhook Simulator** with live `HMAC-SHA256` signature verification logs.
