import {
  BadRequestException, Body, ConflictException, Controller, Delete, ForbiddenException, Get, HttpCode,
  Injectable, NotFoundException, Param, Post, Put, Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { Actor, audit, isOperator, Operators, Public, Roles } from './auth';
import { Role, User } from './entities';
import { IdPipe, RegisterDto, UpdateUserDto, UsersQuery } from './validation';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  list({ role, page }: UsersQuery) {
    return this.users.find({
      where: { role },
      order: { userId: 'ASC' },
      ...(page === undefined ? {} : { skip: (page - 1) * 20, take: 20 }),
    });
  }

  private async find(userId: number) {
    const user = await this.users.findOneBy({ userId });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  get(userId: number, actor: User) {
    if (actor.userId !== userId && !isOperator(actor)) throw new ForbiddenException('Access to this account is forbidden');
    return this.find(userId);
  }

  async register(dto: RegisterDto) {
    if (Buffer.byteLength(dto.password, 'utf8') > 72 || !dto.password.trim()) {
      throw new BadRequestException('Password must contain a non-space character and fit in 72 UTF-8 bytes');
    }
    const user = await this.users.save(this.users.create({
      fullName: dto.fullName,
      username: dto.username,
      password: await hash(dto.password, 12),
      role: Role.Singer,
    }));
    return { userId: user.userId, fullName: user.fullName, username: user.username, role: user.role };
  }

  async replace(userId: number, dto: UpdateUserDto, actor: User) {
    if (actor.userId !== userId && actor.role !== Role.Admin) {
      throw new ForbiddenException('Access to this account is forbidden');
    }
    if (dto.role !== undefined && actor.role !== Role.Admin) {
      throw new ForbiddenException('Only admins can assign roles');
    }
    if (actor.userId === userId && dto.role !== undefined && dto.role !== actor.role) {
      throw new ConflictException('An admin cannot change their own role');
    }
    const { updated, previousRole } = await this.users.manager.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const user = await users.findOne({ where: { userId }, lock: { mode: 'pessimistic_write' } });
      if (!user) throw new NotFoundException('User not found');
      const previousRole = user.role;
      return { updated: await users.save(users.merge(user, dto)), previousRole };
    });
    if (updated.role !== previousRole) {
      audit.log(`Role changed actorId=${actor.userId} userId=${userId} role=${updated.role}`);
    }
    return updated;
  }

  async remove(userId: number, actor: User) {
    if (actor.userId === userId) throw new ConflictException('An admin cannot delete their own account');
    const result = await this.users.delete(userId);
    if (!result.affected) throw new NotFoundException('User not found');
  }
}

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Operators()
  @Get()
  list(@Query() query: UsersQuery) {
    return this.users.list(query);
  }

  @Get(':id')
  get(@Param('id', IdPipe) id: number, @Actor() actor: User) {
    return this.users.get(id, actor);
  }

  @Public()
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  @Post()
  register(@Body() dto: RegisterDto) {
    return this.users.register(dto);
  }

  @Put(':id')
  replace(@Param('id', IdPipe) id: number, @Body() dto: UpdateUserDto, @Actor() actor: User) {
    return this.users.replace(id, dto, actor);
  }

  @Roles(Role.Admin)
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', IdPipe) id: number, @Actor() actor: User) {
    return this.users.remove(id, actor);
  }
}


