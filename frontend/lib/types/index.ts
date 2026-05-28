export type EventType = 'HARVEST' | 'PROCESSING' | 'SHIPPING' | 'RETAIL';
export type ProductStatus = 'active' | 'inactive';

export interface TemplateStage {
  label: string;
  eventType: EventType;
}

export type ActorRole = "Producer" | "Processor" | "Shipper" | "Retailer" | "Any";

export interface OwnershipRecord {
  owner: string;
  transferredAt: number;
}

export interface ActorRoleAssignment {
  actor: string;
  role: ActorRole;
}

export interface AuthPolicy {
  threshold: number;
  roles: ActorRoleAssignment[];
}

export interface Product {
  id: string;
  name: string;
  origin: string;
  owner: string;
  timestamp: number;
  active?: boolean;
  authorizedActors: string[];
  ownershipHistory?: OwnershipRecord[];
  /** Unix seconds expiration timestamp. 0 = not set. (#406) */
  expirationTimestamp?: number;
  /** Whether the product has been marked as spoiled. (#406) */
  spoiled?: boolean;
  /** true while an on-chain transaction is in-flight */
  pending?: boolean;
}

export interface Batch {
  id: string;
  name: string;
  owner: string;
  productIds: string[];
  timestamp: number;
  active: boolean;
  status?: ProductStatus;
  authorizedActors: string[];
  ownershipHistory?: OwnershipRecord[];
  /** Number of signatures required for events (0 or 1 = immediate, >1 = multi-sig) */
  requiredSignatures?: number;
  /** true while an on-chain transaction is in-flight (#49) */
  pending?: boolean;
  /** Off-chain image URL stored in product metadata (#112) */
  imageUrl?: string;
  /** Taxonomy category ID (#425) */
  category?: string;
  /** Taxonomy subcategory ID (#425) */
  subcategory?: string;
  /** On-chain certifications attached to this product (#428) */
  certifications?: Certification[];
}

export interface TrackingEvent {
  productId: string;
  location: string;
  actor: string;
  timestamp: number;
  eventType: EventType;
  metadata: string;
  /** Stable deterministic event ID — SHA-256 hex (#386) */
  stableId?: string;
  /** true while an on-chain transaction is in-flight (#49) */
  pending?: boolean;
}

export interface EventPage {
  events: TrackingEvent[];
export interface PendingEvent {
  pendingEventId: number;
  productId: string;
  event: TrackingEvent;
  approvals: string[];
  requiredSignatures: number;
  createdAt: number;
  expiration?: number;
}

export type NotificationType =
  | 'TRACKING_EVENT'
  | 'APPROVAL_PENDING'
  | 'APPROVAL_FINALIZED'
  | 'APPROVAL_REJECTED'
  | 'OWNERSHIP_CHANGED'
  | 'PRODUCT_RECALLED'
  | 'CONTRACT_ERROR';

export interface Notification {
  id: string;
  productId: string;
  productName: string;
  eventType: EventType;
  location: string;
  actor: string;
  timestamp: number;
  read: boolean;
  notificationType: NotificationType;
  message?: string;
}

export interface TransactionResult {
  hash: string;
  status: 'success' | 'failed' | 'pending';
  fee: string;
  timestamp: number;
}

export interface ContractError {
  code: number;
  message: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface EventFilter {
  eventType?: EventType | null;
  actor?: string | null;
  fromTimestamp?: number | null;
  toTimestamp?: number | null;
export interface Rating {
  id: string;
  productId: string;
  walletAddress: string;
  stars: number;
  comment: string | null;
  timestamp: number;
}
