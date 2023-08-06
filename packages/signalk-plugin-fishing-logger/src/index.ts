import { ServerAPI } from "@signalk/server-api";
import { FishingLoggerPlugin } from "./FishingLoggerPlugin.js";

export = function (
  server: ServerAPI & { streambundle: { getAvailablePaths(): string[] } },
) {
  return new FishingLoggerPlugin(server);
};
