import type { UserRole } from '@prisma/client';
import type { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
}

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: AuthenticatedUser;
}
