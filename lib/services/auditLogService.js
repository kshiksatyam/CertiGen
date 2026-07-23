import { prisma } from "@/lib/prisma";

/**
 * auditLogService — the ONLY service layer that touches the Log table.
 *
 * Log schema (schema.prisma):
 *   id        Int      @id @default(autoincrement())
 *   user      String   — email or identifier of user performing the action
 *   message   String   — description of the logged action
 *   timestamp DateTime @default(now())
 */

/**
 * Creates a new audit log entry.
 *
 * @param {string} user    — user identifier/email
 * @param {string} message — description of the action
 * @returns {Promise<import("@prisma/client").Log>}
 */
export async function logAction(user, message) {
  return prisma.log.create({
    data: {
      user,
      message,
    },
  });
}

/**
 * Returns all audit logs, ordered by timestamp descending (newest first).
 *
 * @returns {Promise<import("@prisma/client").Log[]>}
 */
export async function getLogs() {
  return prisma.log.findMany({
    orderBy: {
      timestamp: "desc",
    },
  });
}
