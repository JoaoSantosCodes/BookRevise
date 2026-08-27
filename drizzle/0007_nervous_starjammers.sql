CREATE TABLE `diffAnnotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bookId` int NOT NULL,
	`versionId` int NOT NULL,
	`kind` enum('highlight','comment') NOT NULL,
	`excerpt` text NOT NULL,
	`note` text,
	`color` varchar(16) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `diffAnnotations_id` PRIMARY KEY(`id`)
);
