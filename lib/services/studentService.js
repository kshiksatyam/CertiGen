import { prisma } from "@/lib/prisma";

/**
 * studentService — the ONLY layer that touches Prisma for Student operations.
 *
 * Architecture rule (architecture.md §3 + rules.md):
 *   No route handler or Server Action may call prisma.student.* directly.
 *   All reads and writes go through the exports below.
 *
 * Student model fields (schema.prisma):
 *   email         String  @id            — login identity, never updated via PATCH
 *   rollNumber    String  @unique        — institution enrollment number
 *   fullName      String
 *   program       String                 — e.g. "B.Tech", "M.Tech"
 *   course        String                 — e.g. "Computer Science"
 *   semester      String                 — e.g. "4th"
 *   purpose       String                 — default bonafide purpose
 *   mobileNumber  String?                — optional, used for WhatsApp OTP
 *   firebaseToken String?  @db.Text      — FCM device token (Module 8)
 */

// ── List all students ─────────────────────────────────────────────────────────

/**
 * Returns every student row, ordered by fullName ascending.
 * Excludes firebaseToken (large, sensitive) from the list response.
 *
 * @returns {Promise<import("@prisma/client").Student[]>}
 */
export async function listStudents() {
  return prisma.student.findMany({
    orderBy: { fullName: "asc" },
    select: {
      email: true,
      rollNumber: true,
      fullName: true,
      program: true,
      course: true,
      semester: true,
      purpose: true,
      mobileNumber: true,
      // firebaseToken intentionally omitted from list — fetched only when needed
    },
  });
}

// ── Get one student by email ──────────────────────────────────────────────────

/**
 * Fetches a single student by their email address (the primary key).
 *
 * @param {string} email
 * @returns {Promise<import("@prisma/client").Student | null>}
 */
export async function getStudentByEmail(email) {
  return prisma.student.findUnique({
    where: { email },
  });
}

// ── Create a student ──────────────────────────────────────────────────────────

/**
 * Inserts a new Student row.
 *
 * Required fields in `data`: email, rollNumber, fullName, program, course,
 *   semester, purpose.
 * Optional fields: mobileNumber, firebaseToken.
 *
 * Throws a Prisma error (P2002) if email or rollNumber already exists —
 * the caller (route handler) is responsible for catching and returning 409.
 *
 * @param {{
 *   email: string,
 *   rollNumber: string,
 *   fullName: string,
 *   program: string,
 *   course: string,
 *   semester: string,
 *   purpose: string,
 *   mobileNumber?: string,
 *   firebaseToken?: string,
 * }} data
 * @returns {Promise<import("@prisma/client").Student>}
 */
export async function createStudent(data) {
  const { email, rollNumber, fullName, program, course, semester, purpose, mobileNumber, firebaseToken } = data;
  return prisma.student.create({
    data: {
      email,
      rollNumber,
      fullName,
      program,
      course,
      semester,
      purpose,
      ...(mobileNumber !== undefined && { mobileNumber }),
      ...(firebaseToken !== undefined && { firebaseToken }),
    },
  });
}

// ── Update a student ──────────────────────────────────────────────────────────

/**
 * Partially updates an existing Student row identified by email.
 *
 * Security: `email` (PK) is always taken from the URL param — never from the
 * body — so a caller cannot change a student's primary key via this function.
 * `rollNumber` IS allowed in the update payload (admin may need to correct a
 * typo), but Prisma will enforce the @unique constraint automatically.
 *
 * Only the following mutable fields are accepted in `data`:
 *   fullName, program, course, semester, purpose, mobileNumber,
 *   firebaseToken, rollNumber.
 * Any other keys in the incoming payload are ignored (stripped by the allow-list
 * inside the route handler before this function is called).
 *
 * Throws Prisma P2025 (RecordNotFound) if the email doesn't exist — the caller
 * should catch that and return 404.
 *
 * @param {string} email
 * @param {Partial<Omit<import("@prisma/client").Student, "email">>} data
 * @returns {Promise<import("@prisma/client").Student>}
 */
export async function updateStudent(email, data) {
  return prisma.student.update({
    where: { email },
    data,
  });
}
