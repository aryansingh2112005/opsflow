import { applyTransition, WorkflowError } from "./workflow";
import { OpsRequest, Role, User } from "./types";

const NOW = new Date("2026-01-01T10:00:00.000Z");

const user = (role: Role): User => ({ id: `${role.toLowerCase()}1`, role });

const makeRequest = (status: OpsRequest["status"] = "SUBMITTED"): OpsRequest => ({
  id: "r1",
  title: "VPN access",
  description: "Need VPN",
  type: "ACCESS",
  priority: "HIGH",
  status,
  requesterId: "aryan",
  createdAt: "2026-01-01T09:00:00.000Z",
  updatedAt: "2026-01-01T09:00:00.000Z",
  history: [],
});

function errorOf(fn: () => unknown): WorkflowError {
  try {
    fn();
  } catch (e) {
    return e as WorkflowError;
  }
  throw new Error("Expected function to throw");
}

describe("applyTransition", () => {
  it("moves SUBMITTED to IN_REVIEW for an approver and records history", () => {
    const result = applyTransition(makeRequest(), "IN_REVIEW", user("APPROVER"), undefined, NOW);
    expect(result.status).toBe("IN_REVIEW");
    expect(result.updatedAt).toBe(NOW.toISOString());
    expect(result.history).toEqual([
      { from: "SUBMITTED", to: "IN_REVIEW", by: "approver1", at: NOW.toISOString() },
    ]);
  });

  it("does not mutate the original request", () => {
    const original = makeRequest();
    applyTransition(original, "IN_REVIEW", user("APPROVER"), undefined, NOW);
    expect(original.status).toBe("SUBMITTED");
    expect(original.history).toHaveLength(0);
  });

  it("lets an admin complete an approved request", () => {
    const result = applyTransition(makeRequest("APPROVED"), "COMPLETED", user("ADMIN"), undefined, NOW);
    expect(result.status).toBe("COMPLETED");
  });

  it("rejects an invalid transition with 409", () => {
    const err = errorOf(() => applyTransition(makeRequest("COMPLETED"), "SUBMITTED", user("ADMIN")));
    expect(err).toBeInstanceOf(WorkflowError);
    expect(err.statusCode).toBe(409);
  });

  it("rejects skipping a step with 409", () => {
    const err = errorOf(() => applyTransition(makeRequest("SUBMITTED"), "APPROVED", user("APPROVER")));
    expect(err.statusCode).toBe(409);
  });

  it("rejects the wrong role with 403", () => {
    const err = errorOf(() => applyTransition(makeRequest("IN_REVIEW"), "APPROVED", user("REQUESTER")));
    expect(err.statusCode).toBe(403);
  });

  it("requires a comment to reject (400)", () => {
    const req = makeRequest("IN_REVIEW");
    expect(errorOf(() => applyTransition(req, "REJECTED", user("APPROVER"))).statusCode).toBe(400);
    expect(errorOf(() => applyTransition(req, "REJECTED", user("APPROVER"), "   ")).statusCode).toBe(400);
  });

  it("accepts a rejection with a trimmed comment", () => {
    const result = applyTransition(makeRequest("IN_REVIEW"), "REJECTED", user("APPROVER"), "  Not needed ", NOW);
    expect(result.status).toBe("REJECTED");
    expect(result.history[0].comment).toBe("Not needed");
  });

  it("allows no moves out of terminal states", () => {
    for (const s of ["REJECTED", "COMPLETED"] as const) {
      const err = errorOf(() => applyTransition(makeRequest(s), "SUBMITTED", user("ADMIN")));
      expect(err.statusCode).toBe(409);
    }
  });
});