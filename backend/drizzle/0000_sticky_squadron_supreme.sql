CREATE TABLE IF NOT EXISTS `rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `rooms_expires_idx` ON `rooms` (`expires`);
