# Kingdom of Chess — Backend API

A NestJS backend for managing chess tournaments, student registration, automatic opponent matching, live chess matches, and tournament leaderboards.

## Table of contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Environment variables](#environment-variables)
- [Local setup](#local-setup)
- [Database and migrations](#database-and-migrations)
- [Run the API](#run-the-api)
- [API documentation](#api-documentation)
- [REST API endpoints](#rest-api-endpoints)
- [Authentication and authorization](#authentication-and-authorization)
- [Real-time Socket.IO events](#real-time-socketio-events)
- [Typical local testing flow](#typical-local-testing-flow)
- [Leaderboard rules](#leaderboard-rules)
- [Validation and error handling](#validation-and-error-handling)
- [Tests](#tests)
- [Implementation notes and limitations](#implementation-notes-and-limitations)

## Features

- Email/password registration and login.
- JWT authentication stored in an `HttpOnly` cookie named `access_token`.
- Coach/student roles and protected endpoints.
- Tournament creation, updates, status changes, student joining, and tournament statistics.
- FIFO matchmaking queue for students who have joined a tournament.
- Server-side chess move validation using `chess.js`.
- Persisted FEN and PGN move history.
- Match history, resignation, and draw offers/acceptance.
- Tournament leaderboard based on completed match results.
- Health endpoint that checks PostgreSQL connectivity.
- Swagger UI for exploring the REST API.

## Technology stack

- **Backend:** NestJS, TypeScript
- **Database:** PostgreSQL
- **Database access:** Drizzle ORM (`drizzle-orm/node-postgres`)
- **Authentication:** Passport JWT, `@nestjs/jwt`, `bcrypt`
- **Validation:** `class-validator`, NestJS `ValidationPipe`
- **Chess rules and PGN:** `chess.js`
- **Real-time communication:** Socket.IO through a NestJS WebSocket gateway
- **API documentation:** Swagger / `@nestjs/swagger`

## Architecture

The backend is organized into feature modules:

| Module / directory | Responsibility |
| --- | --- |
| `src/auth/` | Registration, login, logout, current-user profile, JWT strategy, and role guards |
| `src/db/` | PostgreSQL connection provider and Drizzle schema |
| `src/tournaments/` | Tournament CRUD, status, joining, and tournament statistics |
| `src/matchmaking/` | Queue management and FIFO opponent matching |
| `src/matches/` | Match access, legal moves, results, history, resignation, draw offers, and Socket.IO gateway |
| `src/leaderboard/` | Calculates rankings and points from completed matches |
| `src/health.controller.ts` | API and database health check |
| `src/main.ts` | CORS, cookies, request validation, Swagger, and server startup |

### Database tables

The Drizzle schema defines these tables:

- `users` — name, email, password hash, role, creation timestamp.
- `tournaments` — name, time control, start date/time, status, creator.
- `tournament_participants` — student registrations per tournament; a student can join a tournament only once.
- `matches` — players, tournament, FEN, PGN, status, result, clocks, draw offer, timestamps.
- `matchmaking_queue` — waiting students per tournament; a unique index prevents duplicate queue entries for the same student/tournament.

Tournament statuses: `draft`, `open`, `ongoing`, `completed`.

Match statuses: `ongoing`, `completed`.

Match results: `white_win`, `black_win`, `draw`.

## Prerequisites

Install the following before running the backend:

- Node.js (use a version compatible with the repository's package configuration).
- npm.
- PostgreSQL, either locally or through a hosted PostgreSQL provider.
- The repository's dependencies installed with `npm install`.

## Environment variables

Create a `.env` file in the backend application's working directory. Do not commit real secrets.

```dotenv
PORT=3001
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/kingdom_of_chess
JWT_SECRET=replace_with_a_long_random_secret
NODE_ENV=development
```

- `PORT` — API port; defaults to `3001` when not set.
- `DATABASE_URL` — PostgreSQL connection string. The application fails to start if this is missing.
- `JWT_SECRET` — secret used to sign and verify JWTs. The application fails to initialize authentication if this is missing.
- `NODE_ENV` — controls whether the auth cookie uses the `Secure` flag (`production` enables it).

The API's current CORS configuration allows `https://kingdom-chess-project.netlify.app/` and credentials. If your frontend runs on another origin, update the backend CORS and Socket.IO CORS configuration accordingly.

## Local setup

> Run these commands from the backend package directory (the directory containing its `package.json`). If this repository is a monorepo, first `cd` into the API workspace, for example `cd apps/api`.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a PostgreSQL database named `kingdom_of_chess` (or update `DATABASE_URL` to use an existing database).

3. Add the environment variables listed above to `.env`.

4. Generate and apply the Drizzle migrations using the scripts/configuration already present in the repository. See [Database and migrations](#database-and-migrations).

5. Start the API using the development script defined in `package.json`. A standard NestJS project commonly uses:

   ```bash
   npm run start:dev
   ```

   If this script is not present in the API package, use the equivalent script listed by `npm run`.

## Database and migrations

The database schema is defined in `src/db/schema.ts` and connected through `src/db/database.module.ts`.

This source snapshot does not include the project's `package.json`, Drizzle Kit configuration, migration files, or seed script, so exact migration/seed commands and demo credentials cannot be confirmed from the supplied backend source. Check the API package scripts and repository files before running migration commands. If Drizzle Kit is configured, projects commonly define scripts similar to:

```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate"
}
```

Use the project's actual scripts rather than copying these examples blindly. Ensure the database schema/migrations are applied before testing API endpoints.

### Coach account

The registration endpoint creates accounts with the `student` role. The supplied source does not show a seed script or a public coach-registration endpoint. To test coach-only operations, create a coach account through the project's approved seed/admin process; do not promote a user by exposing a public role field during registration.

## Run the API

From the API package directory:

```bash
npm run start:dev
```

The default API base URL is `http://localhost:3001`.

Useful URLs:

- Health check: `http://localhost:3001/api/v1/health`
- Swagger UI: `http://localhost:3001/api/docs`

## API documentation

Swagger is configured in `src/main.ts` with the title **Kingdom of Chess API**, version `1.0`, and cookie authentication documentation. Open `/api/docs` while the server is running to inspect and try the endpoints.

## REST API endpoints

All REST endpoints use the `/api/v1` prefix in their controller paths.

### Health

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/health` | Public | Checks API and PostgreSQL connectivity |
| `GET` | `/hello` | Public | Basic application greeting |

### Authentication

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Public | Registers a student account |
| `POST` | `/api/v1/auth/login` | Public | Verifies credentials and sets the `access_token` cookie |
| `POST` | `/api/v1/auth/logout` | Public | Clears the auth cookie |
| `GET` | `/api/v1/auth/me` | Logged-in user | Returns the current user's profile |

Registration JSON example:

```json
{
  "name": "Student One",
  "email": "student1@example.com",
  "password": "change-this-password"
}
```

Login JSON example:

```json
{
  "email": "student1@example.com",
  "password": "change-this-password"
}
```

### Tournaments

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/tournaments` | Public | Lists tournaments |
| `GET` | `/api/v1/tournaments/:id` | Public | Gets one tournament |
| `POST` | `/api/v1/tournaments` | Coach | Creates a tournament |
| `PATCH` | `/api/v1/tournaments/:id` | Coach | Updates a tournament owned by the coach |
| `DELETE` | `/api/v1/tournaments/:id` | Coach | Deletes a tournament owned by the coach |
| `PATCH` | `/api/v1/tournaments/:id/status` | Coach | Changes tournament status |
| `POST` | `/api/v1/tournaments/:id/join` | Student | Joins an open tournament |
| `GET` | `/api/v1/tournaments/:id/stats` | Public | Returns participant and match counts |
| `POST` | `/api/v1/tournaments/:id/find-opponent` | Student | Joins matchmaking or returns a matched game |

Tournament status values are `draft`, `open`, `ongoing`, and `completed`. Students can join tournaments only while the status is `open`. A completed tournament cannot be reopened by the status-update service.

### Matches

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/matches/history` | Logged-in participant | Lists the current user's match history |
| `GET` | `/api/v1/matches/:id` | Match participant | Returns match details |
| `POST` | `/api/v1/matches/:id/resign` | Match participant | Resigns from an ongoing match |
| `POST` | `/api/v1/matches/:id/draw` | Match participant | Offers a draw |
| `POST` | `/api/v1/matches/:id/draw/accept` | Other match participant | Accepts an outstanding draw offer |

The Socket.IO gateway handles joining a match room and submitting moves. The service checks that the requesting user is a player in the match, verifies whose turn it is, and validates the move with `chess.js`.

### Leaderboard

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/leaderboard?tournamentId=1` | Public | Returns rankings for a tournament |

The current controller returns an empty `data` array with a message if `tournamentId` is omitted. Provide a valid tournament ID to get the tournament and its leaderboard.

## Authentication and authorization

1. A user registers with name, email, and password. Registration normalizes the email and hashes the password using `bcrypt`.
2. Login verifies the password hash and signs a JWT containing the user ID (`sub`), email, and role.
3. The JWT is stored in an `HttpOnly` cookie called `access_token`, with a one-day maximum age.
4. `JwtAuthGuard` protects routes that require authentication. `RolesGuard` and the `@Roles(...)` decorator restrict selected endpoints to coaches or students.
5. Socket.IO connections read and verify the same cookie. A user must be authenticated and be a participant in the match to join its room.

For browser requests, send credentials so the cookie is included. For example, with `fetch`:

```javascript
const response = await fetch('http://localhost:3001/api/v1/auth/me', {
  credentials: 'include'
});
```

Never put the JWT secret or real credentials in source control.

## Real-time Socket.IO events

Socket.IO runs on the same backend origin/port as the API.

| Event | Direction | Payload | Purpose |
| --- | --- | --- | --- |
| `join_match` | Client → Server | `{ "matchId": 123 }` | Authenticates match participation and joins the `match:<id>` room |
| `match_state` | Server → Client | `{ matchId, status, fen, pgn, whitePlayerId, blackPlayerId, result }` | Sends the persisted match state to the joining player |
| `make_move` | Client → Server | `{ "matchId": 123, "from": "e2", "to": "e4", "promotion": "q" }` | Requests a move; `promotion` is optional and supports `q`, `r`, `b`, or `n` |
| `move_made` | Server → Room | `{ matchId, move, fen, pgn }` | Broadcasts a successfully validated move and updated board state |
| `game_over` | Server → Room | `{ matchId, result, fen, pgn }` | Broadcasts the final game result when the move ends the game |

The client should emit `join_match` before attempting `make_move`. Invalid or unauthorized operations are reported as Socket.IO/NestJS WebSocket errors. The gateway authenticates the connection from the cookie and validates participation before allowing room membership.

## Typical local testing flow

1. Start PostgreSQL and apply the configured migrations.
2. Start the backend and check `/api/v1/health`.
3. Open `/api/docs` to inspect the available REST endpoints.
4. Register two separate student accounts using `/api/v1/auth/register`, or use existing student accounts.
5. Log in as each student in a separate browser profile/window so each browser has its own `access_token` cookie.
6. Log in as a coach account and create a tournament. Change its status to `open`.
7. In each student browser, join the same tournament using `POST /api/v1/tournaments/:id/join`.
8. Have the first student call `POST /api/v1/tournaments/:id/find-opponent`. They should be queued if no opponent is waiting.
9. Have the second student call the same endpoint. The backend should create a match and return its match information.
10. Open the match in each frontend/browser and connect to Socket.IO. Each client emits `join_match` with the returned `matchId`.
11. Play moves by emitting `make_move`. The server validates and broadcasts accepted moves.
12. Test resignation or draw offers, then inspect match history and the tournament leaderboard.

Exact UI navigation depends on the frontend application. The backend source supplied here does not include seed credentials, so use credentials configured in your local seed process or register student accounts yourself.

## Leaderboard rules

The service includes tournament participants and calculates statistics from completed matches in that tournament:

- Win: **1 point** for the winner and one loss for the opponent.
- Draw: **0.5 point** and one draw for each player.
- Loss: **0 points**.
- Ranking order: points descending, then wins descending, then player name alphabetically.

The leaderboard is recalculated from persisted completed matches when requested; it is not stored as a separate table.

## Validation and error handling

`main.ts` configures NestJS `ValidationPipe` with:

- `whitelist: true` — removes fields not declared by DTOs.
- `forbidNonWhitelisted: true` — rejects requests containing undeclared fields.
- `transform: true` — transforms incoming values where supported.

DTOs use `class-validator` decorators for fields such as email, name, and password. Services raise NestJS HTTP exceptions for common cases such as unauthorized access, forbidden access, invalid requests, missing records, and duplicate registration/joining.

## Tests

The repository includes Jest spec files for the application controller, tournaments, matchmaking, and matches. In the supplied source snapshot, most feature specs only check that a controller/service is defined; they do **not** yet demonstrate complete tests for leaderboard scoring, tournament join rules, or chess move/turn validation.

Run the test script configured in the API package. A standard NestJS project commonly uses:

```bash
npm test
```

Confirm the script exists in the repository's `package.json`.

## Implementation notes and limitations

- **Server-authoritative moves:** moves are validated on the server with `chess.js`; the server persists FEN/PGN and broadcasts the result.
- **Matchmaking:** currently selects the oldest waiting opponent (FIFO), not standings-based pairing.
- **Time controls:** the schema has white/black millisecond clock fields and a turn-start timestamp. However, the supplied `MatchesService` move path does not currently deduct elapsed time or finish a game on timeout. Treat the shared clock/timeout feature as incomplete until clock logic is implemented and tested.
- **Draw offers:** draw offers and acceptance are implemented through REST endpoints. The gateway source shown here does not broadcast dedicated draw-offer events.
- **Tournament winner:** leaderboard ranks are calculated, but automatic declaration of a winner when a tournament is marked completed is not shown in the supplied code.
- **Reconnection:** the gateway allows a player to reconnect and request the persisted match state again by emitting `join_match`. Clock restoration is not implemented in the shown service.
- **Concurrency:** matchmaking uses a database transaction and locks a candidate queue row, but simultaneous move submissions should be tested carefully before production use.
- **Tests:** add deterministic unit tests for scoring, join restrictions, and move/turn validation before considering the backend production-ready.

These notes describe the supplied source snapshot. Update this README if implementation details or scripts change.
