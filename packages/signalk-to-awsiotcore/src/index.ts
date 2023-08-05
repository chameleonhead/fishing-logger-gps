import { ServerAPI } from '@signalk/server-api';
import { SignalKToAWSIoTCorePlugin } from './SignalKToAWSIoTCorePlugin';

export = function (server: ServerAPI & { streambundle: { getAvailablePaths(): string[] } }) {
  return new SignalKToAWSIoTCorePlugin(server);
}
