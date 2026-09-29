import { NextFunction, Request, Response } from "express";
import { Role } from "./types";

const VALID_ROLES: Role[] = ["REQUESTER", "APPROVER", "ADMIN"];

export function auth(req: Request, res: Response, next: NextFunction) {
  const id = req.header("x-user-id");
  const role = req.header("x-role") as Role | undefined;

  if (!id || !role || !VALID_ROLES.includes(role)) {
    return res.status(401).json({ error: "Missing or invalid x-user-id / x-role headers" });
  }
  res.locals.user = { id, role };
  next();
}