import https from "https";
import http from "http";

export async function activate(
  endpoint: string,
  ship_id: string,
  csrData: string,
) {
  const url = `${endpoint}/api/ships/${ship_id}/activate`;

  const response = await new Promise<http.IncomingMessage>(
    (resolve, reject) => {
      try {
        const content = JSON.stringify({ csr: csrData });
        const request = https.request(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": String(content.length),
          },
        });

        request.on("response", resolve);
        request.on("error", reject);
        request.end(content, "utf8");
      } catch (e) {
        reject(e);
      }
    },
  );
  if (response.statusCode !== 200) {
    throw new Error(`failed to activate: ${response.statusCode}`);
  }

  const chunks = await new Promise<any[]>((resolve, reject) => {
    try {
      const chunks = [] as any[];

      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve(chunks));
      response.on("error", reject);
    } catch (e) {
      reject(e);
    }
  });
  const buffer = Buffer.concat(chunks);
  const json = JSON.parse(buffer.toString("utf8"));

  const { iot_endpoint, client_id, certificate, ca_certificate } = json as any;
  return { iot_endpoint, client_id, certificate, ca_certificate };
}
