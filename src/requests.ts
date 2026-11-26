import {
  Body, ConflictException, Controller, Delete, ForbiddenException, Get, HttpCode, Injectable,
  NotFoundException, Param, Patch, Post,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Actor, isOperator, Operators } from './auth';
import { QueueEntry, RequestStatus, Song, SongRequest, User } from './entities';
import { CreateRequestDto, IdPipe, RequestStatusDto } from './validation';

export async function lockRequest(manager: EntityManager, requestId: number) {
  const request = await manager.getRepository(SongRequest).findOne({
    where: { requestId },
    lock: { mode: 'pessimistic_write' },
  });
  if (!request) throw new NotFoundException('Song request not found');
  return request;
}

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(SongRequest) private readonly requests: Repository<SongRequest>,
    @InjectRepository(Song) private readonly songs: Repository<Song>,
  ) {}

  list() {
    return this.requests.find({ order: { requestDate: 'ASC', requestId: 'ASC' } });
  }

  async create(dto: CreateRequestDto, actor: User) {
    if (!await this.songs.existsBy({ songId: dto.songId })) throw new NotFoundException('Song not found');
    return this.requests.save(this.requests.create({
      userId: actor.userId,
      songId: dto.songId,
      requestDate: new Date(),
      status: RequestStatus.Pending,
    }));
  }

  update(requestId: number, dto: RequestStatusDto) {
    return this.requests.manager.transaction(async (manager) => {
      const request = await lockRequest(manager, requestId);
      if (dto.status !== RequestStatus.Approved && await manager.existsBy(QueueEntry, { requestId })) {
        throw new ConflictException('Remove the queue entry before changing this request status');
      }
      request.status = dto.status;
      return manager.save(request);
    });
  }

  remove(requestId: number, actor: User) {
    return this.requests.manager.transaction(async (manager) => {
      const request = await lockRequest(manager, requestId);
      if (request.userId !== actor.userId && !isOperator(actor)) {
        throw new ForbiddenException('Access to this song request is forbidden');
      }
      if (await manager.existsBy(QueueEntry, { requestId })) {
        throw new ConflictException('Remove the queue entry before cancelling this request');
      }
      await manager.delete(SongRequest, requestId);
    });
  }
}

@Controller('song-requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Operators()
  @Get()
  list() {
    return this.requests.list();
  }

  @Post()
  create(@Body() dto: CreateRequestDto, @Actor() actor: User) {
    return this.requests.create(dto, actor);
  }

  @Operators()
  @Patch(':id')
  update(@Param('id', IdPipe) id: number, @Body() dto: RequestStatusDto) {
    return this.requests.update(id, dto);
  }

  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', IdPipe) id: number, @Actor() actor: User) {
    return this.requests.remove(id, actor);
  }
}

