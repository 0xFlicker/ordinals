import { getDb } from "@0xflick/ordinals-backend";
import { v4 as createUuid } from "uuid";
import { UserNonceDAO } from "./userNonce.js";

describe("#User MODEL", () => {
  it("returns empty array if user does not exist", async () => {
    const userId = createUuid();
    const db = getDb();
    const dao = new UserNonceDAO(db as any);
    const nonces = await dao.getAddressNonces(userId);
    expect(nonces).toEqual([]);
  });
});
