import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, Injectable, NotFoundException,
  Param, Patch, Post, Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Operators, Public, Roles } from './auth';
import { Genre, Role, Song } from './entities';
import { GenreDto, IdPipe, SongDto, SongsQuery, UpdateSongDto } from './validation';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Song) private readonly songs: Repository<Song>,
    @InjectRepository(Genre) private readonly genres: Repository<Genre>,
  ) {}

  listSongs({ search, genreId, page }: SongsQuery) {
    const query = this.songs.createQueryBuilder('song').orderBy('song.songId', 'ASC');
    if (search) {
      query.andWhere('(LOCATE(:search, song.title) > 0 OR LOCATE(:search, song.artist) > 0)', { search });
    }
    if (genreId !== undefined) query.andWhere('song.genreId = :genreId', { genreId });
    if (page !== undefined) query.skip((page - 1) * 20).take(20);
    return query.getMany();
  }

  async getSong(songId: number) {
    const song = await this.songs.findOneBy({ songId });
    if (!song) throw new NotFoundException('Song not found');
    return song;
  }

  async createSong(dto: SongDto) {
    await this.getGenre(dto.genreId);
    return this.songs.save(this.songs.create(dto));
  }

  async updateSong(songId: number, dto: UpdateSongDto) {
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException('Provide at least one song field');
    }
    await this.getSong(songId);
    if (dto.genreId !== undefined) await this.getGenre(dto.genreId);
    await this.songs.update(songId, dto);
    return this.getSong(songId);
  }

  async removeSong(songId: number) {
    const result = await this.songs.delete(songId);
    if (!result.affected) throw new NotFoundException('Song not found');
  }

  listGenres() {
    return this.genres.find({ order: { genreId: 'ASC' } });
  }

  createGenre(dto: GenreDto) {
    return this.genres.save(this.genres.create(dto));
  }

  private async getGenre(genreId: number) {
    const genre = await this.genres.findOneBy({ genreId });
    if (!genre) throw new NotFoundException('Genre not found');
    return genre;
  }

  async renameGenre(genreId: number, dto: GenreDto) {
    await this.getGenre(genreId);
    await this.genres.update(genreId, dto);
    return this.getGenre(genreId);
  }

  async removeGenre(genreId: number) {
    const result = await this.genres.delete(genreId);
    if (!result.affected) throw new NotFoundException('Genre not found');
  }
}

@Controller('songs')
export class SongsController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Get()
  list(@Query() query: SongsQuery) {
    return this.catalog.listSongs(query);
  }

  @Public()
  @Get(':id')
  get(@Param('id', IdPipe) id: number) {
    return this.catalog.getSong(id);
  }

  @Operators()
  @Post()
  create(@Body() dto: SongDto) {
    return this.catalog.createSong(dto);
  }

  @Operators()
  @Patch(':id')
  update(@Param('id', IdPipe) id: number, @Body() dto: UpdateSongDto) {
    return this.catalog.updateSong(id, dto);
  }

  @Roles(Role.Admin)
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', IdPipe) id: number) {
    return this.catalog.removeSong(id);
  }
}

@Controller('genres')
export class GenresController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Get()
  list() {
    return this.catalog.listGenres();
  }

  @Operators()
  @Post()
  create(@Body() dto: GenreDto) {
    return this.catalog.createGenre(dto);
  }

  @Operators()
  @Patch(':id')
  rename(@Param('id', IdPipe) id: number, @Body() dto: GenreDto) {
    return this.catalog.renameGenre(id, dto);
  }

  @Roles(Role.Admin)
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', IdPipe) id: number) {
    return this.catalog.removeGenre(id);
  }
}

