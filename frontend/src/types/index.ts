/**
 * Shared TypeScript type definitions for LandGuard AI frontend.
 *
 * This file re-exports types from lib/api.ts and adds UI-specific types
 * that are not tied to API responses.
 */

export type {
  AuditRecord,
  CaseDetail,
  CaseRecord,
  CurrentUser,
  DashboardStats,
  OwnerRecord,
  OwnershipRecord,
  ParcelRecord,
  RiskResponse,
  RoleRecord,
  TransactionRecord,
  UserRecord,
  VerificationResponse,
  VerificationResult,
} from '../lib/api'

/** Risk level values used throughout the UI */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

/** Transaction status values */
export type TransactionStatus = 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED'

/** Case review status values */
export type CaseStatus = 'OPEN' | 'UNDER_REVIEW' | 'NEEDS_INFORMATION' | 'RESOLVED' | 'CLOSED'

/** Parcel status values */
export type ParcelStatus = 'ACTIVE' | 'UNDER_REVIEW' | 'DISPUTED'
