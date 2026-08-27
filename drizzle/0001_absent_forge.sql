CREATE TABLE `bookVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookId` int NOT NULL,
	`kind` enum('manuscript','report') NOT NULL,
	`filename` varchar(255) NOT NULL,
	`fileKey` text NOT NULL,
	`fileUrl` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bookVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `books` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`filename` varchar(255) NOT NULL,
	`fileKey` text NOT NULL,
	`fileUrl` text NOT NULL,
	`status` enum('ready','processing','reviewed','error') NOT NULL DEFAULT 'processing',
	`wordCount` int NOT NULL DEFAULT 0,
	`healthScore` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `books_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviewIssues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookId` int NOT NULL,
	`category` enum('grammar','style','consistency','clarity') NOT NULL,
	`severity` enum('critical','important','suggestion') NOT NULL,
	`title` varchar(255) NOT NULL,
	`originalText` text NOT NULL,
	`suggestedText` text NOT NULL,
	`explanation` text NOT NULL,
	`context` text NOT NULL,
	`status` enum('open','accepted','ignored','edited') NOT NULL DEFAULT 'open',
	`editedText` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviewIssues_id` PRIMARY KEY(`id`)
);
