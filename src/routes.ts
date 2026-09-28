import { applyTransition, WorkflowError } from "./workflow";
import { Router } from "express";
import { randomUUID } from "crypto";
import { store } from "./store";
import { OpsRequest, Priority, Status, User } from "./types";

const router = Router();
const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH"];
const STATUSES: Status[] = ["SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED", "COMPLETED"];

// Create a request
router.post("/", (req, res) => {
  const user: User = res.locals.user;
  const { title, description, type, priority } = req.body ?? {};

  const errors: string[] = [];
  if (typeof title !== "string" || title.trim().length < 3) errors.push("title must be at least 3 characters");
  if (typeof description !== "string" || description.trim() === "") errors.push("description is required");
  if (typeof type !== "string" || type.trim() === "") errors.push("type is required");
  if (!PRIORITIES.includes(priority)) errors.push("priority must be LOW, MEDIUM or HIGH");

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const now = new Date().toISOString();
  const request: OpsRequest = {
    id: randomUUID(),
    title: title.trim(),
    description: description.trim(),
    type: type.trim(),
    priority,
    status: "SUBMITTED",
    requesterId: user.id,
    createdAt: now,
    updatedAt: now,
    history: []
  };

  res.status(201).json(store.add(request));
});

// List requests (requesters see only their own; optional ?status=)
router.get("/", (req, res) => {
  const user: User = res.locals.user;
  const status = req.query.status;

  if (status !== undefined && !STATUSES.includes(status as Status)) {
    return res.status(400).json({ error: `status must be one of ${STATUSES.join(", ")}` });
  }

  let list = store.getAll();
  if (user.role === "REQUESTER") list = list.filter((r) => r.requesterId === user.id);
  if (status) list = list.filter((r) => r.status === status);

  res.json(list);
});

// View one request
router.get("/:id", (req, res) => {
  const user: User = res.locals.user;
  const request = store.getById(req.params.id);

  if (!request) return res.status(404).json({ error: "Request not found" });
  if (user.role === "REQUESTER" && request.requesterId !== user.id) {
    return res.status(403).json({ error: "You can only view your own requests" });
  }

  res.json(request);
});

// Change status
router.patch("/:id/status", (req, res) => {
  const user: User = res.locals.user;
  const { status, comment } = req.body ?? {};

  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${STATUSES.join(", ")}` });
  }

  const request = store.getById(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found" });

  try {
    const updated = applyTransition(
      request,
      status,
      user,
      typeof comment === "string" ? comment : undefined
    );
    res.json(store.update(updated));
  } catch (err) {
    if (err instanceof WorkflowError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    throw err;
  }
});

export default router;