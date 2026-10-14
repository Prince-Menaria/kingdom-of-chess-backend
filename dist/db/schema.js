"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tournamentParticipants = exports.tournaments = exports.users = exports.tournamentStatusEnum = exports.userRoleEnum = void 0;
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
//# sourceMappingURL=schema.js.map