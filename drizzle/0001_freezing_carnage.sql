CREATE TABLE `agencyReconciliation` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`agency1` varchar(255) NOT NULL,
	`agency2` varchar(255) NOT NULL,
	`discrepancyType` varchar(255) NOT NULL,
	`description` longtext NOT NULL,
	`reportedAt` timestamp NOT NULL DEFAULT (now()),
	`reportedBy` int NOT NULL,
	`resolution` longtext,
	`resolvedAt` timestamp,
	`resolvedBy` int,
	`status` enum('reported','under_review','resolved','escalated') NOT NULL DEFAULT 'reported',
	CONSTRAINT `agencyReconciliation_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agencyRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`agencyName` varchar(255) NOT NULL,
	`requestType` enum('environmental_clearance','social_clearance','technical_review','legal_review','financial_review','other') NOT NULL,
	`requestedBy` int NOT NULL,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`dueDate` datetime NOT NULL,
	`details` longtext,
	`followUpCount` int NOT NULL DEFAULT 0,
	`lastFollowUpAt` timestamp,
	`responseReceivedAt` timestamp,
	`responseDocumentUrl` varchar(500),
	`responseNotes` longtext,
	`status` enum('pending','sent','acknowledged','in_review','responded','resolved','overdue') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agencyRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agreementSignatories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agreementId` int NOT NULL,
	`signatoryName` varchar(255) NOT NULL,
	`signatoryRole` varchar(255) NOT NULL,
	`signatoryOrganization` varchar(255),
	`signatureOrder` int NOT NULL,
	`signedAt` timestamp,
	`signatureUrl` varchar(500),
	`status` enum('pending','signed','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agreementSignatories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agreementTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateName` varchar(255) NOT NULL,
	`description` longtext,
	`templateType` enum('moa','implementing_agreement','concession','lease','other') NOT NULL,
	`content` longtext NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agreementTemplates_id` PRIMARY KEY(`id`),
	CONSTRAINT `agreementTemplates_templateName_unique` UNIQUE(`templateName`),
	CONSTRAINT `templateName_idx` UNIQUE(`templateName`)
);
--> statement-breakpoint
CREATE TABLE `agreements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`agreementNumber` varchar(100) NOT NULL,
	`templateId` int,
	`agreementType` enum('moa','implementing_agreement','concession','lease','other') NOT NULL,
	`draftUrl` varchar(500),
	`executedUrl` varchar(500),
	`effectiveDate` datetime,
	`expiryDate` datetime,
	`status` enum('draft','under_review','pending_signatures','executed','active','expired','terminated') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agreements_id` PRIMARY KEY(`id`),
	CONSTRAINT `agreements_agreementNumber_unique` UNIQUE(`agreementNumber`),
	CONSTRAINT `agreementNumber_idx` UNIQUE(`agreementNumber`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` int NOT NULL,
	`action` enum('create','read','update','delete','approve','reject','submit','verify','other') NOT NULL,
	`oldValues` json,
	`newValues` json,
	`changeDescription` longtext,
	`ipAddress` varchar(45),
	`userAgent` varchar(500),
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bidAwards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`biddingEventId` int NOT NULL,
	`bidId` int NOT NULL,
	`awardedTo` varchar(255) NOT NULL,
	`awardDate` datetime NOT NULL,
	`awardedBy` int NOT NULL,
	`awardAmount` decimal(15,2) NOT NULL,
	`documentUrl` varchar(500),
	`status` enum('awarded','protested','upheld','overturned','implemented') NOT NULL DEFAULT 'awarded',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bidAwards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bidEvaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bidId` int NOT NULL,
	`evaluatedBy` int NOT NULL,
	`evaluatedAt` timestamp NOT NULL DEFAULT (now()),
	`technicalScore` decimal(5,2),
	`financialScore` decimal(5,2),
	`overallScore` decimal(5,2),
	`notes` longtext,
	`recommendation` enum('award','reject','defer') NOT NULL,
	`status` enum('draft','submitted','reviewed','finalized') NOT NULL DEFAULT 'draft',
	CONSTRAINT `bidEvaluations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bidProtests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bidAwardId` int NOT NULL,
	`protestorName` varchar(255) NOT NULL,
	`protestDate` datetime NOT NULL,
	`grounds` longtext NOT NULL,
	`documentUrl` varchar(500),
	`status` enum('filed','acknowledged','under_review','upheld','denied','withdrawn') NOT NULL DEFAULT 'filed',
	`resolution` longtext,
	`resolvedAt` timestamp,
	`resolvedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bidProtests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `biddingEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`biddingNumber` varchar(100) NOT NULL,
	`selectionMode` enum('solicited','unsolicited','hybrid') NOT NULL,
	`publicationDate` datetime NOT NULL,
	`preBidDate` datetime,
	`bidSubmissionDeadline` datetime NOT NULL,
	`bidOpeningDate` datetime NOT NULL,
	`evaluationDeadline` datetime,
	`awardDate` datetime,
	`status` enum('published','pre_bid_held','bids_received','bids_opened','under_evaluation','awarded','failed','cancelled') NOT NULL DEFAULT 'published',
	`documentUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `biddingEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `biddingEvents_biddingNumber_unique` UNIQUE(`biddingNumber`),
	CONSTRAINT `biddingNumber_idx` UNIQUE(`biddingNumber`)
);
--> statement-breakpoint
CREATE TABLE `bids` (
	`id` int AUTO_INCREMENT NOT NULL,
	`biddingEventId` int NOT NULL,
	`bidderName` varchar(255) NOT NULL,
	`bidderId` int,
	`bidAmount` decimal(15,2) NOT NULL,
	`bidDocumentUrl` varchar(500) NOT NULL,
	`submittedAt` datetime NOT NULL,
	`status` enum('submitted','opened','qualified','disqualified','awarded','rejected') NOT NULL DEFAULT 'submitted',
	`disqualificationReason` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bids_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `boardDecisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`boardMeetingId` int NOT NULL,
	`decision` enum('approved','approved_with_conditions','deferred','rejected','returned_for_revision') NOT NULL,
	`decisionDate` datetime NOT NULL,
	`conditions` longtext,
	`recordedBy` int NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`documentUrl` varchar(500),
	`status` enum('recorded','implemented','superseded') NOT NULL DEFAULT 'recorded',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `boardDecisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `boardMeetings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingNumber` varchar(100) NOT NULL,
	`meetingDate` datetime NOT NULL,
	`location` varchar(255),
	`agendaUrl` varchar(500),
	`minutesUrl` varchar(500),
	`status` enum('scheduled','held','cancelled','postponed') NOT NULL DEFAULT 'scheduled',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `boardMeetings_id` PRIMARY KEY(`id`),
	CONSTRAINT `boardMeetings_meetingNumber_unique` UNIQUE(`meetingNumber`),
	CONSTRAINT `meetingNumber_idx` UNIQUE(`meetingNumber`)
);
--> statement-breakpoint
CREATE TABLE `complianceChecklist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`documentTypeId` int NOT NULL,
	`isRequired` boolean NOT NULL DEFAULT true,
	`isConditional` boolean NOT NULL DEFAULT false,
	`condition` longtext,
	`documentId` int,
	`isVerified` boolean NOT NULL DEFAULT false,
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`notes` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `complianceChecklist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `complianceTimers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`fullComplianceNoticeId` int NOT NULL,
	`startDate` datetime NOT NULL,
	`dueDate` datetime NOT NULL,
	`timerType` enum('board_review_90days','bidding_preparation','other') NOT NULL,
	`status` enum('active','completed','extended','expired') NOT NULL DEFAULT 'active',
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `complianceTimers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conditionsPrecedent` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agreementId` int NOT NULL,
	`conditionDescription` longtext NOT NULL,
	`isRequired` boolean NOT NULL DEFAULT true,
	`isMet` boolean NOT NULL DEFAULT false,
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`notes` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conditionsPrecedent_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consultations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`consultationNumber` varchar(100) NOT NULL,
	`consultationType` varchar(255) NOT NULL,
	`scheduledDate` datetime NOT NULL,
	`location` varchar(255),
	`description` longtext,
	`status` enum('scheduled','held','cancelled','postponed') NOT NULL DEFAULT 'scheduled',
	`minutesUrl` varchar(500),
	`attendanceCount` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `consultations_id` PRIMARY KEY(`id`),
	CONSTRAINT `consultations_consultationNumber_unique` UNIQUE(`consultationNumber`),
	CONSTRAINT `consultationNumber_idx` UNIQUE(`consultationNumber`)
);
--> statement-breakpoint
CREATE TABLE `correctiveActions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`findingId` int NOT NULL,
	`actionDescription` longtext NOT NULL,
	`assignedTo` int,
	`dueDate` datetime NOT NULL,
	`completedAt` timestamp,
	`completionNotes` longtext,
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`status` enum('assigned','in_progress','completed','verified','failed') NOT NULL DEFAULT 'assigned',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `correctiveActions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cswPackages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`cswNumber` varchar(100) NOT NULL,
	`preparedBy` int NOT NULL,
	`preparedAt` timestamp NOT NULL DEFAULT (now()),
	`technicalScore` decimal(5,2),
	`legalScore` decimal(5,2),
	`financialScore` decimal(5,2),
	`environmentalScore` decimal(5,2),
	`socialScore` decimal(5,2),
	`overallScore` decimal(5,2),
	`recommendation` enum('approve','approve_with_conditions','defer','reject') NOT NULL,
	`documentUrl` varchar(500),
	`status` enum('draft','submitted','reviewed','finalized') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cswPackages_id` PRIMARY KEY(`id`),
	CONSTRAINT `cswPackages_cswNumber_unique` UNIQUE(`cswNumber`),
	CONSTRAINT `cswNumber_idx` UNIQUE(`cswNumber`)
);
--> statement-breakpoint
CREATE TABLE `deficiencyNotices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`noticeNumber` varchar(100) NOT NULL,
	`issuedBy` int NOT NULL,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`deficiencies` json,
	`dueDate` datetime NOT NULL,
	`documentUrl` varchar(500),
	`status` enum('issued','acknowledged','responded','resolved','expired') NOT NULL DEFAULT 'issued',
	`respondedAt` timestamp,
	`responseNotes` longtext,
	CONSTRAINT `deficiencyNotices_id` PRIMARY KEY(`id`),
	CONSTRAINT `deficiencyNotices_noticeNumber_unique` UNIQUE(`noticeNumber`),
	CONSTRAINT `noticeNumber_idx` UNIQUE(`noticeNumber`)
);
--> statement-breakpoint
CREATE TABLE `documentTypes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`typeName` varchar(255) NOT NULL,
	`description` longtext,
	`issuingAgency` varchar(255),
	`isRequired` boolean NOT NULL DEFAULT false,
	`validityPeriodDays` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documentTypes_id` PRIMARY KEY(`id`),
	CONSTRAINT `documentTypes_typeName_unique` UNIQUE(`typeName`),
	CONSTRAINT `typeName_idx` UNIQUE(`typeName`)
);
--> statement-breakpoint
CREATE TABLE `documentVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`version` int NOT NULL,
	`fileUrl` varchar(500) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`uploadedBy` int NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`changeDescription` longtext,
	CONSTRAINT `documentVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`documentTypeId` int NOT NULL,
	`documentName` varchar(255) NOT NULL,
	`fileUrl` varchar(500) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileMimeType` varchar(100),
	`fileSize` int,
	`version` int NOT NULL DEFAULT 1,
	`issuedBy` varchar(255),
	`issuedDate` datetime,
	`validityStartDate` datetime,
	`validityEndDate` datetime,
	`conditions` longtext,
	`uploadedBy` int NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('pending_verification','verified','rejected','expired','superseded') NOT NULL DEFAULT 'pending_verification',
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`rejectionReason` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `enforcementCases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseNumber` varchar(100) NOT NULL,
	`complaintType` varchar(255) NOT NULL,
	`location` varchar(255) NOT NULL,
	`suspectedParties` longtext,
	`reportedAt` timestamp NOT NULL DEFAULT (now()),
	`reportedBy` int,
	`evidence` longtext,
	`verificationStatus` enum('pending','verified','not_verified','escalated') NOT NULL DEFAULT 'pending',
	`verifiedAt` timestamp,
	`verifiedBy` int,
	`enforcementActions` longtext,
	`caseStatus` enum('intake','investigation','enforcement','resolved','closed') NOT NULL DEFAULT 'intake',
	`closedAt` timestamp,
	`closedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `enforcementCases_id` PRIMARY KEY(`id`),
	CONSTRAINT `enforcementCases_caseNumber_unique` UNIQUE(`caseNumber`),
	CONSTRAINT `caseNumber_idx` UNIQUE(`caseNumber`)
);
--> statement-breakpoint
CREATE TABLE `evaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`evaluationType` enum('technical','legal','financial','environmental','social') NOT NULL,
	`evaluatedBy` int NOT NULL,
	`evaluatedAt` timestamp NOT NULL DEFAULT (now()),
	`score` decimal(5,2),
	`maxScore` decimal(5,2),
	`notes` longtext,
	`status` enum('draft','submitted','reviewed','approved','rejected') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `evaluations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fullComplianceNotices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`noticeNumber` varchar(100) NOT NULL,
	`issuedBy` int NOT NULL,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`documentUrl` varchar(500),
	`status` enum('issued','acknowledged','superseded') NOT NULL DEFAULT 'issued',
	`acknowledgedAt` timestamp,
	CONSTRAINT `fullComplianceNotices_id` PRIMARY KEY(`id`),
	CONSTRAINT `fullComplianceNotices_noticeNumber_unique` UNIQUE(`noticeNumber`),
	CONSTRAINT `noticeNumber_idx` UNIQUE(`noticeNumber`)
);
--> statement-breakpoint
CREATE TABLE `inspections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`inspectionNumber` varchar(100) NOT NULL,
	`inspectionType` enum('routine','compliance_check','incident_response','final_inspection','other') NOT NULL,
	`scheduledDate` datetime NOT NULL,
	`actualDate` datetime,
	`inspectedBy` int,
	`location` varchar(255),
	`findings` longtext,
	`photosUrl` varchar(500),
	`status` enum('scheduled','completed','cancelled','postponed') NOT NULL DEFAULT 'scheduled',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inspections_id` PRIMARY KEY(`id`),
	CONSTRAINT `inspections_inspectionNumber_unique` UNIQUE(`inspectionNumber`),
	CONSTRAINT `inspectionNumber_idx` UNIQUE(`inspectionNumber`)
);
--> statement-breakpoint
CREATE TABLE `loiSubmissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`submittedBy` int NOT NULL,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`documentUrl` varchar(500),
	`status` enum('draft','submitted','received','acknowledged','rejected') NOT NULL DEFAULT 'draft',
	`notes` longtext,
	CONSTRAINT `loiSubmissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`senderId` int NOT NULL,
	`messageType` enum('general','document_submission','deficiency_notice','approval','rejection','other') NOT NULL,
	`subject` varchar(255),
	`content` longtext NOT NULL,
	`attachmentUrl` varchar(500),
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mouExtensions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mouId` int NOT NULL,
	`requestedBy` int NOT NULL,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`extensionDays` int NOT NULL,
	`newEndDate` datetime NOT NULL,
	`reason` longtext,
	`approvedBy` int,
	`approvedAt` timestamp,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	CONSTRAINT `mouExtensions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mous` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`mouNumber` varchar(100) NOT NULL,
	`startDate` datetime NOT NULL,
	`endDate` datetime NOT NULL,
	`documentUrl` varchar(500),
	`status` enum('draft','executed','active','extended','expired','terminated') NOT NULL DEFAULT 'draft',
	`executedAt` timestamp,
	`executedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mous_id` PRIMARY KEY(`id`),
	CONSTRAINT `mous_mouNumber_unique` UNIQUE(`mouNumber`),
	CONSTRAINT `mouNumber_idx` UNIQUE(`mouNumber`)
);
--> statement-breakpoint
CREATE TABLE `nonComplianceFindings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`inspectionId` int,
	`findingNumber` varchar(100) NOT NULL,
	`findingType` varchar(255) NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL,
	`description` longtext NOT NULL,
	`reportedAt` timestamp NOT NULL DEFAULT (now()),
	`reportedBy` int NOT NULL,
	`evidenceUrl` varchar(500),
	`status` enum('reported','acknowledged','under_correction','corrected','verified','escalated') NOT NULL DEFAULT 'reported',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nonComplianceFindings_id` PRIMARY KEY(`id`),
	CONSTRAINT `nonComplianceFindings_findingNumber_unique` UNIQUE(`findingNumber`),
	CONSTRAINT `findingNumber_idx` UNIQUE(`findingNumber`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`notificationType` enum('deficiency_notice','due_date_reminder','document_expiry','board_meeting','deadline_escalation','task_assignment','status_change','other') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` longtext NOT NULL,
	`relatedEntityId` int,
	`relatedEntityType` varchar(100),
	`isRead` boolean NOT NULL DEFAULT false,
	`sentViaEmail` boolean NOT NULL DEFAULT false,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `preQualChecklist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`itemName` varchar(255) NOT NULL,
	`isRequired` boolean NOT NULL DEFAULT true,
	`isCompliant` boolean NOT NULL DEFAULT false,
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`notes` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `preQualChecklist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectAccess` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('admin','evaluator','secretariat','board_member','proponent','agency_reviewer','enforcement_officer','viewer') NOT NULL,
	`grantedBy` int NOT NULL,
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	`revokedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectAccess_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectClosures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`closureNumber` varchar(100) NOT NULL,
	`closureDate` datetime NOT NULL,
	`closedBy` int NOT NULL,
	`finalReportUrl` varchar(500),
	`lessonsLearned` longtext,
	`recommendations` longtext,
	`status` enum('initiated','in_progress','completed','verified') NOT NULL DEFAULT 'initiated',
	`verifiedAt` timestamp,
	`verifiedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectClosures_id` PRIMARY KEY(`id`),
	CONSTRAINT `projectClosures_closureNumber_unique` UNIQUE(`closureNumber`),
	CONSTRAINT `closureNumber_idx` UNIQUE(`closureNumber`)
);
--> statement-breakpoint
CREATE TABLE `projectMilestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`milestoneName` varchar(255) NOT NULL,
	`description` longtext,
	`milestoneType` enum('dredging','filling','seawall','utilities','construction','other') NOT NULL,
	`plannedStartDate` datetime,
	`plannedEndDate` datetime,
	`actualStartDate` datetime,
	`actualEndDate` datetime,
	`status` enum('planned','in_progress','completed','delayed','on_hold','cancelled') NOT NULL DEFAULT 'planned',
	`completionPercentage` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectMilestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectStages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`stage` enum('intake','pre_qualification','mou','compliance_docs','full_compliance','evaluation','board_review','bidding','agreement','monitoring','closure') NOT NULL,
	`enteredAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`notes` longtext,
	`completedBy` int,
	CONSTRAINT `projectStages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectCode` varchar(50) NOT NULL,
	`projectName` varchar(255) NOT NULL,
	`description` longtext,
	`proponentId` int NOT NULL,
	`proponentType` enum('lgu','developer','ngo','government') NOT NULL,
	`location` varchar(255) NOT NULL,
	`mapPolygon` json,
	`estimatedArea` decimal(12,2),
	`estimatedCost` decimal(15,2),
	`estimatedTimeline` int,
	`projectPurpose` varchar(255),
	`currentStage` enum('intake','pre_qualification','mou','compliance_docs','full_compliance','evaluation','board_review','bidding','agreement','monitoring','closure') NOT NULL DEFAULT 'intake',
	`status` enum('draft','submitted','in_progress','complete','deficient','approved','rejected','on_hold') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`submittedAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `projects_projectCode_unique` UNIQUE(`projectCode`),
	CONSTRAINT `projectCode_idx` UNIQUE(`projectCode`)
);
--> statement-breakpoint
CREATE TABLE `publicComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`commenterName` varchar(255) NOT NULL,
	`commenterEmail` varchar(320),
	`commentText` longtext NOT NULL,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`moderationStatus` enum('pending','approved','rejected','flagged') NOT NULL DEFAULT 'pending',
	`moderatedBy` int,
	`moderatedAt` timestamp,
	`moderationNotes` longtext,
	`isPublished` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `publicComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resolutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`resolutionNumber` varchar(100) NOT NULL,
	`boardMeetingId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` longtext NOT NULL,
	`approvedBy` int NOT NULL,
	`approvedAt` timestamp NOT NULL DEFAULT (now()),
	`documentUrl` varchar(500),
	`status` enum('drafted','approved','signed','implemented','superseded') NOT NULL DEFAULT 'drafted',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resolutions_id` PRIMARY KEY(`id`),
	CONSTRAINT `resolutions_resolutionNumber_unique` UNIQUE(`resolutionNumber`),
	CONSTRAINT `resolutionNumber_idx` UNIQUE(`resolutionNumber`)
);
--> statement-breakpoint
CREATE TABLE `riskRegister` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`riskCategory` enum('environmental','social','legal','engineering','financial','reputational') NOT NULL,
	`riskDescription` longtext NOT NULL,
	`likelihood` enum('low','medium','high','critical') NOT NULL,
	`impact` enum('low','medium','high','critical') NOT NULL,
	`mitigationStrategy` longtext,
	`owner` int,
	`status` enum('identified','mitigated','monitored','escalated','resolved') NOT NULL DEFAULT 'identified',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `riskRegister_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `slaConfigurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stageName` varchar(100) NOT NULL,
	`defaultDays` int NOT NULL,
	`escalationDays` int,
	`description` longtext,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `slaConfigurations_id` PRIMARY KEY(`id`),
	CONSTRAINT `slaConfigurations_stageName_unique` UNIQUE(`stageName`),
	CONSTRAINT `stageName_idx` UNIQUE(`stageName`)
);
--> statement-breakpoint
CREATE TABLE `slaTimers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`stage` varchar(100) NOT NULL,
	`dueDateDays` int NOT NULL,
	`dueDate` datetime NOT NULL,
	`escalationDays` int,
	`escalatedAt` timestamp,
	`completedAt` timestamp,
	`isOverdue` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `slaTimers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stopWorkOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`orderNumber` varchar(100) NOT NULL,
	`issuedBy` int NOT NULL,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`reason` longtext NOT NULL,
	`effectiveDate` datetime NOT NULL,
	`liftedDate` datetime,
	`liftedBy` int,
	`documentUrl` varchar(500),
	`status` enum('issued','acknowledged','active','lifted','expired') NOT NULL DEFAULT 'issued',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stopWorkOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `stopWorkOrders_orderNumber_unique` UNIQUE(`orderNumber`),
	CONSTRAINT `orderNumber_idx` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` longtext,
	`assignedTo` int,
	`taskType` enum('document_review','checklist_verification','agency_coordination','evaluation','board_preparation','bidding_management','monitoring','other') NOT NULL,
	`status` enum('pending','in_progress','completed','blocked','cancelled') NOT NULL DEFAULT 'pending',
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`dueDate` datetime,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','evaluator','secretariat','board_member','proponent','public','agency_reviewer','enforcement_officer') NOT NULL DEFAULT 'public';--> statement-breakpoint
ALTER TABLE `users` ADD `department` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `agencyAffiliation` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `openId_idx` UNIQUE(`openId`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `agencyReconciliation` (`projectId`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `agencyRequests` (`projectId`);--> statement-breakpoint
CREATE INDEX `agencyName_idx` ON `agencyRequests` (`agencyName`);--> statement-breakpoint
CREATE INDEX `dueDate_idx` ON `agencyRequests` (`dueDate`);--> statement-breakpoint
CREATE INDEX `agreementId_idx` ON `agreementSignatories` (`agreementId`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `agreements` (`projectId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `auditLogs` (`userId`);--> statement-breakpoint
CREATE INDEX `entityType_idx` ON `auditLogs` (`entityType`);--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `auditLogs` (`timestamp`);--> statement-breakpoint
CREATE INDEX `biddingEventId_idx` ON `bidAwards` (`biddingEventId`);--> statement-breakpoint
CREATE INDEX `bidId_idx` ON `bidAwards` (`bidId`);--> statement-breakpoint
CREATE INDEX `bidId_idx` ON `bidEvaluations` (`bidId`);--> statement-breakpoint
CREATE INDEX `evaluatedBy_idx` ON `bidEvaluations` (`evaluatedBy`);--> statement-breakpoint
CREATE INDEX `bidAwardId_idx` ON `bidProtests` (`bidAwardId`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `biddingEvents` (`projectId`);--> statement-breakpoint
CREATE INDEX `biddingEventId_idx` ON `bids` (`biddingEventId`);--> statement-breakpoint
CREATE INDEX `bidderId_idx` ON `bids` (`bidderId`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `boardDecisions` (`projectId`);--> statement-breakpoint
CREATE INDEX `boardMeetingId_idx` ON `boardDecisions` (`boardMeetingId`);--> statement-breakpoint
CREATE INDEX `meetingDate_idx` ON `boardMeetings` (`meetingDate`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `complianceChecklist` (`projectId`);--> statement-breakpoint
CREATE INDEX `documentTypeId_idx` ON `complianceChecklist` (`documentTypeId`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `complianceTimers` (`projectId`);--> statement-breakpoint
CREATE INDEX `dueDate_idx` ON `complianceTimers` (`dueDate`);--> statement-breakpoint
CREATE INDEX `agreementId_idx` ON `conditionsPrecedent` (`agreementId`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `consultations` (`projectId`);--> statement-breakpoint
CREATE INDEX `findingId_idx` ON `correctiveActions` (`findingId`);--> statement-breakpoint
CREATE INDEX `assignedTo_idx` ON `correctiveActions` (`assignedTo`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `cswPackages` (`projectId`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `deficiencyNotices` (`projectId`);--> statement-breakpoint
CREATE INDEX `documentId_idx` ON `documentVersions` (`documentId`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `documents` (`projectId`);--> statement-breakpoint
CREATE INDEX `documentTypeId_idx` ON `documents` (`documentTypeId`);--> statement-breakpoint
CREATE INDEX `uploadedBy_idx` ON `documents` (`uploadedBy`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `documents` (`status`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `evaluations` (`projectId`);--> statement-breakpoint
CREATE INDEX `evaluatedBy_idx` ON `evaluations` (`evaluatedBy`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `fullComplianceNotices` (`projectId`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `inspections` (`projectId`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `loiSubmissions` (`projectId`);--> statement-breakpoint
CREATE INDEX `submittedBy_idx` ON `loiSubmissions` (`submittedBy`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `messages` (`projectId`);--> statement-breakpoint
CREATE INDEX `senderId_idx` ON `messages` (`senderId`);--> statement-breakpoint
CREATE INDEX `mouId_idx` ON `mouExtensions` (`mouId`);--> statement-breakpoint
CREATE INDEX `requestedBy_idx` ON `mouExtensions` (`requestedBy`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `mous` (`projectId`);--> statement-breakpoint
CREATE INDEX `endDate_idx` ON `mous` (`endDate`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `nonComplianceFindings` (`projectId`);--> statement-breakpoint
CREATE INDEX `inspectionId_idx` ON `nonComplianceFindings` (`inspectionId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `notifications` (`projectId`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `preQualChecklist` (`projectId`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `projectAccess` (`projectId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `projectAccess` (`userId`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `projectClosures` (`projectId`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `projectMilestones` (`projectId`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `projectStages` (`projectId`);--> statement-breakpoint
CREATE INDEX `stage_idx` ON `projectStages` (`stage`);--> statement-breakpoint
CREATE INDEX `proponentId_idx` ON `projects` (`proponentId`);--> statement-breakpoint
CREATE INDEX `currentStage_idx` ON `projects` (`currentStage`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `publicComments` (`projectId`);--> statement-breakpoint
CREATE INDEX `moderationStatus_idx` ON `publicComments` (`moderationStatus`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `resolutions` (`projectId`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `riskRegister` (`projectId`);--> statement-breakpoint
CREATE INDEX `riskCategory_idx` ON `riskRegister` (`riskCategory`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `slaTimers` (`projectId`);--> statement-breakpoint
CREATE INDEX `dueDate_idx` ON `slaTimers` (`dueDate`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `stopWorkOrders` (`projectId`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `tasks` (`projectId`);--> statement-breakpoint
CREATE INDEX `assignedTo_idx` ON `tasks` (`assignedTo`);--> statement-breakpoint
CREATE INDEX `dueDate_idx` ON `tasks` (`dueDate`);--> statement-breakpoint
CREATE INDEX `role_idx` ON `users` (`role`);