# KaraokeSing

Karaoke music and queue management backend for ITEC 116. Singers browse the song library and submit requests. Staff and administrators manage the catalog and process requests. Postman communicates with NestJS controllers, services and TypeORM repositories backed by a local MySQL database.

## Run locally

Prerequisites are Node.js 22 or newer, npm, and a local MySQL server. The SQL and MySQL driver can also be used with XAMPP's bundled MariaDB. Install the dependencies once with internet access.

```powershell
cd C:/xampp/htdocs/karaoke
npm.cmd ci
Copy-Item local-config.example .env
node -p "require('node:crypto').randomBytes(48).toString('base64url')"
```

Paste the generated value after `JWT_SECRET=` in `.env`. Set the database username, password and port for your local server. Start that database server. Import [database/karaokesing.sql](database/karaokesing.sql) once. With the MySQL client on PATH, run the following command and enter your local MySQL password if prompted. In XAMPP, use `C:/xampp/mysql/bin/mysql.exe` for `mysql.exe`. For a local database account with a blank password, omit `-p`.

```powershell
mysql.exe -h 127.0.0.1 -P 3306 -u root -p -e "source C:/xampp/htdocs/karaoke/database/karaokesing.sql"
npm.cmd run start:dev
```

The default API base URL is `http://127.0.0.1:3000/api/v1`. The SQL export contains all five tables and foreign keys. The application leaves schema synchronization off, so normal startup preserves the imported schema and stored data. Registration, login, CRUD and the local Postman Collection Runner work without internet after installation. Import the collection into Postman Desktop before going offline.

### Isolated workspace database

This Windows workspace has a separate MySQL 8.0 data directory at `local-mysql-data` on port 3309. Its schema is already imported. Keep the supplied local `.env` on this computer. If the database is stopped, run the following command in a separate terminal before starting the API. The normal XAMPP databases use their existing data directory and ports.

```powershell
& "C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqld.exe" --no-defaults --datadir=C:\xampp\htdocs\karaoke\local-mysql-data --port=3309 --bind-address=127.0.0.1 --mysqlx=OFF --innodb-undo-directory=C:\xampp\htdocs\karaoke\local-mysql-data --innodb-directories=C:\xampp\htdocs\karaoke\local-mysql-data --console
```

On a fresh checkout, use the standard MySQL import above. The project’s database data directory and local credentials are excluded from Git.

### Local accounts

Register each account with `POST /api/v1/users` using `fullName`, `username` and a local `password`. Public registration always makes a singer. After `npm run build`, provision two registered accounts from the project folder for the demo.

```powershell
npm.cmd run provision -- karaoke_admin admin
npm.cmd run provision -- karaoke_staff staff
```

Use the usernames you actually registered. `POST /api/v1/auth/login` takes `username` and `password` and returns `accessToken`, `tokenType`, `expiresIn` and `user`. Use the token as `Authorization: Bearer <accessToken>` on protected requests. The JWT expires in one hour. The server uses the account's current role from the database on every protected request. Successful login, role changes through the API, and queue mutations appear in terminal audit logs. Login is limited to eight requests per minute per client. Passwords use bcrypt and never appear in API responses.

The server binds to loopback. For local HTTPS, set `TLS_KEY_PATH` and `TLS_CERT_PATH` to local PEM files, and switch the Postman base URL to `https`. Keep credentials, signing keys and tokens in local configuration.

## API and permissions

All routes below start with `/api/v1`. Operator means staff or admin.

| Method | Route | Access | Body or query | Success |
|---|---|---|---|---|
| POST | /auth/login | Public | username, password | 200 |
| GET | /users | Operator | Optional role, page | 200 |
| GET | /users/:id | Owner or operator | | 200 |
| POST | /users | Public | fullName, username, password, optional role=singer | 201 |
| PUT | /users/:id | Owner or admin | fullName, username, optional role for admin | 200 |
| DELETE | /users/:id | Admin | | 204 |
| GET | /songs | Public | Optional search, genreId, page | 200 |
| GET | /songs/:id | Public | | 200 |
| POST | /songs | Operator | title, artist, genreId, filePath | 201 |
| PATCH | /songs/:id | Operator | Any subset of the song fields | 200 |
| DELETE | /songs/:id | Admin | | 204 |
| GET | /genres | Public | | 200 |
| POST | /genres | Operator | genreName | 201 |
| PATCH | /genres/:id | Operator | genreName | 200 |
| DELETE | /genres/:id | Admin | | 204 |
| GET | /song-requests | Operator | | 200 |
| POST | /song-requests | Any signed-in user | songId | 201 |
| PATCH | /song-requests/:id | Operator | status | 200 |
| DELETE | /song-requests/:id | Owner or operator | | 204 |
| GET | /queue | Public | | 200 |
| POST | /queue | Operator | requestId, queuePosition | 201 |
| PATCH | /queue/:id | Operator | queuePosition and/or queueStatus | 200 |
| DELETE | /queue/:id | Operator | | 204 |

The list routes return arrays. A `page` parameter selects 20 rows. Song `search` matches a substring of title or artist and can be combined with `genreId`. `PUT` requires both profile fields. Omit `role` to keep the account's current access. `PATCH` preserves omitted fields. Validation returns 400. Missing, invalid or expired tokens return 401, insufficient access returns 403, missing resources return 404, and duplicate keys or conflicting references return 409. Error bodies contain `success: false`, `statusCode`, `message`, `errors` and `timestamp`.

## Lab decisions

- Lab 3 describes the broader karaoke concept, including scoring, singing history and analytics. The backend covers the concrete catalog, user, request and queue designs from Labs 4–6. The song's `filePath` stores local media metadata. The queue retains a completed row until staff removes it.
- Lab 4's sketch gives each song one genre and each request one user and one song. The data dictionary marks queue `requestId` unique, so a request may have one queue row. Each dependent record must be removed before its referenced row can be deleted. Genre name comes from the ERD and data dictionary.
- Lab 5's detailed route list takes precedence over the inconsistent draft names in Part B. Lab 6 supplies the login endpoint and restricts public registrations to singers. The saved role strings are `singer`, `staff` and `admin`. Administrators can assign roles to other accounts using the existing user PUT route. An administrator can update their own profile, while self-deletion and self-demotion return 409.
- New requests start `pending`. Operators can set `approved` or `rejected`. Queue insertion requires an approved request and starts the queue row `waiting`. Staff can set `playing` or `completed`. The public queue shows waiting and playing entries ordered by position, then by ID for equal positions. Cancel via DELETE after the corresponding queue row has been removed.

## Postman

Import [the KaraokeSing collection](postman/KaraokeSing.postman_collection.json). In a local environment, add `adminUsername`, `adminPassword`, `staffUsername` and `staffPassword` from your provisioned accounts. Select the environment and run the full collection in order. The collection creates temporary singers, a genre, a song, a request and a queue entry. It captures returned IDs and tokens and removes the demo records at the end. Keep the original collection file for submission.

For a terminal run, use the same Postman environment as a private, untracked `.env.postman.json` export, or run using Postman Desktop. Newman prints results to the terminal.

```powershell
npm.cmd run test:api -- -e .env.postman.json
```

For the code walkthrough, open [catalog.ts](src/catalog.ts) and follow `POST /songs`. The auth guard checks JWT and role. `SongDto` validates the body. `SongsController.create` hands it to `CatalogService.createSong`, which looks up the genre and saves the song via the TypeORM repository. MySQL assigns `songId` and the saved song returns through the controller with HTTP 201. [entities.ts](src/entities.ts) maps the fields and relationships to the SQL tables.

The submission handout also calls for the technical PDF, a repository link, and a 5–10 minute video with the student's narration. For the video, show backend startup, login, song CRUD in Postman, the controller-to-database walkthrough, a protected request returning 401, and the database rows.

