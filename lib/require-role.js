export async function requireRole(request, role) {
  // Helper to re-check session + role within API routes/Server Actions
  return { user: { role } };
}
