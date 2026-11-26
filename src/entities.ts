import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany,
  OneToOne, PrimaryGeneratedColumn, Relation,
} from 'typeorm';

export enum Role {
  Singer = 'singer',
  Staff = 'staff',
  Admin = 'admin',
}

export enum RequestStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

export enum QueueStatus {
  Waiting = 'waiting',
  Playing = 'playing',
  Completed = 'completed',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  userId: number;

  @Column({ length: 100 })
  fullName: string;

  @Column({ length: 50, unique: true })
  username: string;

  @Column({ length: 255, select: false })
  password: string;

  @Column({ type: 'varchar', length: 20, default: Role.Singer })
  role: Role;

  @OneToMany(() => SongRequest, (request) => request.user)
  requests: SongRequest[];
}

@Entity('genres')
export class Genre {
  @PrimaryGeneratedColumn()
  genreId: number;

  @Column({ length: 50, unique: true })
  genreName: string;

  @OneToMany(() => Song, (song) => song.genre)
  songs: Song[];
}

@Entity('songs')
export class Song {
  @PrimaryGeneratedColumn()
  songId: number;

  @Column({ length: 150 })
  title: string;

  @Column({ length: 100 })
  artist: string;

  @Column()
  genreId: number;

  @Column({ length: 255 })
  filePath: string;

  @ManyToOne(() => Genre, (genre) => genre.songs, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'genreId' })
  genre: Genre;

  @OneToMany(() => SongRequest, (request) => request.song)
  requests: SongRequest[];
}

@Entity('song_requests')
export class SongRequest {
  @PrimaryGeneratedColumn()
  requestId: number;

  @Column()
  userId: number;

  @Column()
  songId: number;

  @CreateDateColumn({ type: 'datetime', precision: 0 })
  requestDate: Date;

  @Column({ type: 'varchar', length: 20, default: RequestStatus.Pending })
  status: RequestStatus;

  @ManyToOne(() => User, (user) => user.requests, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Song, (song) => song.requests, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'songId' })
  song: Song;

  @OneToOne(() => QueueEntry, (entry) => entry.request)
  queueEntry: Relation<QueueEntry>;
}

@Entity('queue')
export class QueueEntry {
  @PrimaryGeneratedColumn()
  queueId: number;

  @Column()
  requestId: number;

  @Column()
  queuePosition: number;

  @Column({ type: 'varchar', length: 20, default: QueueStatus.Waiting })
  queueStatus: QueueStatus;

  @OneToOne(() => SongRequest, (request) => request.queueEntry, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requestId' })
  request: SongRequest;
}


