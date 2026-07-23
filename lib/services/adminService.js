import { prisma } from "@/lib/prisma";

/**
 * adminService — Business logic for Admin dashboard operations and exports.
 */

/**
 * Returns summary statistics for the admin dashboard overview.
 */
export async function getDashboardStats() {
  const [
    totalStudents,
    totalCertificates,
    pendingCertificates,
    signedCertificates,
    pendingPasswordRequests,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.bonafideCertificate.count(),
    prisma.bonafideCertificate.count({
      where: { isSigned: false, isActive: true },
    }),
    prisma.bonafideCertificate.count({
      where: { isSigned: true },
    }),
    prisma.passwordRequest.count(),
  ]);

  return {
    totalStudents,
    totalCertificates,
    pendingCertificates,
    signedCertificates,
    pendingPasswordRequests,
  };
}
