// src/db/index.ts
import { connect } from '@tidbcloud/serverless';
import { drizzle } from 'drizzle-orm/tidb-serverless';
import * as schema from './schema';

// Standard TiDB Serverless connection
const client = connect({ url: process.env.DATABASE_URL });

// This creates a MySQL-dialect database instance
export const db = drizzle(client, { schema });