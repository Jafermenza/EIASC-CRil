-- Phase 8: durable business events and idempotent notification delivery

CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

CREATE TABLE "OutboxEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "eventId" UUID NOT NULL,
  "sourceAuditLogId" UUID NOT NULL,
  "eventType" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" UUID,
  "payload" JSONB NOT NULL,
  "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "processedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OutboxEvent_eventId_key" UNIQUE ("eventId"),
  CONSTRAINT "OutboxEvent_sourceAuditLogId_key" UNIQUE ("sourceAuditLogId"),
  CONSTRAINT "OutboxEvent_sourceAuditLogId_fkey" FOREIGN KEY ("sourceAuditLogId") REFERENCES "AuditLog"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");
CREATE INDEX "OutboxEvent_aggregateType_aggregateId_idx" ON "OutboxEvent"("aggregateType", "aggregateId");
CREATE INDEX "OutboxEvent_createdAt_idx" ON "OutboxEvent"("createdAt");

CREATE TABLE "NotificationDelivery" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "outboxEventId" UUID NOT NULL,
  "notificationId" UUID,
  "recipientId" UUID NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processingStartedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "lastError" TEXT,
  "providerMessageId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NotificationDelivery_outboxEventId_recipientId_channel_key" UNIQUE ("outboxEventId", "recipientId", "channel"),
  CONSTRAINT "NotificationDelivery_outboxEventId_fkey" FOREIGN KEY ("outboxEventId") REFERENCES "OutboxEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "NotificationDelivery_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "NotificationDelivery_status_nextAttemptAt_idx" ON "NotificationDelivery"("status", "nextAttemptAt");
CREATE INDEX "NotificationDelivery_recipientId_createdAt_idx" ON "NotificationDelivery"("recipientId", "createdAt");
CREATE INDEX "NotificationDelivery_notificationId_idx" ON "NotificationDelivery"("notificationId");


-- Transactional bridge: every notification-worthy audit write creates its outbox row in the same database transaction.
CREATE OR REPLACE FUNCTION "create_notification_outbox_from_audit"() RETURNS trigger AS $$
BEGIN
  IF NEW.entityId IS NOT NULL AND NEW.action IN (
    'REGISTRATION_SUBMITTED','REGISTRATION_RESUBMITTED',
    'INSTITUTION_APPLICATION_SUBMITTED','INSTITUTION_APPLICATION_RESUBMITTED',
    'LICENSE_APPLICATION_CREATED','LICENSE_APPLICATION_REVIEWED','LICENSE_CORRECTION_REQUESTED','LICENSE_APPROVED','LICENSE_REJECTED','LICENSE_RESUBMITTED','LICENSE_ISSUED','LICENSE_EXPIRED',
    'MEMBERSHIP_REQUESTED','MEMBERSHIP_ACTIVE','MEMBERSHIP_SUSPENDED','MEMBERSHIP_ENDED',
    'CREDENTIAL_ISSUED','CREDENTIAL_PUBLISHED'
  ) THEN
    INSERT INTO "OutboxEvent" ("eventId","sourceAuditLogId","eventType","aggregateType","aggregateId","payload")
    VALUES (
      NEW.id,
      NEW.id,
      NEW.action,
      NEW.entityType,
      CASE WHEN NEW.entityId ~ '^[0-9a-fA-F-]{36}$' THEN NEW.entityId::uuid ELSE NULL END,
      jsonb_build_object('action', NEW.action, 'entityType', NEW.entityType, 'entityId', NEW.entityId, 'metadata', COALESCE(NEW.metadata, '{}'::jsonb))
    )
    ON CONFLICT (sourceAuditLogId) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditLog_notification_outbox_after_insert"
AFTER INSERT ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION "create_notification_outbox_from_audit"();
