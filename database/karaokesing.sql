-- KaraokeSing schema export. Accounts and demo records are created locally.
CREATE DATABASE IF NOT EXISTS karaokesing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE karaokesing;

CREATE TABLE IF NOT EXISTS users (
  userId INT NOT NULL AUTO_INCREMENT,
  fullName VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'singer',
  PRIMARY KEY (userId),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS genres (
  genreId INT NOT NULL AUTO_INCREMENT,
  genreName VARCHAR(50) NOT NULL,
  PRIMARY KEY (genreId),
  UNIQUE KEY uq_genres_name (genreName)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS songs (
  songId INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(150) NOT NULL,
  artist VARCHAR(100) NOT NULL,
  genreId INT NOT NULL,
  filePath VARCHAR(255) NOT NULL,
  PRIMARY KEY (songId),
  CONSTRAINT fk_songs_genre FOREIGN KEY (genreId) REFERENCES genres (genreId) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS song_requests (
  requestId INT NOT NULL AUTO_INCREMENT,
  userId INT NOT NULL,
  songId INT NOT NULL,
  requestDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  PRIMARY KEY (requestId),
  CONSTRAINT fk_requests_user FOREIGN KEY (userId) REFERENCES users (userId) ON DELETE RESTRICT,
  CONSTRAINT fk_requests_song FOREIGN KEY (songId) REFERENCES songs (songId) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS queue (
  queueId INT NOT NULL AUTO_INCREMENT,
  requestId INT NOT NULL,
  queuePosition INT NOT NULL,
  queueStatus VARCHAR(20) NOT NULL DEFAULT 'waiting',
  PRIMARY KEY (queueId),
  UNIQUE KEY uq_queue_request (requestId),
  CONSTRAINT fk_queue_request FOREIGN KEY (requestId) REFERENCES song_requests (requestId) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


