"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchmakingQueue = exports.matches = exports.matchResultEnum = exports.matchStatusEnum = exports.tournamentParticipants = exports.tournaments = exports.users = exports.tournamentStatusEnum = exports.userRoleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.userRoleEnum = (0, pg_core_1.pgEnum)('user_role', ['coach', 'student']);
exports.tournamentStatusEnum = (0, pg_core_1.pgEnum)('tournament_status', [
    'draft',
    'open',
    'ongoing',
    'completed',
]);
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    passwordHash: (0, pg_core_1.varchar)('password_hash', { length: 255 }).notNull(),
    role: (0, exports.userRoleEnum)('role').notNull().default('student'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.tournaments = (0, pg_core_1.pgTable)('tournaments', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 150 }).notNull(),
    timeControl: (0, pg_core_1.varchar)('time_control', { length: 20 }).notNull(),
    startAt: (0, pg_core_1.timestamp)('start_at', {
        withTimezone: true,
    }).notNull(),
    status: (0, exports.tournamentStatusEnum)('status').notNull().default('draft'),
    createdBy: (0, pg_core_1.integer)('created_by')
        .notNull()
        .references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.tournamentParticipants = (0, pg_core_1.pgTable)('tournament_participants', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tournamentId: (0, pg_core_1.integer)('tournament_id')
        .notNull()
        .references(() => exports.tournaments.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.integer)('user_id')
        .notNull()
        .references(() => exports.users.id, { onDelete: 'cascade' }),
    joinedAt: (0, pg_core_1.timestamp)('joined_at').defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.unique)('tournament_participant_unique').on(table.tournamentId, table.userId),
]);
exports.matchStatusEnum = (0, pg_core_1.pgEnum)('match_status', ['ongoing', 'completed']);
exports.matchResultEnum = (0, pg_core_1.pgEnum)('match_result', [
    'white_win',
    'black_win',
    'draw',
]);
exports.matches = (0, pg_core_1.pgTable)('matches', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    drawOfferedBy: (0, pg_core_1.integer)('draw_offered_by'),
    whiteTimeMs: (0, pg_core_1.integer)('white_time_ms').notNull().default(300000),
    blackTimeMs: (0, pg_core_1.integer)('black_time_ms').notNull().default(300000),
    turnStartedAt: (0, pg_core_1.timestamp)('turn_started_at'),
    tournamentId: (0, pg_core_1.integer)('tournament_id')
        .notNull()
        .references(() => exports.tournaments.id, { onDelete: 'cascade' }),
    whitePlayerId: (0, pg_core_1.integer)('white_player_id')
        .notNull()
        .references(() => exports.users.id),
    blackPlayerId: (0, pg_core_1.integer)('black_player_id')
        .notNull()
        .references(() => exports.users.id),
    status: (0, exports.matchStatusEnum)('status').notNull().default('ongoing'),
    result: (0, exports.matchResultEnum)('result'),
    fen: (0, pg_core_1.text)('fen').notNull().default('start'),
    pgn: (0, pg_core_1.text)('pgn'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    endedAt: (0, pg_core_1.timestamp)('ended_at'),
});
exports.matchmakingQueue = (0, pg_core_1.pgTable)('matchmaking_queue', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tournamentId: (0, pg_core_1.integer)('tournament_id')
        .notNull()
        .references(() => exports.tournaments.id, { onDelete: 'cascade' }),
    studentId: (0, pg_core_1.integer)('student_id')
        .notNull()
        .references(() => exports.users.id, { onDelete: 'cascade' }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('matchmaking_queue_tournament_student_unique').on(table.tournamentId, table.studentId),
]);
//# sourceMappingURL=schema.js.map