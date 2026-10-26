import { OrderRepository } from './orderRepository.js';
import { CloudSyncController } from './cloudSyncController.js';

export interface SyncTelemetry {
  isOnline: boolean;
  isSyncing: boolean;
  consecutiveFailures: number;
  lastSyncTimestamp: string | null;
  lastSyncError: string | null;
  syncedInLastRun: number;
  mode: 'SIMULATED_LAN_EDGE';
}

export class SyncEngine {
  private repo: OrderRepository;
  private cloudController: CloudSyncController;
  private isOnlineState: boolean = true;
  private isSyncing: boolean = false;
  private consecutiveFailures: number = 0;
  private lastSyncTimestamp: string | null = null;
  private lastSyncError: string | null = null;
  private syncedInLastRun: number = 0;
  private timerHandle: NodeJS.Timeout | null = null;
  private readonly merchantId: string = 'merch-sapphire-corp-01';

  constructor(repo: OrderRepository, cloudController: CloudSyncController) {
    this.repo = repo;
    this.cloudController = cloudController;
    this.startBackgroundLoop();
  }

  public setOnlineStatus(online: boolean): void {
    const wasOffline = !this.isOnlineState && online;
    this.isOnlineState = online;
    if (wasOffline) {
      console.log('[SyncEngine] Network restored to ONLINE. Triggering immediate sync.');
      void this.executeSyncCycle();
    } else if (!online) {
      console.log('[SyncEngine] Network switched to OFFLINE (ISP Outage simulation).');
      this.lastSyncError = 'Network offline (simulated)';
    }
  }

  public getOnlineStatus(): boolean {
    return this.isOnlineState;
  }

  public getTelemetry(): SyncTelemetry {
    return {
      isOnline: this.isOnlineState,
      isSyncing: this.isSyncing,
      consecutiveFailures: this.consecutiveFailures,
      lastSyncTimestamp: this.lastSyncTimestamp,
      lastSyncError: this.lastSyncError,
      syncedInLastRun: this.syncedInLastRun,
      mode: 'SIMULATED_LAN_EDGE'
    };
  }

  public triggerImmediateSync(): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    return this.executeSyncCycle();
  }

  private startBackgroundLoop(): void {
    const intervalMs = 6000;
    this.timerHandle = setInterval(() => {
      void this.executeSyncCycle();
    }, intervalMs);
  }

  public stop(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  public async executeSyncCycle(): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    if (this.isSyncing) {
      return { success: false, syncedCount: 0, error: 'Sync already in flight (mutex locked)' };
    }

    if (!this.isOnlineState) {
      this.consecutiveFailures += 1;
      this.lastSyncError = 'Cannot sync: Terminal is currently offline (Simulated Outage)';
      return { success: false, syncedCount: 0, error: this.lastSyncError };
    }

    this.isSyncing = true;
    try {
      const pendingOrders = this.repo.getPendingSyncOrders(50);
      if (pendingOrders.length === 0) {
        this.consecutiveFailures = 0;
        this.lastSyncError = null;
        this.syncedInLastRun = 0;
        return { success: true, syncedCount: 0 };
      }

      // Snapshot (order_id, updated_at) to avoid overwriting in-flight cashier edits
      const snapshotMap = new Map<string, string>();
      for (const order of pendingOrders) {
        snapshotMap.set(order.order_id, order.updated_at);
      }

      // Ingest into Cloud PostgreSQL controller
      const cloudResult = this.cloudController.ingestBatch(this.merchantId, pendingOrders);

      // Acknowledge successfully ingested orders
      if (cloudResult.synced_order_ids.length > 0) {
        const ackSnapshots = cloudResult.synced_order_ids
          .filter((id) => snapshotMap.has(id))
          .map((id) => ({
            order_id: id,
            updated_at: snapshotMap.get(id)!
          }));

        this.repo.markOrdersSynced(ackSnapshots);
        this.syncedInLastRun = ackSnapshots.length;
      }

      // Mark rejected records as failed
      if (cloudResult.failed_orders.length > 0) {
        const failedIds = cloudResult.failed_orders.map((f) => f.order_id);
        this.repo.markOrdersFailed(failedIds);
      }

      this.consecutiveFailures = 0;
      this.lastSyncTimestamp = new Date().toISOString();
      this.lastSyncError = null;

      return { success: true, syncedCount: cloudResult.synced_order_ids.length };
    } catch (err: any) {
      this.consecutiveFailures += 1;
      this.lastSyncError = err.message || 'Sync worker exception';
      return { success: false, syncedCount: 0, error: this.lastSyncError || undefined };
    } finally {
      this.isSyncing = false;
    }
  }
}
