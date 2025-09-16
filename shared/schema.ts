import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  integer, 
  decimal, 
  timestamp, 
  boolean,
  uuid,
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const taskStateEnum = pgEnum("task_state", ["To Do", "Doing", "Waiting", "Done"]);
export const taskPriorityEnum = pgEnum("task_priority", ["Baja", "Media", "Alta"]);
export const dealStatusEnum = pgEnum("deal_status", ["Open", "Won", "Lost"]);
export const priorityEnum = pgEnum("priority", ["Cold", "Warm", "Hot"]);
export const riskLevelEnum = pgEnum("risk_level", ["Bajo", "Medio", "Alto"]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  full_name: text("full_name"),
  role: text("role").default("Usuario"), // Admin, Manager, Usuario
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Companies table
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  industry: text("industry"),
  size: text("size"), // Small, Medium, Large, Enterprise
  revenue_estimate: decimal("revenue_estimate", { precision: 15, scale: 2 }),
  location: text("location"),
  website: text("website"),
  description: text("description"),
  score: integer("score").default(0),
  priority: priorityEnum("priority").default("Cold"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Contacts table
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company_id: uuid("company_id").references(() => companies.id),
  position: text("position"),
  source: text("source"), // Canal de origen
  score: integer("score").default(0),
  priority: priorityEnum("priority").default("Cold"),
  last_activity: timestamp("last_activity"),
  owner_id: uuid("owner_id").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Deals table
export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  company: text("company"),
  amount: decimal("amount", { precision: 15, scale: 2 }),
  stage: text("stage").notNull().default("Prospección"),
  probability: integer("probability").default(0),
  target_close_date: timestamp("target_close_date"),
  next_step: text("next_step"),
  status: dealStatusEnum("status").default("Open"),
  score: integer("score").default(0),
  priority: priorityEnum("priority").default("Cold"),
  risk_level: riskLevelEnum("risk_level").default("Bajo"),
  last_activity: timestamp("last_activity"),
  inactivity_days: integer("inactivity_days").default(0),
  contact_id: uuid("contact_id").references(() => contacts.id),
  owner_id: uuid("owner_id").references(() => users.id),
  close_reason: text("close_reason"), // Motivo de cierre
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  state: taskStateEnum("state").default("To Do"),
  priority: taskPriorityEnum("priority").default("Media"),
  due_at: timestamp("due_at"),
  completed_at: timestamp("completed_at"),
  assigned_to: uuid("assigned_to").references(() => users.id),
  deal_id: uuid("deal_id").references(() => deals.id),
  contact_id: uuid("contact_id").references(() => contacts.id),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Timeline entries for activity tracking
export const timeline_entries = pgTable("timeline_entries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // email, call, meeting, note, etc.
  description: text("description").notNull(),
  entity_type: text("entity_type").notNull(), // deal, contact, task
  entity_id: uuid("entity_id").notNull(),
  user_id: uuid("user_id").references(() => users.id),
  metadata: text("metadata"), // JSON string for additional data
  created_at: timestamp("created_at").defaultNow(),
});

// Pipeline stages configuration
export const pipeline_stages = pgTable("pipeline_stages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  order_index: integer("order_index").notNull(),
  color: text("color").default("#3B82F6"),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

// Schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  full_name: true,
  role: true,
});

export const insertCompanySchema = createInsertSchema(companies).pick({
  name: true,
  industry: true,
  size: true,
  revenue_estimate: true,
  location: true,
  website: true,
  description: true,
});

export const insertContactSchema = createInsertSchema(contacts).pick({
  name: true,
  email: true,
  phone: true,
  company_id: true,
  position: true,
  source: true,
  owner_id: true,
});

export const insertDealSchema = createInsertSchema(deals).pick({
  title: true,
  company: true,
  amount: true,
  stage: true,
  probability: true,
  target_close_date: true,
  next_step: true,
  status: true,
  contact_id: true,
  owner_id: true,
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  title: true,
  description: true,
  state: true,
  priority: true,
  due_at: true,
  assigned_to: true,
  deal_id: true,
  contact_id: true,
  notes: true,
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TimelineEntry = typeof timeline_entries.$inferSelect;
export type PipelineStage = typeof pipeline_stages.$inferSelect;
