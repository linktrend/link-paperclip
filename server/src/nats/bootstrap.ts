import {
  AckPolicy,
  DiscardPolicy,
  DeliverPolicy,
  ReplayPolicy,
  RetentionPolicy,
  StorageType,
  connect,
  type ConsumerConfig,
  type ConsumerUpdateConfig,
  type JetStreamManager,
  type StreamConfig,
  type StreamUpdateConfig,
} from "nats";
import {
  AIOS_NATS_CONSUMERS,
  AIOS_NATS_STREAM,
  AIOS_NATS_STREAM_SUBJECTS,
} from "./constants.js";

type RuntimeConfig = {
  natsServers: string[];
  stream: string;
  maxDeliver: number;
  ackWaitMs: number;
  maxAckPending: number;
};

type ConsumerDefinition = {
  durable: string;
  description: string;
  filterSubjects: readonly string[];
  fallbackFilterSubject: string;
};

function toNanos(ms: number): number {
  return ms * 1_000_000;
}

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readRuntimeConfig(): RuntimeConfig {
  const serversRaw = process.env.AIOS_NATS_URL ?? process.env.NATS_URL ?? "nats://127.0.0.1:4222";
  const natsServers = serversRaw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return {
    natsServers,
    stream: process.env.AIOS_NATS_STREAM?.trim() || AIOS_NATS_STREAM,
    maxDeliver: parseIntEnv("AIOS_NATS_MAX_DELIVER", 10),
    ackWaitMs: parseIntEnv("AIOS_NATS_ACK_WAIT_MS", 90_000),
    maxAckPending: parseIntEnv("AIOS_NATS_MAX_ACK_PENDING", 2_000),
  };
}

function isNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("not found") || message.includes("404");
}

function supportsFilterSubjectsError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes("filter_subjects requires server");
}

function baseConsumerCreateConfig(
  runtime: RuntimeConfig,
  consumer: ConsumerDefinition,
): Partial<ConsumerConfig> {
  return {
    durable_name: consumer.durable,
    name: consumer.durable,
    description: consumer.description,
    ack_policy: AckPolicy.Explicit,
    deliver_policy: DeliverPolicy.New,
    replay_policy: ReplayPolicy.Instant,
    ack_wait: toNanos(runtime.ackWaitMs),
    max_deliver: runtime.maxDeliver,
    max_ack_pending: runtime.maxAckPending,
    inactive_threshold: toNanos(7 * 24 * 60 * 60 * 1_000),
    backoff: [
      toNanos(1_000),
      toNanos(5_000),
      toNanos(30_000),
      toNanos(120_000),
      toNanos(600_000),
    ],
  };
}

function baseConsumerUpdateConfig(runtime: RuntimeConfig, description: string): Partial<ConsumerUpdateConfig> {
  return {
    description,
    ack_wait: toNanos(runtime.ackWaitMs),
    max_deliver: runtime.maxDeliver,
    max_ack_pending: runtime.maxAckPending,
    inactive_threshold: toNanos(7 * 24 * 60 * 60 * 1_000),
    backoff: [
      toNanos(1_000),
      toNanos(5_000),
      toNanos(30_000),
      toNanos(120_000),
      toNanos(600_000),
    ],
  };
}

function applyFiltersForCreate(
  config: Partial<ConsumerConfig>,
  filterSubjects: readonly string[],
): Partial<ConsumerConfig> {
  if (filterSubjects.length === 1) {
    return {
      ...config,
      filter_subject: filterSubjects[0],
      filter_subjects: undefined,
    };
  }
  return {
    ...config,
    filter_subject: undefined,
    filter_subjects: [...filterSubjects],
  };
}

function applyFiltersForUpdate(
  config: Partial<ConsumerUpdateConfig>,
  filterSubjects: readonly string[],
): Partial<ConsumerUpdateConfig> {
  if (filterSubjects.length === 1) {
    return {
      ...config,
      filter_subject: filterSubjects[0],
      filter_subjects: undefined,
    };
  }
  return {
    ...config,
    filter_subject: undefined,
    filter_subjects: [...filterSubjects],
  };
}

function streamCreateConfig(runtime: RuntimeConfig): Partial<StreamConfig> {
  return {
    name: runtime.stream,
    description: "Canonical AIOS MVO event ledger stream",
    subjects: [...AIOS_NATS_STREAM_SUBJECTS],
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    discard: DiscardPolicy.Old,
    max_msgs: -1,
    max_bytes: -1,
    max_msg_size: -1,
    max_msgs_per_subject: -1,
    max_consumers: -1,
    max_age: toNanos(30 * 24 * 60 * 60 * 1_000),
    duplicate_window: toNanos(2 * 60 * 1_000),
    num_replicas: parseIntEnv("AIOS_NATS_STREAM_REPLICAS", 1),
    deny_delete: false,
    deny_purge: false,
    sealed: false,
    first_seq: 0,
  };
}

function streamUpdateConfig(runtime: RuntimeConfig): Partial<StreamUpdateConfig> {
  return {
    description: "Canonical AIOS MVO event ledger stream",
    subjects: [...AIOS_NATS_STREAM_SUBJECTS],
    discard: DiscardPolicy.Old,
    max_msgs: -1,
    max_bytes: -1,
    max_msg_size: -1,
    max_msgs_per_subject: -1,
    max_age: toNanos(30 * 24 * 60 * 60 * 1_000),
    duplicate_window: toNanos(2 * 60 * 1_000),
    num_replicas: parseIntEnv("AIOS_NATS_STREAM_REPLICAS", 1),
    deny_delete: false,
    deny_purge: false,
  };
}

async function ensureStream(jsm: JetStreamManager, runtime: RuntimeConfig): Promise<void> {
  const createConfig = streamCreateConfig(runtime);
  const updateConfig = streamUpdateConfig(runtime);

  try {
    await jsm.streams.info(runtime.stream);
    await jsm.streams.update(runtime.stream, updateConfig);
    console.log(`updated stream ${runtime.stream}`);
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
    await jsm.streams.add(createConfig);
    console.log(`created stream ${runtime.stream}`);
  }
}

async function addOrUpdateConsumer(
  jsm: JetStreamManager,
  runtime: RuntimeConfig,
  consumer: ConsumerDefinition,
): Promise<void> {
  const createConfig = applyFiltersForCreate(baseConsumerCreateConfig(runtime, consumer), consumer.filterSubjects);
  const updateConfig = applyFiltersForUpdate(
    baseConsumerUpdateConfig(runtime, consumer.description),
    consumer.filterSubjects,
  );

  try {
    await jsm.consumers.info(runtime.stream, consumer.durable);
    await jsm.consumers.update(runtime.stream, consumer.durable, updateConfig);
    console.log(`updated consumer ${consumer.durable}`);
    return;
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }

  try {
    await jsm.consumers.add(runtime.stream, createConfig);
    console.log(`created consumer ${consumer.durable}`);
  } catch (error) {
    if (!supportsFilterSubjectsError(error)) {
      throw error;
    }

    const fallbackConfig: Partial<ConsumerConfig> = {
      ...baseConsumerCreateConfig(runtime, consumer),
      filter_subject: consumer.fallbackFilterSubject,
    };
    await jsm.consumers.add(runtime.stream, fallbackConfig);
    console.log(`created consumer ${consumer.durable} using fallback filter ${consumer.fallbackFilterSubject}`);
  }
}

async function ensureConsumers(jsm: JetStreamManager, runtime: RuntimeConfig): Promise<void> {
  const consumers: ConsumerDefinition[] = [
    AIOS_NATS_CONSUMERS.openClawManagement,
    AIOS_NATS_CONSUMERS.agentZeroExecution,
    AIOS_NATS_CONSUMERS.paperclipAudit,
  ];

  for (const consumer of consumers) {
    await addOrUpdateConsumer(jsm, runtime, consumer);
  }
}

export async function main(): Promise<void> {
  const runtime = readRuntimeConfig();

  console.log(`connecting to NATS: ${runtime.natsServers.join(", ")}`);
  const nc = await connect({ servers: runtime.natsServers });

  try {
    const jsm = await nc.jetstreamManager();
    await ensureStream(jsm, runtime);
    await ensureConsumers(jsm, runtime);
    console.log("AIOS NATS bootstrap completed.");
  } finally {
    await nc.drain();
  }
}

void main().catch((error) => {
  console.error("AIOS NATS bootstrap failed:", error);
  process.exitCode = 1;
});
