import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";

// Usage: router.get('/x', authenticate, requireRole('admin', 'lab_staff'), handler)
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Requires one of roles: ${roles.join(", ")}`));
    }
    next();
  };
}
