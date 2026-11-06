import { createHash, randomBytes } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CLOCK_TOKEN, IClock } from '../common/clock';
import { InvalidCredentialsError, UnauthorizedError } from '../common/errors';
import { SessionEntity } from '../infrastructure/entities/session.entity';
import { Role, UserEntity } from '../infrastructure/entities/user.entity';
import { PasswordHasher } from '../infrastructure/password-hasher';

/** Public user shape: never contains the hash or the date of birth (F-01 contract R14). */
export interface CurrentUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
}

export interface LoginResult {
  user: CurrentUser;
  token: string;
  maxAgeMs: number;
}

const DEFAULT_TTL_HOURS = 8;

export function sessionTtlMs(): number {
  const hours = Number(process.env.SESSION_TTL_HOURS);
  return (Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_TTL_HOURS) * 60 * 60 * 1000;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toCurrentUser(user: UserEntity): CurrentUser {
  return { id: user.id, username: user.username, displayName: user.displayName, role: user.role };
}

@Injectable()
export class AuthService {
  /** Used to spend the same hashing time when the username does not exist. */
  private dummyHash?: Promise<string>;

  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(SessionEntity) private readonly sessions: Repository<SessionEntity>,
    @Inject(CLOCK_TOKEN) private readonly clock: IClock,
  ) {}

  async login(username: string, password: string): Promise<LoginResult> {
    const user = await this.users.findOne({ where: { username } });
    if (!user) {
      // Verify against a dummy hash so an unknown user takes about as long as a wrong password.
      this.dummyHash ??= PasswordHasher.hash(randomBytes(16).toString('hex'));
      await PasswordHasher.verify(await this.dummyHash, password);
      throw new InvalidCredentialsError();
    }
    if (!(await PasswordHasher.verify(user.passwordHash, password))) {
      throw new InvalidCredentialsError();
    }

    const token = randomBytes(32).toString('base64url');
    const now = this.clock.now();
    const maxAgeMs = sessionTtlMs();
    await this.sessions.insert({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + maxAgeMs),
      createdAt: now,
    });
    return { user: toCurrentUser(user), token, maxAgeMs };
  }

  /** Resolves the user from a raw cookie token. Expired sessions are deleted on sight (AC-05). */
  async authenticate(token: string | undefined): Promise<CurrentUser> {
    if (!token) throw new UnauthorizedError();
    const session = await this.sessions.findOne({
      where: { tokenHash: hashToken(token) },
      relations: { user: true },
    });
    if (!session || !session.user) throw new UnauthorizedError();
    if (session.expiresAt.getTime() <= this.clock.now().getTime()) {
      await this.sessions.delete({ id: session.id });
      throw new UnauthorizedError('Session expired');
    }
    return toCurrentUser(session.user);
  }

  /** Deletes the session of this token (AC-04). */
  async logout(token: string): Promise<void> {
    await this.sessions.delete({ tokenHash: hashToken(token) });
  }
}
