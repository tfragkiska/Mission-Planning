import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./types";
import { auditService } from "../modules/audit/service";

interface AuditOptions {
  action: string;
  entityType: string;
  /** Extract entityId from request. Receives req and the response body. */
  getEntityId?: (req: AuthenticatedRequest, resBody?: unknown) => string | undefined;
  /** Extract extra details from request and response body. */
  getDetails?: (req: AuthenticatedRequest, resBody?: unknown) => Record<string, unknown> | undefined;
}

/**
 * Express middleware factory that logs an audit event after the wrapped handler
 * completes successfully. Attach it BEFORE the actual handler so it can
 * intercept the response.
 */
export function withAudit(options: AuditOptions) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Capture the original json method to intercept response body
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      // Fire-and-forget: write audit log after response
      if (req.user && res.statusCode < 400) {
        const entityId = options.getEntityId
          ? options.getEntityId(req, body)
          : req.params.id;
        const details = options.getDetails
          ? options.getDetails(req, body)
          : undefined;

        auditService.logAction({
          userId: req.user.userId,
          action: options.action,
          entityType: options.entityType,
          entityId,
          details,
          ipAddress: req.ip || req.socket.remoteAddress,
        });
      }

      return originalJson(body);
    };

    next();
  };
}
