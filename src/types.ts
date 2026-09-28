export type Priority = "LOW" | "MEDIUM" | "HIGH";
export type Status = "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "COMPLETED";
export type Role = "REQUESTER" | "APPROVER" | "ADMIN";

export interface OpsRequest {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: Priority;
  status: Status;
  requesterId: string;
  createdAt: string;
  updatedAt: string;
  history: StatusChange[];
}

export interface User {
  id: string;
  role: Role;
}

export interface StatusChange {
  from: Status;
  to: Status;
  by: string;
  at: string;
  comment?: string;
}