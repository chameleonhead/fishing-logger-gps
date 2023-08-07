import https from "https";
import http from "http";

export async function getConfig(
    endpoint: string,
    ship_id: string,
) {
    const url = `${endpoint}/api/ships/${ship_id}/config`;

    const response = await new Promise<http.IncomingMessage>(
        (resolve, reject) => {
            try {
                const request = https.request(url, {
                    method: "GET",
                });

                request.on("response", resolve);
                request.on("error", reject);
                request.end();
            } catch (e) {
                reject(e);
            }
        },
    );
    if (response.statusCode !== 200) {
        throw new Error(`failed to get config: ${response.statusCode}`);
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

    const { iot_endpoint, topic_prefix } = json as any;
    return { iot_endpoint, topic_prefix };
}
