import { Plugin, ResourcesApi, ServerAPI } from '@signalk/server-api'
import * as awsIot from 'aws-iot-device-sdk';

type SignalKToAWSIoTCoreOptions = {
  host: string;
  client_id: string;
  private_key: string;
  client_cert: string;
  ca_cert: string;
  send_intervals: number
}

const CONFIG_SCHEMA = {
  type: 'object',
  required: [
    'host',
    'client_id',
    'private_key',
    'client_cert',
  ],
  properties: {
    host: {
      type: 'string',
      format: 'hostname',
      title: 'AWS IoT endpoint you will use to connect',
    },
    client_id: {
      type: 'string',
      title: 'client ID you will use to connect to AWS IoT (name of thing)',
    },
    private_key: {
      type: 'string',
      title: 'private key file associated with the client certificate',
    },
    client_cert: {
      type: 'string',
      title: 'client certificate',
    },
    ca_cert: {
      type: 'string',
      title: 'CA certificate',
    },
    send_intervals: {
      type: 'number',
      title: 'interval seconds to send data to AWS IoT',
      default: 30,
    }
  }
}

const CONFIG_UISCHEMA = {
  private_key: {
    'ui:widget': 'textarea',
  },
  client_cert: {
    'ui:widget': 'textarea',
  },
  ca_cert: {
    'ui:widget': 'textarea',
  },
}

export = function (server: ServerAPI & { streambundle: { getAvailablePaths(): string[] } }) {
  let interval: ReturnType<typeof setTimeout> | null = null;
  const plugin: Plugin = {
    id: "signalk-to-awsiotcore",
    name: "SignalK AWS IoT Core Plugin",

    start: function (op, restartPlugin) {
      const options = op as SignalKToAWSIoTCoreOptions
      // Here we put our plugin logic
      server.debug("Plugin started");

      const device = new awsIot.device({
        privateKey: Buffer.from(options.private_key),
        clientCert: Buffer.from(options.client_cert),
        caCert: Buffer.from(options.ca_cert),
        clientId: options.client_id,
        host: options.host,
        keepalive: 100,
        debug: true,
      });

      interval = setInterval(() => {
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
        device.publish(`ships/${options.client_id}/state`, JSON.stringify(message), { qos: 1 });
        server.debug(`Published message to topic ship/${options.client_id}/state:  ${JSON.stringify(message)}`);
      }, (options.send_intervals || 30) * 1000)

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
    },

    stop: function () {
      if (interval != null) {
        clearInterval(interval);
      }
      server.debug("Plugin stopped");
    },

    schema: () => CONFIG_SCHEMA,
    uiSchema: () => CONFIG_UISCHEMA,
  }

  return plugin;
}
