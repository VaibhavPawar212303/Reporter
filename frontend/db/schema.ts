import { mysqlTable, text, timestamp, int, json, varchar, uniqueIndex } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

/* -------------------- TABLES -------------------- */

// 1. PROJECTS (The Parent Registry)
export const projects = mysqlTable('projects', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // 'cypress' | 'playwright'
  environment: varchar('environment', { length: 50 }).default('production'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// 2. TEST CASES (Linked to Project)
export const testCases = mysqlTable('test_cases', {
  id: int('id').primaryKey().autoincrement(),
  projectId: int('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  caseCode: varchar('case_code', { length: 100 }).notNull().unique(),
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

// 3. AUTOMATION BUILDS (Linked to Project)
export const automationBuilds = mysqlTable('automation_builds', {
  id: int('id').primaryKey().autoincrement(),
  projectId: int('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  status: varchar('status', { length: 50 }).default('running').notNull(),
  environment: varchar('environment', { length: 50 }).default('dev'),
  type: varchar('type', { length: 50 }), 
});

// 4. TEST RESULTS (Linked to Build AND Project)
export const testResults = mysqlTable('test_results', {
  id: int('id').primaryKey().autoincrement(),
  
  // Link to specific Build
  buildId: int('build_id').references(() => automationBuilds.id, { onDelete: 'cascade' }),
  
  // Link directly to Project (for faster reporting)
  projectId: int('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  
  specFile: varchar('spec_file', { length: 512 }).notNull(), 
  tests: json('tests').notNull(), 
  executedAt: timestamp('executed_at').defaultNow().notNull(),
}, (table) => ({
  buildSpecUnique: uniqueIndex('build_spec_idx').on(table.buildId, table.specFile),
}));

/* -------------------- RELATIONS -------------------- */

// Projects Relations
export const projectsRelations = relations(projects, ({ many }) => ({
  testCases: many(testCases),
  builds: many(automationBuilds),
  results: many(testResults), // Projects can now look up results directly
}));

// TestCases Relations
export const testCasesRelations = relations(testCases, ({ one }) => ({
  project: one(projects, {
    fields: [testCases.projectId],
    references: [projects.id],
  }),
}));

// Builds Relations
export const buildsRelations = relations(automationBuilds, ({ one, many }) => ({
  project: one(projects, {
    fields: [automationBuilds.projectId],
    references: [projects.id],
  }),
  results: many(testResults),
}));

// Results Relations
export const resultsRelations = relations(testResults, ({ one }) => ({
  build: one(automationBuilds, {
    fields: [testResults.buildId],
    references: [automationBuilds.id],
  }),
  // Explicit relation to project
  project: one(projects, {
    fields: [testResults.projectId],
    references: [projects.id],
  }),
}));