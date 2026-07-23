"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import AdminNav from "@/components/AdminNav";

export default function AdminUsersPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null); // null = Add, Student = Edit
  const [formData, setFormData] = useState({
    email: "",
    rollNumber: "",
    fullName: "",
    program: "B.Tech",
    course: "Computer Science",
    semester: "4th",
    purpose: "Scholarship Application",
    mobileNumber: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/admin-login");
    }
  }, [session, isPending, router]);

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/students");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error("Failed to fetch students:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchStudents();
    }
  }, [session]);

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setFormData({
      email: "",
      rollNumber: "",
      fullName: "",
      program: "B.Tech",
      course: "Computer Science",
      semester: "4th",
      purpose: "Scholarship Application",
      mobileNumber: "",
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      email: student.email,
      rollNumber: student.rollNumber,
      fullName: student.fullName,
      program: student.program,
      course: student.course,
      semester: student.semester,
      purpose: student.purpose || "Scholarship Application",
      mobileNumber: student.mobileNumber || "",
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (editingStudent) {
        // PATCH existing student
        const res = await fetch(`/api/students/${encodeURIComponent(editingStudent.email)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update student profile.");

        setFeedback({ type: "success", text: `Updated student ${formData.fullName}` });
      } else {
        // POST new student
        const res = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to register student.");

        setFeedback({ type: "success", text: `Registered new student ${formData.fullName}` });
      }

      setShowModal(false);
      fetchStudents();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      s.fullName?.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query) ||
      s.rollNumber?.toLowerCase().includes(query) ||
      s.course?.toLowerCase().includes(query)
    );
  });

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <AdminNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted">Loading Student Roster...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 animate-slide-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Student Roster
            </h1>
            <p className="text-sm text-muted mt-1">
              Manage enrolled student records, roll numbers, and mobile WhatsApp numbers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search name, email, roll..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 px-3.5 py-2 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary"
            />
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-primary transition-all flex items-center gap-1.5 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Student
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm border ${
              feedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Student Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-background/50 text-xs font-semibold text-muted uppercase tracking-wider">
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Roll Number</th>
                  <th className="py-3.5 px-4">Program & Course</th>
                  <th className="py-3.5 px-4">Semester</th>
                  <th className="py-3.5 px-4">Mobile / WhatsApp</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted text-sm">
                      No student records found.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.email} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{student.fullName}</div>
                        <div className="text-xs text-muted font-mono">{student.email}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-primary font-medium">
                        {student.rollNumber}
                      </td>
                      <td className="py-3.5 px-4 text-foreground">
                        {student.program} — {student.course}
                      </td>
                      <td className="py-3.5 px-4 text-muted">{student.semester}</td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {student.mobileNumber ? (
                          <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            {student.mobileNumber}
                          </span>
                        ) : (
                          <span className="text-muted italic">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenEditModal(student)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-foreground text-xs border border-border transition-colors"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal for Add / Edit */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-slide-up">
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-muted hover:text-foreground text-sm"
              >
                ✕
              </button>

              <h3 className="text-xl font-bold text-foreground mb-4">
                {editingStudent ? "Edit Student Profile" : "Register New Student"}
              </h3>

              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSaveStudent} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-muted mb-1 font-medium">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!!editingStudent}
                    placeholder="student@institution.edu"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-muted mb-1 font-medium">Roll Number</label>
                    <input
                      type="text"
                      value={formData.rollNumber}
                      onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                      placeholder="e.g. 2024CS01"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-muted mb-1 font-medium">Full Name</label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Full Name"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-muted mb-1 font-medium">Program</label>
                    <input
                      type="text"
                      value={formData.program}
                      onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                      placeholder="e.g. B.Tech"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-muted mb-1 font-medium">Course</label>
                    <input
                      type="text"
                      value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      placeholder="e.g. Computer Science"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-muted mb-1 font-medium">Semester</label>
                    <input
                      type="text"
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      placeholder="e.g. 4th"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-muted mb-1 font-medium">Mobile / WhatsApp (Optional)</label>
                    <input
                      type="text"
                      value={formData.mobileNumber}
                      onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                      placeholder="+919876543210"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-foreground font-medium border border-border"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold shadow-primary disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : editingStudent ? "Save Changes" : "Register Student"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
