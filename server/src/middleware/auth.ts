import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "../domain";
import { config } from "../config";
import { forbidden, unauthorized } from "../lib/http-error";

export interface AuthUser {
  id: string;
  role: Role;
  email: string;
}

// Augment Express's Request so `req.user` is typed throughout the app.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface JwtPayload {
  sub: string;
  role: Role;
  email: string;
}

export function signToken(user: AuthUser): string {
  const payload: JwtPayload = { sub: user.id, role: user.role, email: user.email };
  const options: jwt.SignOptions = {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  };
  return jwt.sign(payload, config.jwtSecret, options);
}

// Requires a valid Bearer token; populates req.user or throws 401.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw unauthorized("Missing or malformed Authorization header");
  }
  const token = header.slice("Bearer ".length).trim();
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = { id: decoded.sub, role: decoded.role, email: decoded.email };
    next();
  } catch {
    throw unauthorized("Invalid or expired token");
  }
}

// Requires the authenticated user to hold one of the given roles, else 403.
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw unauthorized();
    if (!roles.includes(req.user.role)) throw forbidden("Insufficient role");
    next();
  };
}
