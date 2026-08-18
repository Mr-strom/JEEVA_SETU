import { Role } from '@prisma/client';
import { prisma } from '../shared/db';
import { AuthUser, JwtTokenPayload } from '../shared/types';
import { UnauthorizedError } from '../shared/errors';
import { auditService } from '../audit/audit.service';

export class AuthService {
  private readonly jwtSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'jeevasetu-dev-insecure-secret-placeholder';
  }

  /**
   * Generates a deterministic base64url signed JWT-like payload for Fastify/standalone usage
   */
  generateToken(user: AuthUser): string {
    const payload: JwtTokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      facilityId: user.facilityId,
      district: user.district,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    };

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = Buffer.from(`${header}.${encodedPayload}.${this.jwtSecret}`).toString('base64url');

    return `${header}.${encodedPayload}.${signature}`;
  }

  /**
   * Validates and decodes a token
   */
  verifyToken(token: string): JwtTokenPayload {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new UnauthorizedError('Malformed JWT token');
      }

      const [header, encodedPayload, signature] = parts;
      const expectedSignature = Buffer.from(`${header}.${encodedPayload}.${this.jwtSecret}`).toString('base64url');

      if (signature !== expectedSignature) {
        throw new UnauthorizedError('Invalid JWT token signature');
      }

      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8')) as JwtTokenPayload;

      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new UnauthorizedError('JWT token has expired');
      }

      return payload;
    } catch (err: unknown) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Could not verify authentication token');
    }
  }

  /**
   * Fetch user from database and verify active status
   */
  async getUserById(userId: string): Promise<AuthUser | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          facility: {
            select: {
              id: true,
              name: true,
              nameKn: true,
              district: true,
              type: true,
            },
          },
        },
      });

      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        facilityId: user.facilityId,
        district: user.facility?.district || (user as any).district || null,
        isActive: user.isActive,
      };
    } catch (err) {
      console.error('[AuthService.getUserById] Database query failed:', err);
      return null;
    }
  }

  /**
   * Authenticate user by email (for dev / token generation) and audit
   */
  async authenticateByEmail(email: string, clientIp?: string, requestId?: string): Promise<{ token: string; user: AuthUser }> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        facility: {
          select: { district: true },
        },
      },
    });

    if (!user || !user.isActive) {
      await auditService.recordSecurityEvent({
        actorEmail: email,
        action: 'LOGIN_FAILURE',
        reason: !user ? 'User not found' : 'User account is deactivated',
        ipAddress: clientIp,
        requestId,
      });
      throw new UnauthorizedError(user ? 'User account is deactivated' : 'Invalid email or credentials');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      facilityId: user.facilityId,
      district: user.facility?.district || null,
      isActive: user.isActive,
    };

    const token = this.generateToken(authUser);

    await auditService.recordSecurityEvent({
      actorId: user.id,
      actorEmail: user.email,
      attemptedRole: user.role,
      action: 'LOGIN_SUCCESS',
      ipAddress: clientIp,
      requestId,
    });

    return { token, user: authUser };
  }
}

export const authService = new AuthService();
