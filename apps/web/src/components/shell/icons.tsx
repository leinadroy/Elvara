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
  profile: UserRound,
  lock: KeyRound,
};

/** Logo Smart School: dua blok gedung di atas buku terbuka (karya orisinal, bukan aset pihak lain). */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-7 shrink-0">
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <rect x="8" y="7" width="7" height="10" rx="1.5" className="fill-primary-foreground" />
        <rect x="17" y="10" width="7" height="7" rx="1.5" style={{ fill: "var(--brand-accent)" }} />
        <path d="M6 21c3.5-2 6.8-2 10 0 3.2-2 6.5-2 10 0v4c-3.5-2-6.8-2-10 0-3.2-2-6.5-2-10 0z" className="fill-primary-foreground" />
      </svg>
      <span>Smart School</span>
    </span>
  );
}
