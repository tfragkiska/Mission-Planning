import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../infra/database";
import { config } from "../../infra/config";
import { UnauthorizedError } from "../../shared/errors";

export const authService = {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: "8h" },
    );

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  },

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedError("User not found");
    }
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  },
};
