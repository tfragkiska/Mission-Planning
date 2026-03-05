import { Router, Response, NextFunction } from "express";
import { authService } from "./service";
import { loginSchema } from "./validation";
import { authenticate } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";

export const authRouter = Router();

authRouter.post("/login", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getProfile(req.user!.userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
});
