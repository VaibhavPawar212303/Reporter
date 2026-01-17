import { 
  mysqlTable, 
  serial, 
  text, 
  timestamp, 
  int, 
  json, 
  varchar, 
  uniqueIndex 
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

export const automationBuilds = mysqlTable('automation_builds', {
  id: int('id').primaryKey().autoincrement(), // Explicit style
  createdAt: timestamp('created_at').defaultNow().notNull(),
  status: varchar('status', { length: 50 }).default('running').notNull(),
  environment: varchar('environment', { length: 50 }).default('dev'),
  type: varchar('type', { length: 50 }),
});

// Update testResults similarly
export const testResults = mysqlTable('test_results', {
  id: int('id').primaryKey().autoincrement(),
  buildId: int('build_id').references(() => automationBuilds.id, { onDelete: 'cascade' }),
  specFile: varchar('spec_file', { length: 512 }).notNull(), 
  tests: json('tests').notNull(), 
  executedAt: timestamp('executed_at').defaultNow().notNull(),
}, (table) => ({
  buildSpecUnique: uniqueIndex('build_spec_idx').on(table.buildId, table.specFile),
}));

export const testCases = mysqlTable('test_cases', {
  id: serial('id').primaryKey(),
  caseCode: varchar('case_code', { length: 100 }).notNull().unique(), // e.g., TC5073
  caseKey: varchar('case_key', { length: 100 }), 
  moduleName: varchar('module_name', { length: 100 }),
  testSuite: varchar('test_suite', { length: 100 }),
  tags: text('tags'),
  title: text('title').notNull(),
  description: text('description'),
  precondition: text('precondition'),
  steps: text('steps'),
  expectedResult: text('expected_result'),
  type: varchar('type', { length: 50 }),
  priority: varchar('priority', { length: 20 }).default('medium'), 
  mode: varchar('mode', { length: 50 }),
  loggedUser: varchar('logged_user', { length: 100 }),
  shareableLink: text('shareable_link'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Relations remain the same
export const buildsRelations = relations(automationBuilds, ({ many }) => ({
  results: many(testResults),
}));

export const resultsRelations = relations(testResults, ({ one }) => ({
  build: one(automationBuilds, {
    fields: [testResults.buildId],
    references: [automationBuilds.id],
  }),
}));