import request from "supertest";
import app from "./app";

const req = { "x-user-id": "aryan", "x-role": "REQUESTER" };
const apr = { "x-user-id": "priya", "x-role": "APPROVER" };
const adm = { "x-user-id": "admin1", "x-role": "ADMIN" };

const sampleBody = {
  title: "VPN access",
  description: "Need VPN",
  type: "ACCESS",
  priority: "HIGH",
};

async function createRequest() {
  const res = await request(app).post("/requests").set(req).send(sampleBody);
  return res.body.id as string;
}

describe("auth", () => {
  it("rejects requests with no headers (401)", async () => {
    const res = await request(app).get("/requests");
    expect(res.status).toBe(401);
  });

  it("rejects an invalid role (401)", async () => {
    const res = await request(app)
      .get("/requests")
      .set({ "x-user-id": "aryan", "x-role": "NOT_A_ROLE" });
    expect(res.status).toBe(401);
  });
});

describe("POST /requests", () => {
  it("creates a request and defaults to SUBMITTED", async () => {
    const res = await request(app).post("/requests").set(req).send(sampleBody);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("SUBMITTED");
    expect(res.body.requesterId).toBe("aryan");
    expect(res.body.history).toEqual([]);
  });

  it("rejects a missing title (400)", async () => {
    const res = await request(app)
      .post("/requests")
      .set(req)
      .send({ ...sampleBody, title: "" });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid priority (400)", async () => {
    const res = await request(app)
      .post("/requests")
      .set(req)
      .send({ ...sampleBody, priority: "URGENT" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for malformed JSON instead of 500", async () => {
    const res = await request(app)
      .post("/requests")
      .set(req)
      .set("Content-Type", "application/json")
      .send("{bad json");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/malformed json/i);
  });
});

describe("GET /requests and /requests/:id", () => {
  it("lets a requester see only their own requests", async () => {
    await request(app).post("/requests").set(req).send(sampleBody);
    await request(app)
      .post("/requests")
      .set({ "x-user-id": "someoneElse", "x-role": "REQUESTER" })
      .send(sampleBody);

    const res = await request(app).get("/requests").set(req);
    expect(res.status).toBe(200);
    expect(res.body.every((r: any) => r.requesterId === "aryan")).toBe(true);
  });

  it("lets an approver see all requests", async () => {
    const res = await request(app).get("/requests").set(apr);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("blocks a requester from viewing another user's request (403)", async () => {
    const id = await createRequest();
    const res = await request(app)
      .get(`/requests/${id}`)
      .set({ "x-user-id": "someoneElse", "x-role": "REQUESTER" });
    expect(res.status).toBe(403);
  });

  it("404s for a nonexistent id", async () => {
    const res = await request(app).get("/requests/does-not-exist").set(apr);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /requests/:id/status", () => {
  it("runs the full happy path to COMPLETED", async () => {
    const id = await createRequest();

    const toReview = await request(app)
      .patch(`/requests/${id}/status`)
      .set(apr)
      .send({ status: "IN_REVIEW" });
    expect(toReview.status).toBe(200);
    expect(toReview.body.status).toBe("IN_REVIEW");

    const toApproved = await request(app)
      .patch(`/requests/${id}/status`)
      .set(apr)
      .send({ status: "APPROVED" });
    expect(toApproved.status).toBe(200);

    const toCompleted = await request(app)
      .patch(`/requests/${id}/status`)
      .set(adm)
      .send({ status: "COMPLETED" });
    expect(toCompleted.status).toBe(200);
    expect(toCompleted.body.status).toBe("COMPLETED");
    expect(toCompleted.body.history).toHaveLength(3);
  });

  it("rejects an invalid transition (409)", async () => {
    const id = await createRequest();
    const res = await request(app)
      .patch(`/requests/${id}/status`)
      .set(apr)
      .send({ status: "APPROVED" }); // can't skip IN_REVIEW
    expect(res.status).toBe(409);
  });

  it("rejects the wrong role (403)", async () => {
    const id = await createRequest();
    await request(app).patch(`/requests/${id}/status`).set(apr).send({ status: "IN_REVIEW" });

    const res = await request(app)
      .patch(`/requests/${id}/status`)
      .set(req) // requester can't approve
      .send({ status: "APPROVED" });
    expect(res.status).toBe(403);
  });

  it("requires a comment to reject (400), then succeeds with one", async () => {
    const id = await createRequest();
    await request(app).patch(`/requests/${id}/status`).set(apr).send({ status: "IN_REVIEW" });

    const noComment = await request(app)
      .patch(`/requests/${id}/status`)
      .set(apr)
      .send({ status: "REJECTED" });
    expect(noComment.status).toBe(400);

    const withComment = await request(app)
      .patch(`/requests/${id}/status`)
      .set(apr)
      .send({ status: "REJECTED", comment: "Not needed" });
    expect(withComment.status).toBe(200);
    expect(withComment.body.status).toBe("REJECTED");
  });

  it("rejects an invalid status value (400)", async () => {
    const id = await createRequest();
    const res = await request(app)
      .patch(`/requests/${id}/status`)
      .set(apr)
      .send({ status: "BANANA" });
    expect(res.status).toBe(400);
  });

  it("404s when the request doesn't exist", async () => {
    const res = await request(app)
      .patch("/requests/does-not-exist/status")
      .set(apr)
      .send({ status: "IN_REVIEW" });
    expect(res.status).toBe(404);
  });
});