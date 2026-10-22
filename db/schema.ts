import { sqliteTable,text,integer } from 'drizzle-orm/sqlite-core';
export const warehouse=sqliteTable('warehouse',{id:text('id').primaryKey(),data:text('data').notNull(),revision:integer('revision').notNull().default(0)});
export const loginLimits=sqliteTable('login_limits',{id:text('id').primaryKey(),window:integer('window').notNull(),count:integer('count').notNull()});
