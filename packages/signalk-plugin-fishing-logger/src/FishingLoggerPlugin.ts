import fs from 'fs/promises';
import * as awsIot from 'aws-iot-device-sdk';
import { Plugin, ServerAPI } from "@signalk/server-api";
import { activate } from './activate.js';
import { generateCsr, generateKeyPair } from './crypto-utils.js';

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
    this.running = true;
    const options = config as FishingLoggerPluginOptions

    const server = this.server;

    const pluginDir = server.getDataDirPath();
    const configPath = pluginDir + '/iot-config.json';
    const privateKeyPath = pluginDir + '/private-key.pem';
    const publicKeyPath = pluginDir + '/public-key.pem';
    server.debug('ship id: ' + options.ship_id);
    server.debug('pluginDir: ' + pluginDir);

    await fs.mkdir(pluginDir, { recursive: true });

    let configData = null as { iot_endpoint: string, client_id: string, certificate: string, ca_certificate: string } | null
    try {
      const configString = await fs.readFile(configPath, 'utf8')
      configData = JSON.parse(configString);
    } catch (e) {
      server.debug('error while reading config file: ' + e);
      configData = null;
    }

    if (configData === null) {
      server.debug("ship not activated")
      let retryCount = 0;

      while (this.running) {
        retryCount++;

        try {
          let privateKey: string
          let publicKey: string
          try {
            privateKey = await fs.readFile(privateKeyPath, 'utf8')
            publicKey = await fs.readFile(publicKeyPath, 'utf8')
          } catch (e) {
            const keyPair = generateKeyPair();
            privateKey = keyPair.privateKey;
            publicKey = keyPair.publicKey;
            await fs.writeFile(privateKeyPath, privateKey, 'utf8');
            await fs.writeFile(publicKeyPath, publicKey, 'utf8');
          }

          const csrPath = pluginDir + '/cert.csr';
          let csr: string
          try {
            csr = await fs.readFile(csrPath, 'utf8')
          } catch (e) {
            csr = generateCsr(privateKey, publicKey, options.ship_id).csrData;
            await fs.writeFile(csrPath, csr, 'utf8');
          }

          const endpoint = process.env.FISHING_LOGGER_ENDPOINT || 'https://7i11vuoghc.execute-api.ap-northeast-1.amazonaws.com';
          server.debug("using endpoint: " + endpoint);

          //configData = await activate(endpoint, options.ship_id, csr);
        } catch (e) {
          server.error("error while activation: " + e);
        }
        if (configData !== null) {
          server.debug("ship activation succeeded: " + JSON.stringify(configData));
          await fs.writeFile(configPath, JSON.stringify(configData), 'utf8');
          break;
        }
        if (retryCount >= 3) {
          server.error("ship activation failed.")
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
      if (!this.running) {
        server.debug("finished running.")
        return;
      }
    } else {
      server.debug(JSON.stringify(configData))
    }

    // Here we put our plugin logic
    server.debug("Plugin started");

    const device = new awsIot.device({
      keyPath: privateKeyPath,
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