import {
  pgTable,
  serial,
  varchar,
  timestamp,
  pgEnum,
  integer,
  unique,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// User roles
export const userRoleEnum = pgEnum('user_role', ['coach', 'student']);

// Tournament status
export const tournamentStatusEnum = pgEnum('tournament_status', [
  'draft',
  'open',
  'ongoing',
  'completed',
]);

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('student'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tournaments table
export const tournaments = pgTable('tournaments', {
  id: serial('id').primaryKey(),

  name: varchar('name', { length: 150 }).notNull(),

  // Example: 5+0 means 5 minutes, no increment
  timeControl: varchar('time_control', { length: 20 }).notNull(),

  startAt: timestamp('start_at', {
    withTimezone: true,
  }).notNull(),

  status: tournamentStatusEnum('status').notNull().default('draft'),

  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tournament participants
export const tournamentParticipants = pgTable(
  'tournament_participants',
  {
    id: serial('id').primaryKey(),

    tournamentId: integer('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),

    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => [
    unique('tournament_participant_unique').on(
      table.tournamentId,
      table.userId,
    ),
  ],
);

// Matching table
// Match status
export const matchStatusEnum = pgEnum('match_status', ['ongoing', 'completed']);

// Match result
export const matchResultEnum = pgEnum('match_result', [
  'white_win',
  'black_win',
  'draw',
]);

// Chess matches
export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),

  tournamentId: integer('tournament_id')
    .notNull()
    .references(() => tournaments.id, { onDelete: 'cascade' }),

  whitePlayerId: integer('white_player_id')
    .notNull()
    .references(() => users.id),

  blackPlayerId: integer('black_player_id')
    .notNull()
    .references(() => users.id),

  status: matchStatusEnum('status').notNull().default('ongoing'),

  result: matchResultEnum('result'),

  // Initial chess position
  fen: text('fen').notNull().default('start'),

  // Persisted move history
  pgn: text('pgn'),

  createdAt: timestamp('created_at').defaultNow().notNull(),

  endedAt: timestamp('ended_at'),
});

// Waiting players
export const matchmakingQueue = pgTable(
  'matchmaking_queue',
  {
    id: serial('id').primaryKey(),

    tournamentId: integer('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),

    studentId: integer('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('matchmaking_queue_tournament_student_unique').on(
      table.tournamentId,
      table.studentId,
    ),
  ],
);
