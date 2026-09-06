import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AccountType,
  OAuthProvider,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis.service';
import { TooManyRequestsException } from '../../common/exceptions/too-many-requests.exception';
import type { AuthSession, AuthenticatedUser } from './auth.types';

export interface GoogleIdentity {
  avatar?: string;
  displayName?: string;
  email: string;
  subject: string;
}

export interface GitHubIdentity {
  avatarUrl?: string;
  displayName?: string;
  email?: string;
  providerUsername?: string;
  subject: string;
}

interface VerifiedOAuthIdentity {
  avatarUrl?: string;
  displayName?: string;
  provider: OAuthProvider;
  providerEmail?: string;
  providerUsername?: string;
  providerUserId: string;
}

const scrypt = promisify(nodeScrypt);

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    await this.bootstrapStaffAccount();
  }

  async authenticateStaff(email: string, password: string) {
    const normalizedEmail = this.normalizeEmail(email);
    return this.prismaService.$transaction(async (tx) => {
      const credential = await tx.staffCredential.findFirst({
        where: {
          user: {
            email: normalizedEmail,
            role: UserRole.ADMIN,
            status: UserStatus.ACTIVE,
          },
        },
        include: { user: { select: this.authUserSelect } },
      });

      if (credential) {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${credential.user.id}::uuid FOR UPDATE`;
        const latest = await tx.staffCredential.findUnique({
          where: { id: credential.id },
        });
        if (!latest || latest.passwordHash !== credential.passwordHash)
          throw new UnauthorizedException('Invalid staff credentials');
      }
      const valid = credential
        ? await this.verifyPassword(password, credential.passwordHash)
        : await this.verifyPassword(password, this.dummyPasswordHash);
      if (!credential || !valid) {
        throw new UnauthorizedException('Invalid staff credentials');
      }

      await tx.staffCredential.update({
        where: { id: credential.id },
        data: { lastLoginAt: new Date() },
      });
      return this.issueSession(this.toAuthenticatedUser(credential.user), tx);
    });
  }

  async setStaffPassword(
    userId: string,
    password: string,
    database?: Prisma.TransactionClient,
  ) {
    const passwordHash = await this.hashPassword(password);
    const save = async (tx: Prisma.TransactionClient) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (user?.role !== UserRole.ADMIN)
        throw new UnauthorizedException('Administrator account required');
      await tx.staffCredential.upsert({
        where: { userId },
        create: { userId, passwordHash },
        update: { passwordHash },
      });
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    };
    if (database) await save(database);
    else await this.prismaService.$transaction(save);
  }

  async changeStaffPassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    return this.prismaService.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
      const credential = await tx.staffCredential.findUnique({
        where: { userId },
      });
      if (
        !credential ||
        !(await this.verifyPassword(currentPassword, credential.passwordHash))
      ) {
        throw new UnauthorizedException('Current password is incorrect');
      }
      await this.setStaffPassword(userId, newPassword, tx);
      return { success: true };
    });
  }

  async assertAuthRateLimit(key: string, limit: number, ttlSeconds: number) {
    try {
      const count = await this.redisService.increment(
        `auth:${key}`,
        ttlSeconds,
      );
      if (count > limit) {
        throw new TooManyRequestsException(
          'Too many authentication attempts. Try again later.',
        );
      }
    } catch (error: unknown) {
      if (error instanceof TooManyRequestsException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        'Authentication is temporarily unavailable',
      );
    }
  }

  getGoogleAuthorizationUrl(state: string, verifier: string) {
    const client = this.googleClient();

    return client.generateAuthUrl({
      access_type: 'online',
      prompt: 'select_account',
      scope: ['openid', 'email', 'profile'],
      state,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method:
        'S256' as import('google-auth-library').CodeChallengeMethod,
    });
  }

  async exchangeGoogleCode(code: string, verifier: string) {
    const client = this.googleClient();
    const { tokens } = await client.getToken({ code, codeVerifier: verifier });

    if (!tokens.id_token) {
      throw new UnauthorizedException(
        'Google did not return an identity token',
      );
    }

    const ticket = await client.verifyIdToken({
      audience: this.googleClientId,
      idToken: tokens.id_token,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new UnauthorizedException(
        'Google account email could not be verified',
      );
    }

    return this.authenticateOAuth({
      avatarUrl: payload.picture,
      displayName: payload.name,
      provider: OAuthProvider.GOOGLE,
      providerEmail: payload.email,
      providerUserId: payload.sub,
    });
  }

  async authenticateGoogle(identity: GoogleIdentity) {
    return this.authenticateOAuth({
      avatarUrl: identity.avatar,
      displayName: identity.displayName,
      provider: OAuthProvider.GOOGLE,
      providerEmail: identity.email,
      providerUserId: identity.subject,
    });
  }

  getGitHubAuthorizationUrl(state: string, verifier: string) {
    this.githubClientConfig();
    const query = new URLSearchParams({
      client_id: this.githubClientId,
      redirect_uri: this.githubCallbackUrl,
      response_type: 'code',
      scope: 'read:user user:email',
      state,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    });
    return `https://github.com/login/oauth/authorize?${query.toString()}`;
  }

  async exchangeGitHubCode(code: string, verifier: string) {
    this.githubClientConfig();
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        body: new URLSearchParams({
          client_id: this.githubClientId,
          client_secret: this.githubClientSecret,
          code,
          code_verifier: verifier,
          redirect_uri: this.githubCallbackUrl,
        }),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        signal: AbortSignal.timeout(10000),
      },
    );
    const tokenBody = (await tokenResponse.json().catch(() => null)) as {
      access_token?: string;
    } | null;
    if (!tokenResponse.ok || !tokenBody?.access_token) {
      throw new UnauthorizedException(
        'GitHub authorization could not be completed',
      );
    }

    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${tokenBody.access_token}`,
      'User-Agent': 'Vrompt',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    const profileResponse = await fetch('https://api.github.com/user', {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    const profile = (await profileResponse.json().catch(() => null)) as {
      avatar_url?: string;
      id?: number;
      login?: string;
      name?: string | null;
      email?: string | null;
    } | null;
    if (!profileResponse.ok || !profile?.id || !profile.login) {
      throw new UnauthorizedException('GitHub identity could not be verified');
    }

    let email: string | undefined;
    {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      const emails = (await emailsResponse.json().catch(() => null)) as Array<{
        email?: string;
        primary?: boolean;
        verified?: boolean;
      }> | null;
      if (emailsResponse.ok && Array.isArray(emails)) {
        email =
          emails?.find((item) => item.primary && item.verified)?.email ??
          emails?.find((item) => item.verified)?.email;
      }
    }

    return this.authenticateOAuth({
      avatarUrl: profile.avatar_url,
      displayName: profile.name ?? profile.login,
      provider: OAuthProvider.GITHUB,
      providerEmail: email,
      providerUsername: profile.login,
      providerUserId: String(profile.id),
    });
  }

  async authenticateGitHub(identity: GitHubIdentity) {
    return this.authenticateOAuth({
      avatarUrl: identity.avatarUrl,
      displayName: identity.displayName,
      provider: OAuthProvider.GITHUB,
      providerEmail: identity.email,
      providerUsername: identity.providerUsername,
      providerUserId: identity.subject,
    });
  }

  private async authenticateOAuth(identity: VerifiedOAuthIdentity) {
    const providerEmail = identity.providerEmail
      ? this.normalizeEmail(identity.providerEmail)
      : undefined;
    const user = await this.prismaService.$transaction(async (transaction) => {
      const existingIdentity = await transaction.userIdentity.findUnique({
        where: {
          provider_providerUserId: {
            provider: identity.provider,
            providerUserId: identity.providerUserId,
          },
        },
        select: {
          id: true,
          user: { select: this.authUserSelect },
        },
      });

      if (
        existingIdentity &&
        (existingIdentity.user.status !== UserStatus.ACTIVE ||
          existingIdentity.user.role !== UserRole.USER)
      ) {
        throw new UnauthorizedException('This account is unavailable');
      }

      if (existingIdentity) {
        await transaction.userIdentity.update({
          where: { id: existingIdentity.id },
          data: {
            avatarUrl: identity.avatarUrl,
            providerEmail,
            providerUsername: identity.providerUsername,
          },
        });

        await transaction.profile.upsert({
          where: { userId: existingIdentity.user.id },
          create: {
            userId: existingIdentity.user.id,
            avatar: identity.avatarUrl,
            displayName: identity.displayName,
          },
          // Provider supplies defaults on first sign-in; user-managed profile data persists.
          update: {},
        });

        return existingIdentity.user;
      }

      const registrationSetting = await transaction.siteSetting.findUnique({
        where: { key: 'features.registrationEnabled' },
        select: { value: true },
      });
      if (registrationSetting?.value === false) {
        throw new ServiceUnavailableException(
          'New account registration is temporarily disabled',
        );
      }

      const email = await this.accountEmail(
        transaction,
        identity.provider,
        identity.providerUserId,
        providerEmail,
      );
      const username = await this.uniqueUsername(
        transaction,
        identity.displayName || identity.providerUsername || 'account',
        identity.providerUserId,
      );

      const createdUser = await transaction.user.create({
        data: {
          email,
          username,
          onboardingCompleted: false,
          profile: {
            create: {
              avatar: identity.avatarUrl,
              displayName: identity.displayName,
            },
          },
        },
        select: this.authUserSelect,
      });
      await transaction.userIdentity.create({
        data: {
          avatarUrl: identity.avatarUrl,
          provider: identity.provider,
          providerEmail,
          providerUserId: identity.providerUserId,
          providerUsername: identity.providerUsername,
          userId: createdUser.id,
        },
      });
      return createdUser;
    });

    return this.issueSession(this.toAuthenticatedUser(user));
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const session = await this.prismaService.$transaction(
      async (transaction) => {
        const lookup = await transaction.refreshToken.findUnique({
          where: { tokenHash },
          select: { userId: true },
        });
        if (!lookup)
          throw new UnauthorizedException('Invalid or expired refresh token');
        await transaction.$queryRaw`SELECT id FROM "User" WHERE id = ${lookup.userId}::uuid FOR UPDATE`;
        const existingToken = await transaction.refreshToken.findUnique({
          where: { tokenHash },
          include: { user: { select: this.authUserSelect } },
        });
        const now = new Date();
        if (existingToken?.revokedAt) {
          await transaction.refreshToken.updateMany({
            where: { familyId: existingToken.familyId, revokedAt: null },
            data: { revokedAt: now },
          });
          return null;
        }

        if (
          !existingToken ||
          existingToken.revokedAt ||
          existingToken.expiresAt <= now ||
          existingToken.user.status !== UserStatus.ACTIVE ||
          !([UserRole.USER, UserRole.ADMIN] as UserRole[]).includes(
            existingToken.user.role,
          )
        ) {
          throw new UnauthorizedException('Invalid or expired refresh token');
        }

        const revoked = await transaction.refreshToken.updateMany({
          where: { id: existingToken.id, revokedAt: null },
          data: { revokedAt: now },
        });

        if (revoked.count !== 1) {
          throw new UnauthorizedException(
            'Refresh token has already been used',
          );
        }

        return this.issueSession(
          this.toAuthenticatedUser(existingToken.user),
          transaction,
          existingToken.familyId,
          existingToken.expiresAt,
        );
      },
    );
    if (!session)
      throw new UnauthorizedException('Refresh token has already been used');
    return session;
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return;
    }

    await this.prismaService.$transaction(async (tx) => {
      const session = await tx.refreshToken.findUnique({
        where: { tokenHash: this.hashRefreshToken(refreshToken) },
      });
      if (!session) return;
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${session.userId}::uuid FOR UPDATE`;
      await tx.refreshToken.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }

  async getCurrentUser(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: this.authUserSelect,
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.toAuthenticatedUser(user);
  }

  private async issueSession(
    user: AuthenticatedUser,
    database: PrismaService | Prisma.TransactionClient = this.prismaService,
    familyId: string = randomUUID(),
    expiresAt?: Date,
  ): Promise<AuthSession> {
    if (database === this.prismaService) {
      return this.prismaService.$transaction((tx) =>
        this.issueSession(user, tx, familyId, expiresAt),
      );
    }
    await database.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id}::uuid FOR UPDATE`;
    const current = await database.user.findUnique({
      where: { id: user.id },
      select: this.authUserSelect,
    });
    if (
      !current ||
      current.status !== UserStatus.ACTIVE ||
      current.role !== user.role ||
      ![UserRole.USER, UserRole.ADMIN].includes(
        current.role as 'USER' | 'ADMIN',
      )
    )
      throw new UnauthorizedException('Account is unavailable');
    const refreshToken = randomBytes(48).toString('base64url');
    const sessionId = randomUUID();
    const refreshExpiresAt =
      expiresAt ?? new Date(Date.now() + this.refreshTtlSeconds * 1000);

    await database.refreshToken.create({
      data: {
        id: sessionId,
        familyId,
        userId: user.id,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: refreshExpiresAt,
      },
    });

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      sid: familyId,
      role: user.role,
      username: user.username,
    });

    return { accessToken, refreshToken, refreshExpiresAt, user };
  }

  private async uniqueUsername(
    database: Prisma.TransactionClient,
    source: string,
    subject: string,
  ) {
    const base =
      source
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 25) || 'account';
    const suffix = createHash('sha256')
      .update(subject)
      .digest('hex')
      .slice(0, 6);
    const candidates = [
      base,
      `${base.slice(0, 25 - suffix.length - 1)}_${suffix}`,
    ];

    for (const candidate of candidates) {
      const existing = await database.user.findUnique({
        where: { username: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }
    }

    return `account_${suffix}`;
  }

  private googleClient() {
    if (!this.googleClientId || !this.googleClientSecret) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured. Add Google OAuth credentials.',
      );
    }

    return new OAuth2Client(
      this.googleClientId,
      this.googleClientSecret,
      this.googleCallbackUrl,
    );
  }

  private githubClientConfig() {
    if (!this.githubClientId || !this.githubClientSecret) {
      throw new ServiceUnavailableException(
        'GitHub sign-in is not configured. Add GitHub OAuth credentials.',
      );
    }
  }

  private async accountEmail(
    database: Prisma.TransactionClient,
    provider: OAuthProvider,
    providerUserId: string,
    providerEmail?: string,
  ) {
    if (providerEmail) {
      const existing = await database.user.findUnique({
        where: { email: providerEmail },
        select: { id: true },
      });
      if (!existing) return providerEmail;
    }

    const suffix = createHash('sha256')
      .update(`${provider}:${providerUserId}`)
      .digest('hex')
      .slice(0, 24);
    return `${provider.toLowerCase()}+${suffix}@oauth.vrompt.local`;
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private async bootstrapStaffAccount() {
    const prefix = 'ADMIN';
    const email = this.configService
      .get<string>(`${prefix}_BOOTSTRAP_EMAIL`, '')
      .trim()
      .toLowerCase();
    const username = this.configService
      .get<string>(`${prefix}_BOOTSTRAP_USERNAME`, '')
      .trim()
      .toLowerCase();
    const password = this.configService.get<string>(
      `${prefix}_BOOTSTRAP_PASSWORD`,
      '',
    );
    if (!email && !username && !password) return;
    if (!email || !username || password.length < 12) {
      this.logger.error(
        `${prefix} bootstrap account requires email, username, and a password of at least 12 characters`,
      );
      return;
    }

    await this.prismaService.$transaction(async (transaction) => {
      const existing = await transaction.user.findMany({
        where: { OR: [{ email }, { username }] },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          status: true,
          accountType: true,
        },
      });

      const [account] = existing;
      if (account) {
        const isInitializedBootstrapAccount =
          existing.length === 1 &&
          account.email === email &&
          account.username === username &&
          account.accountType === AccountType.OFFICIAL;

        if (isInitializedBootstrapAccount) {
          // Never restore role/status/password from environment variables on
          // restart; administrators may have intentionally changed them.
          return;
        }

        throw new Error(
          `${prefix} bootstrap identity conflicts with an existing account; choose a unique email and username`,
        );
      }

      const passwordHash = await this.hashPassword(password);
      const user = await transaction.user.create({
        data: {
          email,
          username,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          accountType: AccountType.OFFICIAL,
          onboardingCompleted: true,
          profile: {
            create: {
              displayName: 'Administrator',
            },
          },
        },
        select: { id: true },
      });
      await transaction.staffCredential.create({
        data: { userId: user.id, passwordHash },
      });
    });
  }

  private async hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    return `scrypt$${salt}$${derived.toString('hex')}`;
  }

  private async verifyPassword(password: string, encoded: string) {
    const [algorithm, salt, expectedHex] = encoded.split('$');
    if (algorithm !== 'scrypt' || !salt || !expectedHex) return false;
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }

  private readonly dummyPasswordHash =
    'scrypt$00000000000000000000000000000000$9d067f8c9ecbe890b45f9d9d81ec47dc7496d856cd2474dfb852d20ebc711635e7c2cd8c2ec9f4cb7ad62d7c203e86f78e9457183082264c28dc6c3876c99c9a';

  private hashRefreshToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private toAuthenticatedUser(user: {
    id: string;
    email: string;
    username: string;
    role: AuthenticatedUser['role'];
    accountType: AuthenticatedUser['accountType'];
    plan: AuthenticatedUser['plan'];
    onboardingCompleted: boolean;
  }): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      accountType: user.accountType,
      plan: user.plan,
      onboardingCompleted: user.onboardingCompleted,
    };
  }

  private get googleClientId() {
    return this.configService.get<string>('GOOGLE_CLIENT_ID', '');
  }

  private get googleClientSecret() {
    return this.configService.get<string>('GOOGLE_CLIENT_SECRET', '');
  }

  private get googleCallbackUrl() {
    return this.configService.get<string>(
      'GOOGLE_CALLBACK_URL',
      'http://localhost:4000/api/v1/auth/google/callback',
    );
  }

  private get githubClientId() {
    return this.configService.get<string>('GITHUB_CLIENT_ID', '');
  }

  private get githubClientSecret() {
    return this.configService.get<string>('GITHUB_CLIENT_SECRET', '');
  }

  private get githubCallbackUrl() {
    return this.configService.get<string>(
      'GITHUB_CALLBACK_URL',
      'http://localhost:4000/api/v1/auth/github/callback',
    );
  }

  private get refreshTtlSeconds() {
    return this.configService.get<number>('JWT_REFRESH_TTL_SECONDS', 604800);
  }

  private readonly authUserSelect = {
    id: true,
    email: true,
    username: true,
    role: true,
    status: true,
    accountType: true,
    plan: true,
    onboardingCompleted: true,
  } as const;
}
