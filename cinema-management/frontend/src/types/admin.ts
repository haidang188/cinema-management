export interface PageResponse<T> {
  content: T[]
  totalPages: number
  totalElements: number
}

export interface ApiRequestError extends Error {
  status?: number
  fieldErrors?: Record<string, string>
}

export interface Genre {
  id: number
  name: string
}

export interface AdminMovie {
  id: number
  title: string
  description?: string
  durationMinutes: number
  releaseDate?: string
  ageRating?: string
  director?: string
  cast?: string
  language?: string
  posterUrl?: string
  trailerUrl?: string
  status?: string
  genres?: Genre[]
}

export interface MovieFormValues {
  title: string
  description: string
  durationMinutes: number | string
  releaseDate: string
  ageRating: string
  director: string
  cast: string
  language: string
  posterUrl: string
  trailerUrl: string
  status: string
  genreIds: number[]
}

export interface MoviePayload extends Omit<MovieFormValues, "durationMinutes"> {
  durationMinutes: number
}

export interface Seat {
  id: number
  rowLabel?: string
  seatNumber: number
  seatName: string
  seatType: string
  status: string
  gridRow?: number | null
  gridColumn?: number | null
}

export interface CinemaRoom {
  id: number
  name: string
  roomType?: string
  totalSeats?: number
  status?: string
  seats?: Seat[]
}

export interface CinemaRoomPayload {
  name: string
  roomType: string
  status: string
  seats: CinemaRoomSeatPayload[]
}

export interface CinemaRoomSeatPayload {
  rowLabel: string
  seatNumber: number
  seatType: string
  status: string
  gridRow: number
  gridColumn: number
}

export type CinemaRoomUpdatePayload = CinemaRoomPayload

export interface SeatTypeUpdate {
  seatId: number
  seatType: string
  status: string
}

export type NavigateHandler = (path: string) => void

export interface EmployeeListItem {
  id: number
  employeeCode: string
  username: string
  fullName: string
  email?: string
  phone?: string
  dateOfBirth?: string
  gender?: string
  address?: string
  position?: string
  avatar?: string
  status?: string
}

export interface Employee extends EmployeeListItem {
  userId?: number
}

export interface CreateEmployeeRequest {
  username: string
  password: string
  employeeCode: string
  fullName: string
  email?: string
  phone?: string
  dateOfBirth?: string
  gender?: string
  address?: string
  position?: string
  avatar?: string
  status?: string
}

export interface UpdateEmployeeRequest {
  employeeCode: string
  fullName: string
  email?: string
  phone?: string
  dateOfBirth?: string
  gender?: string
  address?: string
  position?: string
  avatar?: string
  status?: string
}

export interface Member {
  id: number
  userId?: number
  memberCode?: string
  username: string
  fullName: string
  email?: string
  phone?: string
  dateOfBirth?: string
  gender?: string
  avatar?: string
  pointBalance?: number
  membershipLevel?: string
  status?: string
  createdAt?: string
  updatedAt?: string
}

export type MemberListItem = Member

export interface UpdateMemberRequest {
  fullName: string
  email?: string
  phone?: string
  dateOfBirth?: string
  gender?: string
  avatar?: string
  status?: string
}

export interface MemberStatistics {
  totalMembers: number
  activeMembers: number
  inactiveMembers: number
  totalPointBalance: number
}
