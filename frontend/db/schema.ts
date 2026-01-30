import { mysqlTable, text, timestamp, int, json, varchar, uniqueIndex, index } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

/* -------------------- CLERK INTEGRATION TABLES -------------------- */

// 1. USERS (Synced from Clerk via Webhooks)
export const users = mysqlTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(), // Clerk user ID (e.g., user_2abc123...)
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// 2. ORGANIZATIONS (Projects act as orgs, owned by users)
export const organizations = mysqlTable('organizations', {
  id: varchar('id', { length: 255 }).primaryKey(), // Can use Clerk org ID or generate your own
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  ownerId: varchar('owner_id', { length: 255 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// 3. ORGANIZATION MEMBERS (User <-> Org mapping with roles)
export const organizationMembers = mysqlTable('organization_members', {
  id: int('id').primaryKey().autoincrement(),
  organizationId: varchar('organization_id', { length: 255 })
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  userId: varchar('user_id', { length: 255 })
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  role: varchar('role', { length: 50 }).default('member').notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => ({
  // Use a regular index instead of unique index if causing issues
  orgUserUnique: uniqueIndex('org_user_unique_idx').on(table.organizationId, table.userId),
}));

/* -------------------- EXISTING TABLES (Updated with Org Link) -------------------- */

// 4. PROJECTS (Now linked to Organization)
export const projects = mysqlTable('projects', {
  id: int('id').primaryKey().autoincrement(),
  organizationId: varchar('organization_id', { length: 255 }).references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // 'cypress' | 'playwright'
  environment: varchar('environment', { length: 50 }).default('production'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index('project_org_idx').on(table.organizationId),
}));

// 5. TEST CASES (Linked to Project)
export const testCases = mysqlTable('test_cases', {
  id: int('id').primaryKey().autoincrement(),
  projectId: int('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  organizationId: varchar('organization_id', { length: 255 }).references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  caseCode: varchar('case_code', { length: 100 }).notNull(),
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
  createdById: varchar('created_by_id', { length: 255 }).references(() => users.id),
  shareableLink: text('shareable_link'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgCaseCodeUnique: uniqueIndex('org_case_code_idx').on(table.organizationId, table.caseCode),
  projectIdx: index('test_case_project_idx').on(table.projectId),
}));

// 6. AUTOMATION BUILDS (Linked to Project)
export const automationBuilds = mysqlTable('automation_builds', {
  id: int('id').primaryKey().autoincrement(),
  projectId: int('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  organizationId: varchar('organization_id', { length: 255 }).references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  triggeredById: varchar('triggered_by_id', { length: 255 }).references(() => users.id),
  // 🟢 Added: sessionId to support parallel execution handshakes
  sessionId: varchar('session_id', { length: 255 }), 
  createdAt: timestamp('created_at').defaultNow().notNull(),
  status: varchar('status', { length: 50 }).default('running').notNull(),
  environment: varchar('environment', { length: 50 }).default('dev'),
  type: varchar('type', { length: 50 }),
}, (table) => ({
  projectIdx: index('build_project_idx').on(table.projectId),
  orgIdx: index('build_org_idx').on(table.organizationId),
  // 🟢 Added: index for session_id to optimize parallel build lookups
  sessionIdx: index('build_session_idx').on(table.sessionId),
}));

// 7. TEST RESULTS (Linked to Build AND Project)
export const testResults = mysqlTable('test_results', {
  id: int('id').primaryKey().autoincrement(),
  buildId: int('build_id').references(() => automationBuilds.id, { onDelete: 'cascade' }).notNull(),
  projectId: int('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  organizationId: varchar('organization_id', { length: 255 }).references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  specFile: varchar('spec_file', { length: 512 }).notNull(),
  tests: json('tests').notNull(),
  executedAt: timestamp('executed_at').defaultNow().notNull(),
}, (table) => ({
  buildSpecUnique: uniqueIndex('build_spec_idx').on(table.buildId, table.specFile),
  orgIdx: index('result_org_idx').on(table.organizationId),
}));

/* -------------------- RELATIONS -------------------- */

// Users Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedOrganizations: many(organizations),
  memberships: many(organizationMembers),
  createdTestCases: many(testCases),
  triggeredBuilds: many(automationBuilds),
}));

// Organizations Relations
export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, {
    fields: [organizations.ownerId],
    references: [users.id],
  }),
  members: many(organizationMembers),
  projects: many(projects),
  testCases: many(testCases),
  builds: many(automationBuilds),
  results: many(testResults),
}));

// Organization Members Relations
export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
}));

// Projects Relations
export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  testCases: many(testCases),
  builds: many(automationBuilds),
  results: many(testResults),
}));

// TestCases Relations
export const testCasesRelations = relations(testCases, ({ one }) => ({
  project: one(projects, {
    fields: [testCases.projectId],
    references: [projects.id],
  }),
  organization: one(organizations, {
    fields: [testCases.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [testCases.createdById],
    references: [users.id],
  }),
}));

// Builds Relations
export const buildsRelations = relations(automationBuilds, ({ one, many }) => ({
  project: one(projects, {
    fields: [automationBuilds.projectId],
    references: [projects.id],
  }),
  organization: one(organizations, {
    fields: [automationBuilds.organizationId],
    references: [organizations.id],
  }),
  triggeredBy: one(users, {
    fields: [automationBuilds.triggeredById],
    references: [users.id],
  }),
  results: many(testResults),
}));

// Results Relations
export const resultsRelations = relations(testResults, ({ one }) => ({
  build: one(automationBuilds, {
    fields: [testResults.buildId],
    references: [automationBuilds.id],
  }),
  project: one(projects, {
    fields: [testResults.projectId],
    references: [projects.id],
  }),
  organization: one(organizations, {
    fields: [testResults.organizationId],
    references: [organizations.id],
  }),
}));