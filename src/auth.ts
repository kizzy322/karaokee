import {
  Body, CanActivate, Controller, createParamDecorator, ExecutionContext, ForbiddenException, HttpCode,
  Injectable, Logger, Post, SetMetadata, UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { compare } from 'bcryptjs';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { Role, User } from './entities';
import { LoginDto } from './validation';

const PUBLIC = 'public';
const ROLES = 'roles';
export const Public = () => SetMetadata(PUBLIC, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);
export const Operators = () => Roles(Role.Staff, Role.Admin);
export const isOperator = (user: User) => user.role === Role.Staff || user.role === Role.Admin;
export const audit = new Logger('Audit');

type AuthenticatedRequest = Request & { actor?: User };
export const Actor = createParamDecorator((_data, context: ExecutionContext) =>
  context.switchToHttp().getRequest<AuthenticatedRequest>().actor,
);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext) {
    const target = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC, target)) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) throw new UnauthorizedException('Authentication required');

    let userId: number;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number }>(token, { algorithms: ['HS256'] });
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (!Number.isInteger(userId) || userId < 1) throw new UnauthorizedException('Invalid token');

    const actor = await this.users.findOneBy({ userId });
    if (!actor) throw new UnauthorizedException('Account no longer exists');
    const allowed = this.reflector.getAllAndOverride<Role[]>(ROLES, target);
    if (allowed && !allowed.includes(actor.role)) throw new ForbiddenException('Insufficient access');

    request.actor = actor;
    return true;
  }
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users.createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.username = :username', { username: dto.username })
      .getOne();
    if (!user || Buffer.byteLength(dto.password, 'utf8') > 72 || !await compare(dto.password, user.password)) {
      audit.warn('Login rejected');
      throw new UnauthorizedException('Invalid username or password');
    }
    const accessToken = await this.jwt.signAsync({ sub: user.userId, role: user.role });
    audit.log(`Login userId=${user.userId}`);
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: { userId: user.userId, fullName: user.fullName, username: user.username, role: user.role },
    };
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
}

