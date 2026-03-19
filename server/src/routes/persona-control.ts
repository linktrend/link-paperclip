import { Router, type Request } from "express";
import type { Db } from "@paperclipai/db";
import { z } from "zod";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";
import { personaControlService } from "../services/index.js";

const ENTITY_QUERY_SCHEMA = z.object({
  entityKind: z.string().optional()
});

const REVISION_QUERY_SCHEMA = z.object({
  entityId: z.string().uuid().optional()
});

const APPROVAL_QUEUE_QUERY_SCHEMA = z.object({
  status: z.enum(["review", "approved"]).optional()
});

const CREATE_ENTITY_SCHEMA = z.object({
  entityKind: z.enum(["persona", "policy", "guideline", "guardrail", "sop"]),
  contentKind: z.string().min(1),
  scopeKind: z.enum(["global", "type", "role", "agent_override", "memory_seed", "runtime_rules"]),
  scopeKey: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(["draft", "review", "approved", "published", "deprecated"]).optional(),
  body: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
  publishImmediately: z.boolean().optional()
});

const CREATE_REVISION_SCHEMA = z.object({
  entityId: z.string().uuid(),
  status: z.enum(["draft", "review", "approved", "published", "deprecated"]).optional(),
  body: z.string().min(1),
  metadata: z.record(z.unknown()).optional()
});

const PUBLISH_REVISION_SCHEMA = z.object({
  entityId: z.string().uuid(),
  revisionId: z.string().uuid(),
  reason: z.string().min(1).optional(),
  compileTargets: z.array(z.string().min(3)).optional()
});

const ROLLBACK_REVISION_SCHEMA = z.object({
  entityId: z.string().uuid(),
  targetRevisionId: z.string().uuid(),
  reason: z.string().min(3)
});

const IMPORT_SCHEMA = z.object({
  publishImported: z.boolean().optional()
});

const SYNC_ACK_SCHEMA = z.object({
  dprId: z.string().min(3),
  acknowledgedRevisionHash: z.string().min(16),
  policyPackage: z.string().min(1).optional(),
  metadata: z.record(z.unknown()).optional()
});

const POLICY_SCHEMA = z.object({
  missionId: z.string().uuid().optional(),
  runId: z.string().min(3),
  taskId: z.string().min(3),
  dprId: z.string().min(3),
  policyPackage: z.string().min(1).optional(),
  toolName: z.string().min(1).optional(),
  destination: z.string().min(1),
  dataSensitivity: z.enum(["low", "medium", "high"]).optional(),
  allowlist: z.array(z.string().min(1)).optional(),
  metadata: z.record(z.unknown()).optional()
});

const KILLSWITCH_SCHEMA = z.object({
  missionId: z.string().uuid().optional(),
  runId: z.string().min(3),
  taskId: z.string().min(3),
  actorDprId: z.string().min(3).optional(),
  scope: z.enum(["agent", "workflow", "tenant", "global"]),
  targetKey: z.string().min(1),
  state: z.enum(["active", "released"]),
  reason: z.string().min(3),
  metadata: z.record(z.unknown()).optional()
});

export function personaControlRoutes(_db: Db) {
  const router = Router();
  const personaControl = personaControlService();

  function assertReadAccess(req: Request, companyId: string) {
    assertCompanyAccess(req, companyId);
  }

  function assertWriteAccess(req: Request, companyId: string) {
    assertCompanyAccess(req, companyId);
    assertBoard(req);
  }

  router.get("/companies/:companyId/persona/readiness", async (req, res) => {
    try {
      assertReadAccess(req, req.params.companyId);
      const payload = await personaControl.getReadiness();
      return res.json(payload);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load readiness" });
    }
  });

  router.get("/companies/:companyId/persona/entities", async (req, res) => {
    const parsed = ENTITY_QUERY_SCHEMA.safeParse({ entityKind: req.query.entityKind });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      assertReadAccess(req, req.params.companyId);
      const payload = await personaControl.listEntities(parsed.data.entityKind);
      return res.json(payload);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to list entities" });
    }
  });

  router.get("/companies/:companyId/persona/revisions", async (req, res) => {
    const parsed = REVISION_QUERY_SCHEMA.safeParse({ entityId: req.query.entityId });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      assertReadAccess(req, req.params.companyId);
      const payload = await personaControl.listRevisions(parsed.data.entityId);
      return res.json(payload);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to list revisions" });
    }
  });

  router.get("/companies/:companyId/persona/approvals/queue", async (req, res) => {
    const parsed = APPROVAL_QUEUE_QUERY_SCHEMA.safeParse({ status: req.query.status });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      assertReadAccess(req, req.params.companyId);
      const payload = await personaControl.approvalQueue(parsed.data.status);
      return res.json(payload);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load approval queue" });
    }
  });

  router.get("/companies/:companyId/persona/compile/preview", async (req, res) => {
    const dprId = typeof req.query.dprId === "string" ? req.query.dprId.trim() : "";
    if (!dprId) {
      return res.status(400).json({ error: "dprId is required" });
    }

    try {
      assertReadAccess(req, req.params.companyId);
      const payload = await personaControl.compilePreview(dprId);
      return res.json(payload);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to preview compile output" });
    }
  });

  router.get("/companies/:companyId/persona/compile/diff", async (req, res) => {
    const dprId = typeof req.query.dprId === "string" ? req.query.dprId.trim() : "";
    if (!dprId) {
      return res.status(400).json({ error: "dprId is required" });
    }

    try {
      assertReadAccess(req, req.params.companyId);
      const payload = await personaControl.compileDiff(dprId);
      return res.json(payload);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to build compile diff" });
    }
  });

  router.get("/companies/:companyId/persona/bundles/:dprId", async (req, res) => {
    try {
      assertReadAccess(req, req.params.companyId);
      const payload = await personaControl.getBundle(req.params.dprId);
      return res.json(payload);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch bundle" });
    }
  });

  router.post("/companies/:companyId/persona/entities", async (req, res) => {
    const parsed = CREATE_ENTITY_SCHEMA.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      assertWriteAccess(req, req.params.companyId);
      const actor = getActorInfo(req);
      const payload = await personaControl.createEntity({
        ...parsed.data,
        createdByDprId: actor.actorId
      });
      return res.status(201).json(payload);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create entity" });
    }
  });

  router.post("/companies/:companyId/persona/revisions", async (req, res) => {
    const parsed = CREATE_REVISION_SCHEMA.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      assertWriteAccess(req, req.params.companyId);
      const actor = getActorInfo(req);
      const payload = await personaControl.createRevision({
        ...parsed.data,
        createdByDprId: actor.actorId
      });
      return res.status(201).json(payload);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create revision" });
    }
  });

  router.post("/companies/:companyId/persona/revisions/publish", async (req, res) => {
    const parsed = PUBLISH_REVISION_SCHEMA.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      assertWriteAccess(req, req.params.companyId);
      const actor = getActorInfo(req);
      const payload = await personaControl.publishRevision({
        ...parsed.data,
        actorDprId: actor.actorId
      });
      return res.status(202).json(payload);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to publish revision" });
    }
  });

  router.post("/companies/:companyId/persona/revisions/rollback", async (req, res) => {
    const parsed = ROLLBACK_REVISION_SCHEMA.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      assertWriteAccess(req, req.params.companyId);
      const actor = getActorInfo(req);
      const payload = await personaControl.rollbackRevision({
        ...parsed.data,
        actorDprId: actor.actorId
      });
      return res.status(202).json(payload);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to rollback revision" });
    }
  });

  router.post("/companies/:companyId/persona/migration/import-local", async (req, res) => {
    const parsed = IMPORT_SCHEMA.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      assertWriteAccess(req, req.params.companyId);
      const actor = getActorInfo(req);
      const payload = await personaControl.importLocal({
        ...parsed.data,
        actorDprId: actor.actorId
      });
      return res.status(202).json(payload);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to import persona files" });
    }
  });

  router.post("/companies/:companyId/persona/migration/compile-all", async (req, res) => {
    const parsed = IMPORT_SCHEMA.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      assertWriteAccess(req, req.params.companyId);
      const actor = getActorInfo(req);
      const payload = await personaControl.compileAll({
        ...parsed.data,
        actorDprId: actor.actorId
      });
      return res.status(202).json(payload);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to compile persona bundles" });
    }
  });

  router.get("/companies/:companyId/persona/migration/parity", async (req, res) => {
    try {
      assertReadAccess(req, req.params.companyId);
      const payload = await personaControl.parity();
      return res.json(payload);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to compute parity" });
    }
  });

  router.get("/companies/:companyId/persona/migration/evidence", async (req, res) => {
    try {
      assertReadAccess(req, req.params.companyId);
      const payload = await personaControl.migrationEvidence();
      return res.json(payload);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to build migration evidence" });
    }
  });

  router.post("/companies/:companyId/persona/sync/ack", async (req, res) => {
    const parsed = SYNC_ACK_SCHEMA.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      assertWriteAccess(req, req.params.companyId);
      const payload = await personaControl.acknowledgeSync(parsed.data);
      return res.status(202).json(payload);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to acknowledge sync" });
    }
  });

  router.post("/companies/:companyId/policies/evaluate", async (req, res) => {
    const parsed = POLICY_SCHEMA.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      assertWriteAccess(req, req.params.companyId);
      const payload = await personaControl.evaluatePolicy(parsed.data);
      return res.status(202).json(payload);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to evaluate policy" });
    }
  });

  router.post("/companies/:companyId/policies/killswitch", async (req, res) => {
    const parsed = KILLSWITCH_SCHEMA.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      assertWriteAccess(req, req.params.companyId);
      const actor = getActorInfo(req);
      const payload = await personaControl.setKillSwitch({
        ...parsed.data,
        actorDprId: parsed.data.actorDprId ?? actor.actorId
      });
      return res.status(202).json(payload);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to set kill switch" });
    }
  });

  return router;
}
