export const AIOS_NATS_SCHEMA_VERSION = "2026-03-17";

export const AIOS_NATS_STREAM = "AIOS_EVENTS";

export const AIOS_EVENT_TYPES = [
  "aios.task.created",
  "aios.task.assigned",
  "aios.task.accepted",
  "aios.task.progress",
  "aios.task.handoff",
  "aios.task.completed",
  "aios.task.failed",
  "aios.approval.requested",
  "aios.approval.decided",
  "aios.security.exception",
] as const;

export type AiosEventType = (typeof AIOS_EVENT_TYPES)[number];

export const AIOS_NATS_STREAM_SUBJECTS = ["aios.task.*", "aios.approval.*", "aios.security.*"] as const;

export const AIOS_NATS_CONSUMERS = {
  openClawManagement: {
    durable: "OPENCLAW_MANAGEMENT",
    description: "OpenClaw management consumer for assignment + approval intake",
    filterSubjects: ["aios.task.created", "aios.task.assigned", "aios.approval.requested"],
    fallbackFilterSubject: "aios.>",
  },
  agentZeroExecution: {
    durable: "AGENTZERO_EXECUTION",
    description: "AgentZero execution consumer for assigned + handoff tasks",
    filterSubjects: ["aios.task.assigned", "aios.task.handoff"],
    fallbackFilterSubject: "aios.task.*",
  },
  paperclipAudit: {
    durable: "PAPERCLIP_AUDIT",
    description: "Paperclip governance/audit projection for all AIOS lifecycle events",
    filterSubjects: ["aios.>"],
    fallbackFilterSubject: "aios.>",
  },
} as const;

export type AiosNatsConsumerKey = keyof typeof AIOS_NATS_CONSUMERS;

export type AiosEventEnvelope = {
  event_id: string;
  event_type: AiosEventType;
  occurred_at: string;
  schema_version: string;
  tenant_id: string;
  mission_id: string;
  run_id: string;
  task_id: string;
  from_dpr_id: string;
  to_dpr_id: string | null;
  correlation_id: string;
  idempotency_key: string;
  payload: Record<string, unknown>;
};
