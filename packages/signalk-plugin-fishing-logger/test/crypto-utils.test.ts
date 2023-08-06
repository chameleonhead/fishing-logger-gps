import { createPKCS10 } from "../src/crypto-utils";

describe("crypto-utils", () => {
  it("should generate csr", async () => {
    const { csr, publicKey, privateKey } = await createPKCS10("test");
    expect(csr).not.toBeNull();
    expect(publicKey).not.toBeNull();
    expect(privateKey).not.toBeNull();
  });
});
