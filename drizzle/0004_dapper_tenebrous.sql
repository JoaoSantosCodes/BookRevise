CREATE TABLE `reviewJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookId` int NOT NULL,
	`status` enum('queued','processing','completed','failed') NOT NULL DEFAULT 'queued',
	`attempts` int NOT NULL DEFAULT 0,
	`error` text,
	`lockedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviewJobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bookVersions` ADD `versionNumber` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `bookVersions` ADD `contentText` text;--> statement-breakpoint
ALTER TABLE `bookVersions` ADD `baseVersionId` int;--> statement-breakpoint
ALTER TABLE `books` ADD `author` varchar(255);--> statement-breakpoint
ALTER TABLE `books` ADD `description` text;--> statement-breakpoint
ALTER TABLE `books` ADD `language` varchar(16) DEFAULT 'pt-BR' NOT NULL;--> statement-breakpoint
ALTER TABLE `books` ADD `chapters` text;--> statement-breakpoint
ALTER TABLE `books` ADD `coverKey` text;--> statement-breakpoint
ALTER TABLE `books` ADD `coverUrl` text;