import type { AcademicYearView } from './school.js';
import type { ChildSummary } from './people.js';

/** Ringkasan beranda. Setiap bagian hanya terisi bila peran aktif berhak melihatnya. */
export interface DashboardSummary {
  academicYear: AcademicYearView | null;
  /** Semester yang sedang berjalan menurut tanggal hari ini. */
  currentTermName: string | null;
  people?: {
    studentsActive: number;
    employeesActive: number;
    teachersActive: number;
    guardians: number;
    studentsWithoutVerifiedGuardian: number;
    pendingGuardianLinks: number;
  };
  pendingCorrections?: number;
  lastImport?: { id: string; fileName: string | null; createdAt: string; errorCount: number } | null;
  recentAudit?: { id: string; action: string; actorEmail: string | null; createdAt: string }[];
  children?: ChildSummary[];
  pendingMyCorrection?: boolean;
  myDocumentCount?: number;
  mfa?: { enabled: boolean; recommended: boolean };
}
