import { OpsRequest, Role, Status, StatusChange, User } from "./types";

export class WorkflowError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = "WorkflowError";
  }
}

// from -> to -> roles allowed to make that move
const TRANSITIONS: Record<Status, Partial<Record<Status, Role[]>>> = {
  SUBMITTED: { IN_REVIEW: ["APPROVER"] },
  IN_REVIEW: { APPROVED: ["APPROVER"], REJECTED: ["APPROVER"] },
  APPROVED: { COMPLETED: ["ADMIN"] },
  REJECTED: {},
  COMPLETED: {},
};

export function applyTransition(
  request: OpsRequest,
  to: Status,
  user: User,
  comment?: string,
  now: Date = new Date()
): OpsRequest {
  const allowedRoles = TRANSITIONS[request.status][to];

  if (!allowedRoles) {
    throw new WorkflowError(`Cannot move from ${request.status} to ${to}`, 409);
  }
  if (!allowedRoles.includes(user.role)) {
    throw new WorkflowError(`Role ${user.role} cannot move a request from ${request.status} to ${to}`, 403);
  }
  if (to === "REJECTED" && (!comment || comment.trim() === "")) {
    throw new WorkflowError("A comment is required when rejecting a request", 400);
  }

  const at = now.toISOString();
  const change: StatusChange = { from: request.status, to, by: user.id, at };
  if (comment && comment.trim() !== "") change.comment = comment.trim();

  return {
    ...request,
    status: to,
    updatedAt: at,
    history: [...request.history, change],
  };
}