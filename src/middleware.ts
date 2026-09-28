import { NextFunction, Request, Response } from "express";
import { Role, User } from "./types";

const ROLES: Role[] = ["REQUESTER", "APPROVER", "ADMIN"];

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const id = req.header("x-user-id");
  const role = req.header("x-role") as Role | undefined;

  if (!id || !role || !ROLES.includes(role)) {
    return res
      .status(401)
      .json({ error: "Headers x-user-id and x-role (REQUESTER | APPROVER | ADMIN) are required" });
  }

  const user: User = { id, role };
  res.locals.user = user;
  next();
}