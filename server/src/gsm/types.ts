export type GsmSystemKey =
  | "supabase_service_role"
  | "linkbrain_system_api"
  | "aios_ingress_token";

export interface GsmProvider {
  id: string;
  getSystemKey(key: GsmSystemKey): string | null;
}
