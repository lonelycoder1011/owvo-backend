import { ActivityLog } from "../model/activityLog.model.js";
import { broadcast } from "../socket/socket.js";

export const recordActivity = async ({
  req,
  action,
  entityType,
  entityId = null,
  metadata = {},
}) => {
  try {
    const log = await ActivityLog.create({
      actor: req?.user?._id || null,
      actorRole: req?.user?.role || "",
      action,
      entityType,
      entityId,
      metadata,
      ipAddress: req?.ip || "",
      userAgent: req?.get?.("user-agent") || "",
    });
    broadcast("admin_activity_log_created", {
      _id: log._id.toString(),
      actor: log.actor?.toString?.() || null,
      actorRole: log.actorRole,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId?.toString?.() || null,
      metadata: log.metadata,
      createdAt: log.createdAt,
    });
  } catch (error) {
    console.error("Failed to record activity log", error);
  }
};
