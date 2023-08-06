import { Crypto } from "@peculiar/webcrypto";
import * as asn1js from "asn1js";
import {
  CertificationRequest,
  AttributeTypeAndValue,
  setEngine,
  getCrypto,
  CryptoEngine,
} from "pkijs/build";
//https://github.com/PeculiarVentures/PKI.js/blob/31c10e9bb879cac59d710102adf4fd7bd61cd66c/src/CryptoEngine.js#L1300

/**
 * @example
 * createPKCS10({ enrollmentID: 'user1', organizationUnit: 'Marketing', organization: 'Farmer Market', state: 'M', country: 'V' })
 *  .then(({csr, privateKey} => {...}))
 */
export async function createPKCS10(commonName: string) {
  setEngine(
    "newEngine",
    new CryptoEngine({ name: "newEngine", crypto: new Crypto() }),
  );
  const subtle = getCrypto()?.subtle!;
  const keyPair = (await subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048, //can be 1024, 2048, or 4096
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: { name: "SHA-256" }, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
    },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;

  return {
    csr: `-----BEGIN CERTIFICATE REQUEST-----\n${formatPEM(
      toBase64(await createCSR(keyPair, commonName)),
    )}\n-----END CERTIFICATE REQUEST-----\n`,
    publicKey: `-----BEGIN RSA PUBLIC KEY-----\n${formatPEM(
      toBase64(await subtle.exportKey("pkcs8", keyPair.publicKey)),
    )}\n-----END RSA PUBLIC KEY-----\n`,
    privateKey: `-----BEGIN RSA PRIVATE KEY-----\n${formatPEM(
      toBase64(await subtle.exportKey("pkcs8", keyPair.privateKey)),
    )}\n-----END RSA PRIVATE KEY-----\n`,
  };
}

async function createCSR(keyPair: CryptoKeyPair, commonName: string) {
  const pkcs10 = new CertificationRequest();
  pkcs10.version = 0;
  //list of OID reference: http://oidref.com/2.5.4
  pkcs10.subject.typesAndValues.push(
    new AttributeTypeAndValue({
      type: "2.5.4.3", //commonName
      value: new asn1js.Utf8String({ value: commonName }),
    }),
  );

  //add attributes to make CSR valid
  //Attributes must be "a0:00" if empty
  pkcs10.attributes = [];

  await pkcs10.subjectPublicKeyInfo.importKey(keyPair.publicKey);
  //signing final PKCS#10 request
  await pkcs10.sign(keyPair.privateKey, "SHA-256");

  return pkcs10.toSchema().toBER(false);
}

// add line break every 64th character
function formatPEM(pemString: string) {
  return pemString.replace(/(.{64})/g, "$1\n");
}

function toBase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString("base64");
}

/**
 * to learn more about asn1, ber & der, attributes & types used in pkcs#10
 * http://luca.ntop.org/Teaching/Appunti/asn1.html
 *
 * guides to SubtleCrypto (which PKIjs is built upon):
 * https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto
 */
