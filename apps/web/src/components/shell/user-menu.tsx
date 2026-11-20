"use client";

import { ChevronDown, KeyRound, LogOut, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ROLE_LABELS, type Me, type RoleKey } from "@smart-school/contracts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { apiSend } from "@/lib/api-client";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** Pengguna dengan lebih dari satu peran memilih konteks aktif; izin API mengikuti peran aktif. */
export function RoleSwitcher({ roles, activeRole }: { roles: RoleKey[]; activeRole: RoleKey }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (roles.length < 2) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" }) + " max-w-44"} aria-label={`Peran aktif: ${ROLE_LABELS[activeRole]}. Ganti peran`} disabled={pending}>
        <UsersRound />
        <span className="hidden truncate sm:inline">{pending ? "Mengganti…" : ROLE_LABELS[activeRole]}</span>
        <ChevronDown className="opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Ganti peran</DropdownMenuLabel>
          {roles.map((r) => (
            <DropdownMenuItem
              key={r}
              disabled={r === activeRole}
              onClick={() =>
                start(async () => {
                  const res = await apiSend("POST", "/auth/active-role", { role: r });
                  if (!res.ok) return window.alert(res.error.message);
                  router.push(r === "GUARDIAN" ? "/guardian/children" : "/dashboard");
                  router.refresh();
                })
              }
            >
              {ROLE_LABELS[r]}
              {r === activeRole && <span className="ml-auto text-xs text-muted-foreground">aktif</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserMenu({ me }: { me: Me }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const name = me.person?.fullName ?? me.user.email;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonVariants({ variant: "ghost" }) + " h-9 gap-2 px-1.5"} aria-label={`Menu akun ${name}`}>
        <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {initials(name) || "?"}
        </span>
        <span className="hidden max-w-36 truncate text-sm font-medium md:inline">{name}</span>
        <ChevronDown className="hidden opacity-60 md:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block truncate text-sm font-medium text-foreground">{name}</span>
            <span className="block truncate text-xs font-normal">{me.user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {me.person && (
            <DropdownMenuItem onClick={() => router.push("/me")}>
              <UserRound /> Edit profil
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => router.push("/me/security#password")}>
            <KeyRound /> Ganti kata sandi
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/me/security#mfa")}>
            <ShieldCheck /> Verifikasi dua langkah
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await apiSend("POST", "/auth/logout");
              router.replace("/login");
              router.refresh();
            })
          }
        >
          <LogOut /> {pending ? "Keluar…" : "Keluar"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
