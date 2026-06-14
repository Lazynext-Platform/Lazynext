import {
	pgTable,
	text,
	serial,
	integer,
	timestamp,
	jsonb,
	boolean,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull(),
	image: text("image"),
	role: text("role").notNull().default("user"), // 'user' or 'admin'
	stripeCustomerId: text("stripe_customer_id"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const subscriptions = pgTable("subscriptions", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id),
	stripeSubscriptionId: text("stripe_subscription_id").notNull(),
	stripePriceId: text("stripe_price_id").notNull(),
	stripeCurrentPeriodEnd: timestamp("stripe_current_period_end").notNull(),
	tier: text("tier").notNull().default("free"), // 'free' or 'pro'
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id),
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at"),
	updatedAt: timestamp("updated_at"),
});

export const projects = pgTable("projects", {
	id: text("id").primaryKey(),
	userId: text("user_id").references(() => user.id),
	name: text("name").notNull(),
	fps: integer("fps").notNull().default(60),
	width: integer("width").notNull().default(1920),
	height: integer("height").notNull().default(1080),
	durationFrames: integer("duration_frames").notNull().default(1000),
	data: jsonb("data"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

// Alias for backward-compat imports that use `users`
export const users = user;

export const timelines = pgTable("timelines", {
	id: text("id").primaryKey(),
	projectId: text("project_id").references(() => projects.id, {
		onDelete: "cascade",
	}),
	width: integer("width").notNull().default(1920),
	height: integer("height").notNull().default(1080),
	framerate: integer("framerate").notNull().default(30),
});

export const tracks = pgTable("tracks", {
	id: text("id").primaryKey(),
	projectId: text("project_id").references(() => projects.id, {
		onDelete: "cascade",
	}),
	timelineId: text("timeline_id").references(() => timelines.id, {
		onDelete: "cascade",
	}),
	name: text("name").notNull(),
	type: text("type").notNull(), // 'video' or 'audio'
	order: integer("order").notNull().default(0), // Z-index sorting
	zIndex: integer("z_index").notNull().default(0),
});

export const clips = pgTable("clips", {
	id: text("id").primaryKey(),
	trackId: text("track_id").references(() => tracks.id, {
		onDelete: "cascade",
	}),
	assetUrl: text("asset_url").notNull(),
	startFrame: integer("start_frame").notNull(),
	durationFrames: integer("duration_frames").notNull(),
	offsetFrames: integer("offset_frames").default(0),
	metadata: jsonb("metadata"), // Any FX or color grading data
});

export const agents = pgTable("agents", {
	id: text("id").primaryKey(),
	projectId: text("project_id").references(() => projects.id, {
		onDelete: "cascade",
	}),
	agentType: text("agent_type").notNull(), // 'director', 'chronos', 'visionary'
	memoryContext: jsonb("memory_context"), // The LLM's conversation history
});

export const feedback = pgTable("feedback", {
	id: text("id").primaryKey(),
	message: text("message").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
});
