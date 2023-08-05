import crypto from "crypto";

// https://gabrieleromanato.name/nodejs-how-to-generate-a-csr-and-a-private-key
export const generateCSR = (commonName: string) => {
  const { privateKey } = crypto.generateKeyPairSync("rsa", {
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

  const csr = crypto.createSign("RSA-SHA256");
  const csrInfo = [
    "-----BEGIN CERTIFICATE REQUEST-----\n",
    `CN=${commonName}\n`,
    "-----END CERTIFICATE REQUEST-----\n",
  ];
  csr.update(csrInfo.join(""));
  csr.end();
  const csrData = csr.sign(privateKey, "base64");
  return { csrData, privateKey };
};
