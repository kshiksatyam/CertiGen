import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { listStudents } from "@/lib/services/studentService";

/**
 * GET /api/admin/students/csv
 * Admin-gated endpoint exporting student roster as CSV.
 */
export async function GET(request) {
  const err = await requireRole(request.headers, "admin");
  if (err) return err;

  try {
    const students = await listStudents();
    const headers = "rollNumber,fullName,email,program,course,semester,mobileNumber\n";
    const rows = students
      .map(
        (s) =>
          `"${s.rollNumber}","${s.fullName}","${s.email}","${s.program}","${s.course}","${s.semester}","${s.mobileNumber || ""}"`
      )
      .join("\n");

    const csvContent = headers + rows;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="students-roster.csv"',
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/students/csv]", error);
    return NextResponse.json(
      { error: "Failed to generate CSV export" },
      { status: 500 }
    );
  }
}
