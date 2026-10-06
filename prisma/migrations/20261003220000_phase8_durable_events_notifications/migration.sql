-- Phase 8 follow-up: install the transactional audit-to-outbox bridge.
-- The preceding 20261003190000 migration owns the durable tables/types.
-- Keeping this migration focused on the trigger makes fresh and already-migrated
-- databases converge without attempting to recreate existing tables/types.

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
      jsonb_build_object(
        'action', NEW.action,
        'entityType', NEW.entityType,
        'entityId', NEW.entityId,
        'metadata', COALESCE(NEW.metadata, '{}'::jsonb)
      )
    )
    ON CONFLICT (sourceAuditLogId) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "AuditLog_notification_outbox_after_insert" ON "AuditLog";

CREATE TRIGGER "AuditLog_notification_outbox_after_insert"
AFTER INSERT ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION "create_notification_outbox_from_audit"();
