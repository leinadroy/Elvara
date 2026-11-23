import {
  Baby,
  Building2,
  CalendarRange,
  GraduationCap,
  House,
  Inbox,
  KeyRound,
  ScrollText,
  Upload,
  UserRound,
  UsersRound,
  BriefcaseBusiness,
  HeartHandshake,
  School,
  Clock,
  ClipboardCheck,
  Settings2,
  Megaphone,
  Bell,
  ChartColumn,
  type LucideIcon,
} from "lucide-react";
import type { MenuIcon } from "@/lib/menu";

export const MENU_ICONS: Record<MenuIcon, LucideIcon> = {
  home: House,
  child: Baby,
  students: GraduationCap,
  staff: BriefcaseBusiness,
  family: HeartHandshake,
  users: UsersRound,
  building: Building2,
  calendar: CalendarRange,
  upload: Upload,
  log: ScrollText,
  inbox: Inbox,
  classes: School,
  timetable: Clock,
  attendance: ClipboardCheck,
  settings: Settings2,
  megaphone: Megaphone,
  bell: Bell,
  chart: ChartColumn,
  profile: UserRound,
  lock: KeyRound,
};

/**
 * Tanda Elvara: huruf E dari tiga lajur (karya orisinal, bukan aset dari PDF Elvara). Lajur tengah memakai
 * merah proses sebagai penanda alur, sesuai bahasa visual blueprint.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-7 shrink-0">
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <rect x="9" y="8" width="14" height="3.5" rx="1.75" className="fill-primary-foreground" />
        <rect x="9" y="14.25" width="10" height="3.5" rx="1.75" style={{ fill: "var(--brand-accent)" }} />
        <rect x="9" y="20.5" width="14" height="3.5" rx="1.75" className="fill-primary-foreground" />
        <rect x="9" y="8" width="3.5" height="16" rx="1.75" className="fill-primary-foreground" />
      </svg>
      <span>Elvara</span>
    </span>
  );
}
