import fetch from 'node-fetch'
import { generateCSR } from './csr-utils';

export default async function activate(ship_id: string) {
  const endpoint = process.env.FISHING_LOGGER_ENDPOINT || 'https://fishing-logger.com';
  const url = `${endpoint}/api/ship/${ship_id}/activate`;
  const { csrData, privateKey } = generateCSR(ship_id);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ csr: csrData }),
  });
  if (response.status !== 200) {
    throw new Error(`failed to activate: ${response.status}`);
  }
  const json = await response.json();
  const { iot_endpoint, client_id, certificate, ca_certificate } = json as any;
  return { iot_endpoint, client_id, certificate, ca_certificate, private_key: privateKey };
}