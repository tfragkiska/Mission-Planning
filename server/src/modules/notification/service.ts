import { prisma } from "../../infra/database";
import { getIO } from "../../infra/socket";
import { NotFoundError } from "../../shared/errors";

interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  missionId?: string;
}

interface GetNotificationsOptions {
  unreadOnly?: boolean;
  limit?: number;
}

export const notificationService = {
  async createNotification(input: CreateNotificationInput) {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        missionId: input.missionId ?? null,
      },
    });

    // Emit real-time notification via Socket.io
    try {
      const io = getIO();
      io.to(`user:${input.userId}`).emit("notification:new", notification);
    } catch {
      // Socket not initialized or emit failed — non-blocking
    }

    return notification;
  },

  async getNotifications(userId: string, options: GetNotificationsOptions = {}) {
    const { unreadOnly = false, limit = 50 } = options;

    return prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  async markAsRead(notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new NotFoundError("Notification");

    return prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  },

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  },
};
