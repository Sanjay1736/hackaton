import "server-only";
import { mockTasteProvider } from "./mock-taste-provider";
import { qlooTasteProvider } from "./qloo-taste-provider";
import { ServiceError } from "../qloo/client";
export function getTasteProvider() {
  const mode = process.env.TASTEWEAVE_DATA_MODE ?? "mock";
  if (mode === "mock") return mockTasteProvider;
  if (mode === "live") return qlooTasteProvider;
  throw new ServiceError("TASTEWEAVE_DATA_MODE must be mock or live.", 503);
}
