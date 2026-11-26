import {
  BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, Injectable,
  NotFoundException, Param, Patch, Post,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Actor, audit, Operators, Public } from './auth';
import { QueueEntry, QueueStatus, RequestStatus, User } from './entities';
import { lockRequest } from './requests';
import { CreateQueueDto, IdPipe, UpdateQueueDto } from './validation';

@Injectable()
export class QueueService {
  constructor(@InjectRepository(QueueEntry) private readonly queue: Repository<QueueEntry>) {}

  list() {
    return this.queue.find({
      where: { queueStatus: In([QueueStatus.Waiting, QueueStatus.Playing]) },
      order: { queuePosition: 'ASC', queueId: 'ASC' },
    });
  }

  async create(dto: CreateQueueDto, actor: User) {
    const entry = await this.queue.manager.transaction(async (manager) => {
      const request = await lockRequest(manager, dto.requestId);
      if (request.status !== RequestStatus.Approved) {
        throw new ConflictException('Only approved song requests can join the queue');
      }
      const queue = manager.getRepository(QueueEntry);
      return queue.save(queue.create({ ...dto, queueStatus: QueueStatus.Waiting }));
    });
    audit.log(`Queue added actorId=${actor.userId} queueId=${entry.queueId}`);
    return entry;
  }

  async update(queueId: number, dto: UpdateQueueDto, actor: User) {
    if (dto.queuePosition === undefined && dto.queueStatus === undefined) {
      throw new BadRequestException('Provide a queue position or status');
    }
    const entry = await this.queue.manager.transaction(async (manager) => {
      const queue = manager.getRepository(QueueEntry);
      const entry = await queue.findOne({ where: { queueId }, lock: { mode: 'pessimistic_write' } });
      if (!entry) throw new NotFoundException('Queue entry not found');
      return queue.save(queue.merge(entry, dto));
    });
    audit.log(`Queue updated actorId=${actor.userId} queueId=${queueId}`);
    return entry;
  }

  async remove(queueId: number, actor: User) {
    const result = await this.queue.delete(queueId);
    if (!result.affected) throw new NotFoundException('Queue entry not found');
    audit.log(`Queue removed actorId=${actor.userId} queueId=${queueId}`);
  }
}

@Operators()
@Controller('queue')
export class QueueController {
  constructor(private readonly queue: QueueService) {}

  @Public()
  @Get()
  list() {
    return this.queue.list();
  }

  @Post()
  create(@Body() dto: CreateQueueDto, @Actor() actor: User) {
    return this.queue.create(dto, actor);
  }

  @Patch(':id')
  update(@Param('id', IdPipe) id: number, @Body() dto: UpdateQueueDto, @Actor() actor: User) {
    return this.queue.update(id, dto, actor);
  }

  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', IdPipe) id: number, @Actor() actor: User) {
    return this.queue.remove(id, actor);
  }
}

