import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController, AuthGuard, AuthService } from './auth';
import { CatalogService, GenresController, SongsController } from './catalog';
import { databaseOptions } from './database';
import { Genre, QueueEntry, Song, SongRequest, User } from './entities';
import { QueueController, QueueService } from './queue';
import { RequestsController, RequestsService } from './requests';
import { UsersController, UsersService } from './users';

@Module({
  imports: [
    TypeOrmModule.forRoot({ ...databaseOptions, retryAttempts: 1 }),
    TypeOrmModule.forFeature([User, Genre, Song, SongRequest, QueueEntry]),
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
          throw new Error('Set JWT_SECRET to at least 32 bytes in .env');
        }
        return { secret, signOptions: { algorithm: 'HS256', expiresIn: '1h' } };
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 150 }]),
  ],
  controllers: [AuthController, UsersController, GenresController, SongsController, RequestsController, QueueController],
  providers: [
    AuthService, UsersService, CatalogService, RequestsService, QueueService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}

