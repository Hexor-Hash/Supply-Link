import { describe, it, expect } from 'vitest';
import {
  buildOwnershipNotification,
  buildApprovalPendingNotification,
  buildApprovalFinalizedNotification,
  buildApprovalRejectedNotification,
  buildRecallNotification,
  buildContractErrorNotification,
} from '@/lib/hooks/useNotifications';

const NOW = 1_700_000_000_000;
const PRODUCT_ID = 'prod-001';
const PRODUCT_NAME = 'Arabica Coffee';
const ACTOR = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX1';

describe('notification builders', () => {
  it('buildOwnershipNotification produces OWNERSHIP_CHANGED type', () => {
    const n = buildOwnershipNotification(PRODUCT_ID, PRODUCT_NAME, ACTOR, NOW);
    expect(n.notificationType).toBe('OWNERSHIP_CHANGED');
    expect(n.productId).toBe(PRODUCT_ID);
    expect(n.productName).toBe(PRODUCT_NAME);
    expect(n.read).toBe(false);
    expect(n.message).toContain('Ownership transferred');
    expect(n.id).toContain('ownership');
  });

  it('buildApprovalPendingNotification produces APPROVAL_PENDING type', () => {
    const n = buildApprovalPendingNotification(
      PRODUCT_ID,
      PRODUCT_NAME,
      'HARVEST',
      'Nairobi, Kenya',
      ACTOR,
      NOW,
      42,
    );
    expect(n.notificationType).toBe('APPROVAL_PENDING');
    expect(n.eventType).toBe('HARVEST');
    expect(n.location).toBe('Nairobi, Kenya');
    expect(n.message).toContain('awaiting approval');
    expect(n.id).toContain('42');
  });

  it('buildApprovalFinalizedNotification produces APPROVAL_FINALIZED type', () => {
    const n = buildApprovalFinalizedNotification(
      PRODUCT_ID,
      PRODUCT_NAME,
      'SHIPPING',
      'Port of Rotterdam',
      ACTOR,
      NOW,
    );
    expect(n.notificationType).toBe('APPROVAL_FINALIZED');
    expect(n.message).toContain('approved and finalized');
  });

  it('buildApprovalRejectedNotification includes reason when provided', () => {
    const n = buildApprovalRejectedNotification(
      PRODUCT_ID,
      PRODUCT_NAME,
      'PROCESSING',
      'Factory A',
      ACTOR,
      NOW,
      'Incorrect batch',
    );
    expect(n.notificationType).toBe('APPROVAL_REJECTED');
    expect(n.message).toContain('Incorrect batch');
  });

  it('buildApprovalRejectedNotification works without reason', () => {
    const n = buildApprovalRejectedNotification(
      PRODUCT_ID,
      PRODUCT_NAME,
      'RETAIL',
      'Store 1',
      ACTOR,
      NOW,
    );
    expect(n.notificationType).toBe('APPROVAL_REJECTED');
    expect(n.message).toContain('rejected');
  });

  it('buildRecallNotification produces PRODUCT_RECALLED type', () => {
    const n = buildRecallNotification(PRODUCT_ID, PRODUCT_NAME, ACTOR, NOW);
    expect(n.notificationType).toBe('PRODUCT_RECALLED');
    expect(n.message).toContain('recalled');
    expect(n.read).toBe(false);
  });

  it('buildContractErrorNotification produces CONTRACT_ERROR type', () => {
    const n = buildContractErrorNotification(PRODUCT_ID, PRODUCT_NAME, 'InvalidNonce', NOW);
    expect(n.notificationType).toBe('CONTRACT_ERROR');
    expect(n.message).toContain('InvalidNonce');
  });

  it('all notifications have unique IDs for the same product when timestamps differ', () => {
    const n1 = buildOwnershipNotification(PRODUCT_ID, PRODUCT_NAME, ACTOR, NOW);
    const n2 = buildOwnershipNotification(PRODUCT_ID, PRODUCT_NAME, ACTOR, NOW + 1000);
    expect(n1.id).not.toBe(n2.id);
  });

  it('approval pending notifications use pendingEventId for uniqueness', () => {
    const n1 = buildApprovalPendingNotification(
      PRODUCT_ID,
      PRODUCT_NAME,
      'HARVEST',
      'Loc',
      ACTOR,
      NOW,
      1,
    );
    const n2 = buildApprovalPendingNotification(
      PRODUCT_ID,
      PRODUCT_NAME,
      'HARVEST',
      'Loc',
      ACTOR,
      NOW,
      2,
    );
    expect(n1.id).not.toBe(n2.id);
  });
});
