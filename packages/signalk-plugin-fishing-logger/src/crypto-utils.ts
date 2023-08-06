import crypto from "crypto";

// https://gabrieleromanato.name/nodejs-how-to-generate-a-csr-and-a-private-key
export const generateKeyPair = () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "pkcs1",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs1",
      format: "pem",
    },
  });
  return { privateKey, publicKey }
}

export const generateCsr = (privateKey: string, publicKey: string, commonName: string) => {
  const csr = crypto.createSign("RSA-SHA256");
  const csrInfo = [
    "-----BEGIN CERTIFICATE REQUEST-----\n",
    `CN=AWS IoT Certificate\n`,
    "-----END CERTIFICATE REQUEST-----\n",
  ];
  csr.update(publicKey);
  csr.update(csrInfo.join(""));
  csr.end();

  const csrData = csr.sign(privateKey, 'base64')
  const csrResult = [
    "-----BEGIN CERTIFICATE REQUEST-----\n",
    ...(csrData.match(/.{1,64}/g)!.map(line => line + "\n")),
    "-----END CERTIFICATE REQUEST-----\n",
  ];
  return { csrData: csrResult.join("") };
};
