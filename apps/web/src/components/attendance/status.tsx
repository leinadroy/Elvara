import { ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_SHORT, SESSION_STATUS_LABELS, type AttendanceStatus, type SessionStatus } from "@smart-school/contracts";

/**
 * Status selalu teks + warna (blueprint 01_visual_language). Alpa memakai warna utama (burgundy) agar menonjol,
 * Terlambat bergaris tepi, status lain netral.
 */
const STYLE: Record<AttendanceStatus, string> = {
  PRESENT: "bg-secondary text-secondary-foreground",
  LATE: "border border-[var(--module)] text-foreground",
  EXCUSED: "bg-muted text-muted-foreground",
  SICK: "bg-muted text-muted-foreground",
  ABSENT: "bg-primary text-primary-foreground",
};

export function AttendanceBadge({ status }: { status: AttendanceStatus | null }) {
  if (!status) return <span className="rounded-md border border-dashed px-1.5 py-0.5 text-xs text-muted-foreground">Belum diisi</span>;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${STYLE[status]}`}>
      <span aria-hidden="true" className="font-bold">
        {ATTENDANCE_STATUS_SHORT[status]}
      </span>
      {ATTENDANCE_STATUS_LABELS[status]}
    </span>
  );
}

export function SessionBadge({ status }: { status: SessionStatus }) {
  const cls = status === "OPEN" ? "border border-[var(--module)] text-foreground" : status === "CLOSED" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground line-through";
  return <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${cls}`}>{SESSION_STATUS_LABELS[status]}</span>;
}
