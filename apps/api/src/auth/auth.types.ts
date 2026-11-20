import type { Permission, RoleKey } from '@smart-school/contracts';

export interface AuthContext {
  sessionId: string;
  userId: string;
  email: string;
  personId: string | null;
  schoolId: string;
  roles: RoleKey[];
  activeRole: RoleKey;
  permissions: ReadonlySet<Permission>;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}
