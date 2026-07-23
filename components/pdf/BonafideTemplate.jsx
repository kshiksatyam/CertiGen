/**
 * components/pdf/BonafideTemplate.jsx
 *
 * React-PDF component for the ExamCell bonafide certificate.
 *
 * ⚠️  All imports MUST come from @react-pdf/renderer — not from "react".
 *     React-PDF provides its own primitives (View, Text, etc.) that render
 *     to PDF, not to the DOM.
 *
 * Props:
 *   studentName      {string}         — full legal name
 *   enrollmentNumber {string}         — institution roll number
 *   course           {string}         — e.g. "Computer Science"
 *   semester         {string}         — e.g. "4th"
 *   purpose          {string}         — stated reason for the certificate
 *   generatedAt      {Date|string}    — timestamp; formatted inside this component
 */

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 60,
    fontSize: 11,
    color: "#1a1a2e",
  },

  // ── Border frame ──────────────────────────────────────────────────────────
  outerBorder: {
    border: "2px solid #1a1a2e",
    padding: 12,
    flex: 1,
    flexDirection: "column",
  },
  innerBorder: {
    border: "0.5px solid #4a4a8a",
    padding: 20,
    flex: 1,
    flexDirection: "column",
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    alignItems: "center",
    marginBottom: 20,
    borderBottom: "1px solid #4a4a8a",
    paddingBottom: 14,
  },
  institutionName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a2e",
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: 4,
  },
  institutionSubtitle: {
    fontSize: 9,
    color: "#555555",
    textAlign: "center",
    marginBottom: 6,
  },
  certTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    color: "#2d2d6b",
    letterSpacing: 2,
    marginTop: 8,
  },
  certNumber: {
    fontSize: 8,
    color: "#888888",
    textAlign: "center",
    marginTop: 4,
  },

  // ── Body ──────────────────────────────────────────────────────────────────
  body: {
    marginTop: 18,
    marginBottom: 18,
  },
  paragraph: {
    fontSize: 11,
    color: "#222222",
    marginBottom: 10,
    textAlign: "justify",
    lineHeight: 1.8,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },

  // ── Details table ─────────────────────────────────────────────────────────
  table: {
    marginTop: 14,
    marginBottom: 14,
    borderTop: "0.5px solid #cccccc",
    borderLeft: "0.5px solid #cccccc",
  },
  tableRow: {
    flexDirection: "row",
  },
  tableLabel: {
    width: "40%",
    padding: "6px 10px",
    fontSize: 10,
    color: "#444444",
    fontFamily: "Helvetica-Bold",
    borderRight: "0.5px solid #cccccc",
    borderBottom: "0.5px solid #cccccc",
    backgroundColor: "#f5f5fa",
  },
  tableValue: {
    width: "60%",
    padding: "6px 10px",
    fontSize: 10,
    color: "#1a1a2e",
    borderRight: "0.5px solid #cccccc",
    borderBottom: "0.5px solid #cccccc",
  },

  // ── Watermark band ────────────────────────────────────────────────────────
  watermarkBand: {
    backgroundColor: "#f0f4ff",
    borderRadius: 2,
    padding: "6px 12px",
    marginTop: 14,
    marginBottom: 4,
    alignItems: "center",
  },
  watermarkText: {
    fontSize: 8,
    color: "#4a4a8a",
    letterSpacing: 1,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    marginTop: 20,
    borderTop: "0.5px solid #cccccc",
    paddingTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerLeft: {
    fontSize: 9,
    color: "#666666",
  },
  footerNote: {
    marginTop: 3,
    fontSize: 8,
    color: "#999999",
  },
  signatureBlock: {
    alignItems: "center",
  },
  signatureLine: {
    borderTop: "1px solid #1a1a2e",
    width: 120,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 9,
    color: "#444444",
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  signatureSubLabel: {
    fontSize: 8,
    color: "#888888",
    textAlign: "center",
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value) {
  if (!value) return "—";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

function makeCertRef(enrollmentNumber, generatedAt) {
  const year = generatedAt
    ? new Date(generatedAt).getFullYear()
    : new Date().getFullYear();
  return `BC/${enrollmentNumber}/${year}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BonafideTemplate({
  studentName,
  enrollmentNumber,
  course,
  semester,
  purpose,
  generatedAt,
}) {
  const dateStr = formatDate(generatedAt);
  const certRef = makeCertRef(enrollmentNumber, generatedAt);

  const tableRows = [
    ["Student Name",       studentName],
    ["Enrollment Number",  enrollmentNumber],
    ["Course / Programme", course],
    ["Semester / Year",    semester],
    ["Purpose",            purpose],
    ["Date of Issue",      dateStr],
  ];

  return (
    <Document
      title="Bonafide Certificate"
      author="ExamCell"
      subject={`Bonafide Certificate — ${studentName}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.outerBorder}>
          <View style={styles.innerBorder}>

            {/* ── Header ── */}
            <View style={styles.header}>
              <Text style={styles.institutionName}>EXAMCELL</Text>
              <Text style={styles.institutionSubtitle}>
                Office of the Examination Controller
              </Text>
              <Text style={styles.certTitle}>BONAFIDE CERTIFICATE</Text>
              <Text style={styles.certNumber}>Ref: {certRef}</Text>
            </View>

            {/* ── Body ── */}
            <View style={styles.body}>
              <Text style={styles.paragraph}>
                This is to certify that{" "}
                <Text style={styles.bold}>{studentName}</Text> bearing
                Enrollment Number{" "}
                <Text style={styles.bold}>{enrollmentNumber}</Text> is a{" "}
                <Text style={styles.bold}>bonafide student</Text> of this
                institution and is currently enrolled in the programme
                mentioned below during the academic session.
              </Text>

              {/* Detail table */}
              <View style={styles.table}>
                {tableRows.map(([label, value]) => (
                  <View style={styles.tableRow} key={label}>
                    <Text style={styles.tableLabel}>{label}</Text>
                    <Text style={styles.tableValue}>{value ?? "—"}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.paragraph}>
                This certificate is issued on the request of the student for
                the purpose of{" "}
                <Text style={styles.bold}>{purpose}</Text> and is valid for
                30 days from the date of issue.
              </Text>
            </View>

            {/* ── Watermark band ── */}
            <View style={styles.watermarkBand}>
              <Text style={styles.watermarkText}>
                DIGITALLY GENERATED — EXAMCELL PORTAL • {dateStr}
              </Text>
            </View>

            {/* ── Footer ── */}
            <View style={styles.footer}>
              <View>
                <Text style={styles.footerLeft}>Generated: {dateStr}</Text>
                <Text style={styles.footerNote}>
                  This is a computer-generated certificate.
                </Text>
              </View>
              <View style={styles.signatureBlock}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>Controller of Examinations</Text>
                <Text style={styles.signatureSubLabel}>ExamCell</Text>
              </View>
            </View>

          </View>
        </View>
      </Page>
    </Document>
  );
}
