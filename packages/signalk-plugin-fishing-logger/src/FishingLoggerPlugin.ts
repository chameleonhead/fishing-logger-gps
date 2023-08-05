import * as awsIot from 'aws-iot-device-sdk';
import { Plugin, ServerAPI } from "@signalk/server-api";
import { activate } from './activate';
import fs from 'fs/promises';

const CONFIG_SCHEMA = {
  type: 'object',
  required: [
    'ship_id'
  ],
  properties: {
    ship_id: {
      type: 'string',
      format: 'string',
      title: 'Ship ID',
    },
  }
}

type FishingLoggerPluginOptions = {
  ship_id: string;
}

export class FishingLoggerPlugin implements Plugin {
  public id = "signalk-plugin-fishing-logger"
  public name = "Plugin for Fishing Logger"

  private running = false;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(private server: ServerAPI & { streambundle: { getAvailablePaths(): string[] } },) {
  }

  async start(config: object, restart: (newConfiguration: object) => void) {
    const options = config as FishingLoggerPluginOptions

    const server = this.server;

    const configPath = server.getDataDirPath() + '/signalk-plugin-fishing-logger.json';
    server.debug('configPath: ' + configPath);

    let configData = null as { iot_endpoint: string, client_id: string, certificate: string, ca_certificate: string, private_key: string } | null
    try {
      configData = JSON.parse(await fs.readFile(configPath, 'utf8'));
    } catch (e) {
      server.error('error while reading config file: ' + e);
    }

    if (configData === null) {
      while (this.running) {
        configData = await activate(options.ship_id);
        if (configData !== null) {
          await fs.writeFile(configPath, JSON.stringify(configData), 'utf8');
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Here we put our plugin logic
    server.debug("Plugin started");

    const device = new awsIot.device({
      privateKey: Buffer.from(configData!.private_key),
      clientCert: Buffer.from(configData!.certificate),
      caCert: Buffer.from(configData!.ca_certificate),
      clientId: configData!.client_id,
      host: configData!.iot_endpoint,
      keepalive: 100,
      debug: true,
    });

    this.interval = setInterval(() => {
      server.debug("Interval");
      let hasValue = false;
      const uuid = server.getSelfPath("uuid");
      if (!uuid) {
        server.debug("uuid is not set.")
        return;
      }
      const availablePaths = server.streambundle.getAvailablePaths();
      server.debug("Available Paths:" + JSON.stringify(availablePaths));
      const message = {} as any;
      for (const path of availablePaths) {
        try {
          const value = server.getSelfPath(path);
          if (typeof value !== 'undefined') {
            message[path] = typeof value.value === 'undefined' ? value : value.value;
            hasValue = true;
          }
        } catch (e) {
          server.error('error while getting path :' + path);
        }
      }
      if (!hasValue) {
        return;
      }
      device.publish(`ships/${configData!.client_id}/state`, JSON.stringify(message), { qos: 1 });
      server.debug(`Published message to topic ship/${configData!.client_id}/state:  ${JSON.stringify(message)}`);
    }, 30000)

    device.on('connect', () => {
      server.debug("Device connected.");
      server.setPluginStatus("Online");
    })
    device.on('close', function () {
      server.setPluginStatus("Offline");
      server.debug("Device closed.");
    });
    device.on('offline', () => {
      server.debug("Device disconnected.");
      server.setPluginStatus("Offline");
    })
    device.on('reconnect', () => {
      server.debug("Device reconnected.");
      server.setPluginStatus("Online");
    })
    device.on('message', (topic, payload) => {
      server.debug(`Message ${topic}:${payload.toString()}`);
    });
    device.on('error', (error) => {
      server.error(typeof error === 'string' ? error : error.message);
    })
  }
  stop() {
    this.running = false;
    if (this.interval != null) {
      clearInterval(this.interval);
    }
    this.server.debug("Plugin stopped");
  }
  schema() {
    return CONFIG_SCHEMA
  }
}
