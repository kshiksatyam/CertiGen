import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getStudentByEmail, updateStudent } from "@/lib/services/studentService";

/**
 * GET /api/students/[email]
 * Fetch a single student by email address. Admin only.
 *
 * The email param arrives URL-encoded (e.g. "foo%40bar.com") — we decode it
 * before passing it to the service.
 *
 * Response 200: { student: Student }
 * Response 404: { error: "Student not found" }
 * Response 401/403: from requireRole
 * Response 500: { error: "..." }
 */
export async function GET(request, { params }) {
  // ── Defense-in-depth gate ─────────────────────────────────────────────────
  const err = await requireRole(request.headers, "admin");
  if (err) return err;

  const email = decodeURIComponent(params.email).toLowerCase();

  try {
    const student = await getStudentByEmail(email);

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ student }, { status: 200 });
  } catch (error) {
    console.error(`[GET /api/students/${email}] getStudentByEmail failed:`, error);
    return NextResponse.json(
      { error: "Failed to fetch student" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/students/[email]
 * Partially update an existing student's fields. Admin only.
 *
 * Accepted mutable fields in request body:
 *   rollNumber, fullName, program, course, semester, purpose,
 *   mobileNumber, firebaseToken
 *
 * The student's `email` (primary key) is always taken from the URL param —
 * never from the body — so the PK cannot be changed via this endpoint.
 *
 * Response 200: { student: Student }
 * Response 400: { error: "Request body must be valid JSON" | "No valid fields..." }
 * Response 404: { error: "Student not found" }
 * Response 409: { error: "Roll number already taken by another student" }
 * Response 401/403: from requireRole
 * Response 500: { error: "..." }
 */
export async function PATCH(request, { params }) {
  // ── Defense-in-depth gate ─────────────────────────────────────────────────
  const err = await requireRole(request.headers, "admin");
  if (err) return err;

  const email = decodeURIComponent(params.email).toLowerCase();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  // ── Allow-list: only these fields may be patched ──────────────────────────
  // `email` is intentionally excluded — the PK comes from the URL, never body.
  const MUTABLE_FIELDS = [
    "rollNumber",
    "fullName",
    "program",
    "course",
    "semester",
    "purpose",
    "mobileNumber",
    "firebaseToken",
  ];

  const patch = {};
  for (const field of MUTABLE_FIELDS) {
    if (field in body) {
      // Accept null explicitly (e.g. to clear mobileNumber / firebaseToken).
      patch[field] = body[field] === null ? null : String(body[field]).trim() || null;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: `No valid fields to update. Accepted fields: ${MUTABLE_FIELDS.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const student = await updateStudent(email, patch);
    return NextResponse.json({ student }, { status: 200 });
  } catch (error) {
    // Prisma P2025 = record not found
    if (error?.code === "P2025") {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }
    // Prisma P2002 = unique constraint (e.g. rollNumber already taken)
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Roll number already taken by another student" },
        { status: 409 }
      );
    }
    console.error(`[PATCH /api/students/${email}] updateStudent failed:`, error);
    return NextResponse.json(
      { error: "Failed to update student" },
      { status: 500 }
    );
  }
}
