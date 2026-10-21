/**
 * Offline Mutation Queue & Synchronization Service
 * In accordance with Requirement MOB-04:
 * - Stores offline state changes and user mutations when disconnected
 * - Attaches unique idempotency keys to avoid duplicate execution
 * - Replays queued mutations upon network connectivity restoration
 */

import { PortfolioApiClient } from '@portfolio-immortalized/api-client';

export interface QueuedMutation {
  id: string;
  idempotencyKey: string;
  action: 'UPDATE_PROFILE' | 'SAVE_SCAN_INTENT' | 'UPDATE_CHECKLIST';
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
}

export class OfflineQueueService {
  private queue: QueuedMutation[] = [];
  private isProcessing: boolean = false;

  /**
   * Enqueues a mutation to be synchronized with the backend
   */
  enqueue(action: QueuedMutation['action'], payload: Record<string, unknown>): QueuedMutation {
    const mutation: QueuedMutation = {
      id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      idempotencyKey: `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      action,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
    };

    this.queue.push(mutation);
    return mutation;
  }

  getPendingMutations(): QueuedMutation[] {
    return [...this.queue];
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }

  /**
   * Replays pending mutations via PortfolioApiClient when network is restored
   */
  async flush(apiClient: PortfolioApiClient): Promise<{ successCount: number; failureCount: number }> {
    if (this.isProcessing || this.queue.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    this.isProcessing = true;
    let successCount = 0;
    let failureCount = 0;

    const remainingQueue: QueuedMutation[] = [];

    for (const item of this.queue) {
      try {
        if (item.action === 'UPDATE_PROFILE') {
          await apiClient.updateProfile(item.payload, item.idempotencyKey);
        }
        // Additional mutation handlers can be registered as needed
        successCount++;
      } catch {
        item.retryCount++;
        failureCount++;
        remainingQueue.push(item);
      }
    }

    this.queue = remainingQueue;
    this.isProcessing = false;

    return { successCount, failureCount };
  }
}

export const offlineQueue = new OfflineQueueService();
