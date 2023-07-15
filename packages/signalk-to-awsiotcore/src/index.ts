import { Plugin, ServerAPI } from '@signalk/server-api'
import * as awsIot from 'aws-iot-device-sdk';

type SignalKToAWSIoTCoreOptions = {
  host: string;
  client_id: string;
  private_key: string;
  client_cert: string;
  ca_cert: string;
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
      title: 'AWS IoT endpoint hostname',
    },
    client_id: {
      type: 'string',
      title: 'AWS IoT client ID (must match Thing name)',
    },
    private_key: {
      type: 'string',
      title: 'AWS IoT device private key',
    },
    client_cert: {
      type: 'string',
      title: 'AWS IoT device certificate',
    },
    ca_cert: {
      type: 'string',
      title: 'AWS IoT certificate authority',
      default: `-----BEGIN CERTIFICATE-----
MIIDQTCCAimgAwIBAgITBmyfz5m/jAo54vB4ikPmljZbyjANBgkqhkiG9w0BAQsF
ADA5MQswCQYDVQQGEwJVUzEPMA0GA1UEChMGQW1hem9uMRkwFwYDVQQDExBBbWF6
b24gUm9vdCBDQSAxMB4XDTE1MDUyNjAwMDAwMFoXDTM4MDExNzAwMDAwMFowOTEL
MAkGA1UEBhMCVVMxDzANBgNVBAoTBkFtYXpvbjEZMBcGA1UEAxMQQW1hem9uIFJv
b3QgQ0EgMTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALJ4gHHKeNXj
ca9HgFB0fW7Y14h29Jlo91ghYPl0hAEvrAIthtOgQ3pOsqTQNroBvo3bSMgHFzZM
9O6II8c+6zf1tRn4SWiw3te5djgdYZ6k/oI2peVKVuRF4fn9tBb6dNqcmzU5L/qw
IFAGbHrQgLKm+a/sRxmPUDgH3KKHOVj4utWp+UhnMJbulHheb4mjUcAwhmahRWa6
VOujw5H5SNz/0egwLX0tdHA114gk957EWW67c4cX8jJGKLhD+rcdqsq08p8kDi1L
93FcXmn/6pUCyziKrlA4b9v7LWIbxcceVOF34GfID5yHI9Y/QCB/IIDEgEw+OyQm
jgSubJrIqg0CAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAOBgNVHQ8BAf8EBAMC
AYYwHQYDVR0OBBYEFIQYzIU07LwMlJQuCFmcx7IQTgoIMA0GCSqGSIb3DQEBCwUA
A4IBAQCY8jdaQZChGsV2USggNiMOruYou6r4lK5IpDB/G/wkjUu0yKGX9rbxenDI
U5PMCCjjmCXPI6T53iHTfIUJrU6adTrCC2qJeHZERxhlbI1Bjjt/msv0tadQ1wUs
N+gDS63pYaACbvXy8MWy7Vu33PqUXHeeE6V/Uq2V8viTO96LXFvKWlJbYK8U90vv
o/ufQJVtMVT8QtPHRh8jrdkPSHCa2XV4cdFyQzR1bldZwgJcJmApzyMZFo6IQ6XU
5MsI+yMRQ+hDKXJioaldXgjUkK642M4UwtBV8ob2xJNDd2ZhwLnoQdeXeGADbkpy
rqXRfboQnoZsG4q5WTP468SQvvG5
-----END CERTIFICATE-----`,
    },
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
  send_states: {
    'ui:widget': 'checkboxes',
  },
}

export = function (server: ServerAPI) {
  var plugin: Plugin = {
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
        host: options.host
      });

      device.on('connect', () => {
        server.debug("Connect");
      })
      device.on('message', (topic, payload) => {
        server.debug(`Message ${topic}:${payload.toString()}`);
      });
    },

    stop: function () {
      // Here we put logic we need when the plugin stops
      server.debug("Plugin stopped");
    },

    schema: () => CONFIG_SCHEMA,
    uiSchema: () => CONFIG_UISCHEMA,
  }

  return plugin;
}
