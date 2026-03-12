import { HttpError } from "../server/src/errors.js";
import {
  assertAndSealTenantId,
  buildValidatedMissionPayload,
  MissionPayloadSchema,
} from "../server/src/services/mission-contract.js";

const VALID_TENANT = "11111111-1111-4111-8111-111111111111";
const OTHER_TENANT = "22222222-2222-4222-8222-222222222222";

function verifyMissionSchema() {
  const candidate = {
    missionId: "33333333-3333-4333-8333-333333333333",
    tenantId: VALID_TENANT,
    dprId: "INT-MNG-260311-ABCD-demo_task",
    goal: "Tenant-safe mission",
    status: "active",
    runId: "run_123456789012",
    taskId: "task_1234",
  };
  const parsed = MissionPayloadSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error(`MissionPayloadSchema validation failed: ${JSON.stringify(parsed.error.flatten())}`);
  }
}

function verifyTenantHardConflict() {
  let threw = false;
  try {
    assertAndSealTenantId(VALID_TENANT, "mission payload", {
      tenant_id: OTHER_TENANT,
      missionId: "33333333-3333-4333-8333-333333333333",
      runId: "run_123456789012",
      taskId: "task_1234",
      goal: "Should fail",
      status: "active",
      dpr_id: "INT-MNG-260311-ABCD-demo_task",
    });
  } catch (err) {
    threw = true;
    if (!(err instanceof HttpError) || err.status !== 409) {
      throw new Error(`Expected hard conflict (409), got: ${String(err)}`);
    }
  }

  if (!threw) {
    throw new Error("Expected hard conflict on tenant mismatch, but dispatch was allowed");
  }
}

function verifyMalformedDprRejectedBeforeNetwork() {
  let threw = false;
  try {
    buildValidatedMissionPayload({
      missionId: "33333333-3333-4333-8333-333333333333",
      tenantId: VALID_TENANT,
      dprId: "MNG-260311-ABCD-demo_task", // malformed: missing INT- prefix
      goal: "Reject malformed DPR",
      status: "active",
      runId: "run_123456789012",
      taskId: "task_1234",
    });
  } catch (err) {
    threw = true;
    if (!(err instanceof HttpError) || err.status !== 409) {
      throw new Error(`Expected schema conflict (409), got: ${String(err)}`);
    }
  }
  if (!threw) {
    throw new Error("Expected malformed dprId to be rejected before network layer");
  }
}

verifyMissionSchema();
verifyTenantHardConflict();
verifyMalformedDprRejectedBeforeNetwork();
console.log("AIOS compliance verified: Double-Gate passed (tenant mismatch conflict + malformed DPR rejection).");
