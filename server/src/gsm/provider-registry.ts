import { unprocessable } from "../errors.js";
import { linklogicEnvGsmProvider } from "./providers/linklogic-env-provider.js";
import type { GsmProvider } from "./types.js";

const providers: GsmProvider[] = [linklogicEnvGsmProvider];
const providerById = new Map<string, GsmProvider>(providers.map((provider) => [provider.id, provider]));

export function getGsmProvider(id = "linklogic_env"): GsmProvider {
  const provider = providerById.get(id);
  if (!provider) throw unprocessable(`Unsupported GSM provider: ${id}`);
  return provider;
}
