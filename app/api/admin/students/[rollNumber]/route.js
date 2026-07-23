import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getStudentByRollNumber } from "@/lib/services/studentService";

/**
 * GET /api/admin/students/[rollNumber]
 * Admin-gated endpoint to fetch student by roll number.
 */
export async function GET(request, { params }) {
  const err = await requireRole(request.headers, "admin");
  if (err) return err;

  const rollNumber = decodeURIComponent(params.rollNumber);

  try {
    const student = await getStudentByRollNumber(rollNumber);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    return NextResponse.json({ student }, { status: 200 });
  } catch (error) {
    console.error(`[GET /api/admin/students/${rollNumber}]`, error);
    return NextResponse.json(
      { error: "Failed to fetch student profile" },
      { status: 500 }
    );
  }
}
