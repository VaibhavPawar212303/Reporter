import { pgTable, serial, text, timestamp, integer, jsonb, unique,uniqueIndex} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const automationBuilds = pgTable('automation_builds', {
  id: serial('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  status: text('status').default('running').notNull(),
  environment: text('environment').default('dev'),
});

export const testResults = pgTable('test_results', {
  id: serial('id').primaryKey(),
  buildId: integer('build_id').references(() => automationBuilds.id, { onDelete: 'cascade' }),
  specFile: text('spec_file').notNull(),
  tests: jsonb('tests').default([]).notNull(), // Stores array of test objects
  executedAt: timestamp('executed_at').defaultNow().notNull(),
}, (table) => ({
  // CONCURRENCY CONTROL: Prevents race conditions during parallel execution
  buildSpecUnique: unique().on(table.buildId, table.specFile),
}));

export const testCases = pgTable('test_cases', {
  id: serial('id').primaryKey(),
  caseCode: text('case_code').notNull().unique(), // e.g., TC5073
  caseKey: text('case_key'), 
  moduleName: text('module_name'),                // e.g., Login
  testSuite: text('test_suite'),
  tags: text('tags'),
  title: text('title').notNull(),
  description: text('description'),
  precondition: text('precondition'),
  steps: text('steps'),                           // Multi-line
  expectedResult: text('expected_result'),        // Multi-line
  type: text('type'),                             // regression, etc.
  priority: text('priority').default('medium'), 
  mode: text('mode'),                             // Automation vs Manual
  loggedUser: text('logged_user'),
  shareableLink: text('shareable_link'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});


export const buildsRelations = relations(automationBuilds, ({ many }) => ({
  results: many(testResults),
}));

export const resultsRelations = relations(testResults, ({ one }) => ({
  build: one(automationBuilds, {
    fields: [testResults.buildId],
    references: [automationBuilds.id],
  }),
}));