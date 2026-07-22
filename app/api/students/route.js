import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { listStudents, createStudent } from "@/lib/services/studentService";

/**
 * GET /api/students
 * List all students. Admin only.
 *
 * Response 200: { students: Student[] }
 * Response 401: { error: "Unauthorized..." }
 * Response 403: { error: "Forbidden..." }
 * Response 500: { error: "..." }
 */
export async function GET(request) {
  // ── Defense-in-depth: always re-check role inside the handler ─────────────
  const err = await requireRole(request.headers, "admin");
  if (err) return err;

  try {
    const students = await listStudents();
    return NextResponse.json({ students }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/students] listStudents failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/students
 * Create a new student. Admin only.
 *
 * Request body (JSON):
 *   Required: email, rollNumber, fullName, program, course, semester, purpose
 *   Optional: mobileNumber, firebaseToken
 *
 * Response 201: { student: Student }
 * Response 400: { error: "Missing required fields: ..." }
 * Response 409: { error: "A student with this email or roll number already exists" }
 * Response 401/403: from requireRole
 * Response 500: { error: "..." }
 */
export async function POST(request) {
  // ── Defense-in-depth gate ─────────────────────────────────────────────────
  const err = await requireRole(request.headers, "admin");
  if (err) return err;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  // ── Validate required fields ──────────────────────────────────────────────
  const REQUIRED = ["email", "rollNumber", "fullName", "program", "course", "semester", "purpose"];
  const missing = REQUIRED.filter((f) => !body[f] || typeof body[f] !== "string" || !body[f].trim());
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  // ── Build the safe payload (only known fields accepted) ───────────────────
  const payload = {
    email:        body.email.trim().toLowerCase(),
    rollNumber:   body.rollNumber.trim(),
    fullName:     body.fullName.trim(),
    program:      body.program.trim(),
    course:       body.course.trim(),
    semester:     body.semester.trim(),
    purpose:      body.purpose.trim(),
    ...(body.mobileNumber  !== undefined && { mobileNumber:  String(body.mobileNumber).trim() || null }),
    ...(body.firebaseToken !== undefined && { firebaseToken: String(body.firebaseToken).trim() || null }),
  };

  try {
    const student = await createStudent(payload);
    return NextResponse.json({ student }, { status: 201 });
  } catch (error) {
    // Prisma P2002 = unique constraint violation (email or rollNumber duplicate)
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A student with this email or roll number already exists" },
        { status: 409 }
      );
    }
    console.error("[POST /api/students] createStudent failed:", error);
    return NextResponse.json(
      { error: "Failed to create student" },
      { status: 500 }
    );
  }
}
