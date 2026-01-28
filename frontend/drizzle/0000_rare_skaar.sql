CREATE TABLE `automation_builds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`organization_id` varchar(255) NOT NULL,
	`triggered_by_id` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`status` varchar(50) NOT NULL DEFAULT 'running',
	`environment` varchar(50) DEFAULT 'dev',
	`type` varchar(50),
	CONSTRAINT `automation_builds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organization_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`role` varchar(50) NOT NULL DEFAULT 'member',
	`joined_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organization_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_user_unique_idx` UNIQUE(`organization_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`owner_id` varchar(255) NOT NULL,
	`image_url` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` varchar(50) NOT NULL,
	`environment` varchar(50) DEFAULT 'production',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `test_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`organization_id` varchar(255) NOT NULL,
	`case_code` varchar(100) NOT NULL,
	`case_key` varchar(100),
	`module_name` varchar(100),
	`test_suite` varchar(100),
	`tags` text,
	`title` text NOT NULL,
	`description` text,
	`precondition` text,
	`steps` text,
	`expected_result` text,
	`type` varchar(50),
	`priority` varchar(20) DEFAULT 'medium',
	`mode` varchar(50),
	`created_by_id` varchar(255),
	`shareable_link` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `test_cases_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_case_code_idx` UNIQUE(`organization_id`,`case_code`)
);
--> statement-breakpoint
CREATE TABLE `test_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`build_id` int NOT NULL,
	`project_id` int NOT NULL,
	`organization_id` varchar(255) NOT NULL,
	`spec_file` varchar(512) NOT NULL,
	`tests` json NOT NULL,
	`executed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `test_results_id` PRIMARY KEY(`id`),
	CONSTRAINT `build_spec_idx` UNIQUE(`build_id`,`spec_file`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`first_name` varchar(255),
	`last_name` varchar(255),
	`image_url` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `automation_builds` ADD CONSTRAINT `automation_builds_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `automation_builds` ADD CONSTRAINT `automation_builds_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `automation_builds` ADD CONSTRAINT `automation_builds_triggered_by_id_users_id_fk` FOREIGN KEY (`triggered_by_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_members` ADD CONSTRAINT `organization_members_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_members` ADD CONSTRAINT `organization_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organizations` ADD CONSTRAINT `organizations_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_cases` ADD CONSTRAINT `test_cases_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_cases` ADD CONSTRAINT `test_cases_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_cases` ADD CONSTRAINT `test_cases_created_by_id_users_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_results` ADD CONSTRAINT `test_results_build_id_automation_builds_id_fk` FOREIGN KEY (`build_id`) REFERENCES `automation_builds`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_results` ADD CONSTRAINT `test_results_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_results` ADD CONSTRAINT `test_results_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `build_project_idx` ON `automation_builds` (`project_id`);--> statement-breakpoint
CREATE INDEX `build_org_idx` ON `automation_builds` (`organization_id`);--> statement-breakpoint
CREATE INDEX `project_org_idx` ON `projects` (`organization_id`);--> statement-breakpoint
CREATE INDEX `test_case_project_idx` ON `test_cases` (`project_id`);--> statement-breakpoint
CREATE INDEX `result_org_idx` ON `test_results` (`organization_id`);