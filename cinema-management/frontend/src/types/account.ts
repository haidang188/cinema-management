export type MemberStatus = "ACTIVE" | "INACTIVE" | "PENDING_DELETION" | "DELETED"
export type MembershipLevel = "BASIC" | "SILVER" | "GOLD" | "PLATINUM"

export interface AccountProfile {
  userId: number
  memberId: number
  memberCode: string
  fullName: string
  email: string
  phone: string
  dateOfBirth: string | null
  gender: string | null
  avatar: string | null
  pointBalance: number
  membershipLevel: MembershipLevel
  status: MemberStatus
  createdAt: string
  deletionRequestedAt: string | null
  scheduledDeletionAt: string | null
}

export interface UpdateAccountPayload {
  fullName: string
  email: string
  phone: string
  dateOfBirth: string | null
  gender: string | null
  avatar: string | null
}

export interface PointSummary {
  pointBalance: number
  membershipLevel: MembershipLevel
  nextLevelPoints: number
  nextLevel: MembershipLevel | null
}

export interface PointHistoryItem {
  id: number
  bookingId: number | null
  bookingCode: string | null
  points: number
  balanceBefore: number
  balanceAfter: number
  type: string
  description: string | null
  createdAt: string
}

export interface PointHistoryPage {
  content: PointHistoryItem[]
  number: number
  totalPages: number
  totalElements: number
  first: boolean
  last: boolean
}
