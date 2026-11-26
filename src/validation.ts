import { ArgumentMetadata, BadRequestException, PipeTransform } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum, IsInt, IsNotEmpty, IsString, Length, Matches, Max, MaxLength, Min, ValidateIf,
} from 'class-validator';
import { QueueStatus, RequestStatus, Role } from './entities';

export const MAX_ID = 2147483647;
const Trim = () => Transform(({ value }) => typeof value === 'string' ? value.trim() : value);
const WhenProvided = () => ValidateIf((_object, value) => value !== undefined);

export class IdPipe implements PipeTransform {
  transform(value: string, metadata: ArgumentMetadata) {
    if (!/^[1-9]\d*$/.test(value) || Number(value) > MAX_ID) {
      throw new BadRequestException(`${metadata.data ?? 'id'} must be a positive integer`);
    }
    return Number(value);
  }
}

export class ProfileDto {
  @Trim()
  @IsString()
  @Length(1, 100)
  fullName: string;

  @Trim()
  @IsString()
  @Matches(/^[a-zA-Z0-9_.-]{1,50}$/)
  username: string;
}

export class LoginDto {
  @Trim()
  @IsString()
  @Matches(/^[a-zA-Z0-9_.-]{1,50}$/)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password: string;
}

export class RegisterDto extends ProfileDto {
  @IsString()
  @Length(8, 72)
  password: string;

  @WhenProvided()
  @Matches(/^singer$/)
  role?: Role.Singer;
}

export class UpdateUserDto extends ProfileDto {
  @WhenProvided()
  @IsEnum(Role)
  role?: Role;
}

export class UsersQuery {
  @WhenProvided()
  @IsEnum(Role)
  role?: Role;

  @WhenProvided()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_ID)
  page?: number;
}

export class GenreDto {
  @Trim()
  @IsString()
  @Length(1, 50)
  genreName: string;
}

export class SongDto {
  @Trim()
  @IsString()
  @Length(1, 150)
  title: string;

  @Trim()
  @IsString()
  @Length(1, 100)
  artist: string;

  @IsInt()
  @Min(1)
  @Max(MAX_ID)
  genreId: number;

  @Trim()
  @IsString()
  @Length(1, 255)
  filePath: string;
}

export class UpdateSongDto {
  @WhenProvided()
  @Trim()
  @IsString()
  @Length(1, 150)
  title?: string;

  @WhenProvided()
  @Trim()
  @IsString()
  @Length(1, 100)
  artist?: string;

  @WhenProvided()
  @IsInt()
  @Min(1)
  @Max(MAX_ID)
  genreId?: number;

  @WhenProvided()
  @Trim()
  @IsString()
  @Length(1, 255)
  filePath?: string;
}

export class SongsQuery {
  @WhenProvided()
  @Trim()
  @IsString()
  @Length(1, 150)
  search?: string;

  @WhenProvided()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_ID)
  genreId?: number;

  @WhenProvided()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_ID)
  page?: number;
}

export class CreateRequestDto {
  @IsInt()
  @Min(1)
  @Max(MAX_ID)
  songId: number;
}

export class RequestStatusDto {
  @IsEnum(RequestStatus)
  status: RequestStatus;
}

export class CreateQueueDto {
  @IsInt()
  @Min(1)
  @Max(MAX_ID)
  requestId: number;

  @IsInt()
  @Min(1)
  @Max(MAX_ID)
  queuePosition: number;
}

export class UpdateQueueDto {
  @WhenProvided()
  @IsInt()
  @Min(1)
  @Max(MAX_ID)
  queuePosition?: number;

  @WhenProvided()
  @IsEnum(QueueStatus)
  queueStatus?: QueueStatus;
}

