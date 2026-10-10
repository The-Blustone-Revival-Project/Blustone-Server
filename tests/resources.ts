import { repositoryPath } from "../src/paths.js";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { createApp } from "../src/server.js";

const tree = repositoryPath("resources", "test-fixtures", "reconstructed-resources");
if (!existsSync(path.join(tree, "UI_XML_RO.db", "CURRENT"))) {
  console.log("Resource tree test skipped: run tools/prepare-reconstructed-resources.py first.");
} else {
  const previous = new Map<string, string | undefined>();
  const settings: Record<string, string> = {
    BLUSTONE_PACKAGE_DIR: tree,
    BLUSTONE_PACKAGE_NAMES: "E_NEW.jet,E_MIDAGE.jet,UI_XML_RO.db.jet",
    BLUSTONE_PACKAGE_MODE: "pkgi1-tree",
    BLUSTONE_UI_PACKAGE_TREE_DIR: tree,
    BLUSTONE_RESOURCE_VERSION: "1634659",
  };
  for (const [name, value] of Object.entries(settings)) {
    previous.set(name, process.env[name]);
    process.env[name] = value;
  }

  const context = createApp({ baseUrl: "http://127.0.0.1:8080" });
  const server = context.app.listen(0);
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const base = `http://127.0.0.1:${address.port}`;
    const manifestResponse = await fetch(`${base}/reslist_1634659.list`);
    const manifest = await manifestResponse.text();
    assert.equal(manifestResponse.status, 200);
    const uiRow = manifest.trim().split("\n").find((line) => line.startsWith("UI_XML_RO.db,"));
    assert.ok(uiRow, "UI_XML_RO.db must be advertised");
    const manifestFields = uiRow.split(",");

    const packageResponse = await fetch(`${base}/UI_XML_RO.db_1634659.pkg`);
    const packageBytes = Buffer.from(await packageResponse.arrayBuffer());
    assert.equal(packageResponse.status, 200);
    assert.equal(Number(manifestFields[2]), packageBytes.length);
    assert.equal(manifestFields[5], crypto.createHash("md5").update(packageBytes).digest("hex").toUpperCase());
    assert.equal(packageBytes.readUInt32LE(16), 3);

    const names: string[] = [];
    let position = 20;
    const recordCount = packageBytes.readUInt32LE(16);
    for (let index = 0; index < recordCount; index += 1) {
      const nameLength = packageBytes[position];
      position += 1;
      names.push(packageBytes.subarray(position, position + nameLength).toString("utf8"));
      position += nameLength + 8;
    }
    assert.ok(names.some((name) => /^UI_XML_RO\.db\/\d+\.ldb$/.test(name)));
    assert.ok(names.includes("UI_XML_RO.db/CURRENT"));
    assert.ok(names.some((name) => /^UI_XML_RO\.db\/MANIFEST-\d+$/.test(name)));
    // SSTable blocks may be compressed, so validate database keys separately
    // with the LevelDB tooling rather than searching the container bytes.
    console.log("Reconstructed UI resource manifest and PKGI tree package passed.");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}
