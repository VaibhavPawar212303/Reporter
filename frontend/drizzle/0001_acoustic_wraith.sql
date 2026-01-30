ALTER TABLE `automation_builds` ADD `session_id` varchar(255);--> statement-breakpoint
CREATE INDEX `build_session_idx` ON `automation_builds` (`session_id`);