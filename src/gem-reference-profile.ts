import {readFileSync,existsSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import path from "node:path";
import {repositoryPath} from "./paths.js";
import {parseGemReferences} from "./gem-instances.js";
import {gemArtworkOwner} from "./gem-materials.js";
/** Explicit supplied Gem INFO rows; no catalogue IDs derived from artwork. */
export function configuredGemReferences(raw:unknown,env:NodeJS.ProcessEnv=process.env) {
  const refs=parseGemReferences({result_code:1,ret_data:raw});
  if(!refs.length) return refs;
  if(!["pkgi1","pkgi1-tree"].includes(env.BLUSTONE_PACKAGE_MODE??"")) throw new TypeError("Gem references require deliverable original owners");
  const catalog=JSON.parse(readFileSync(repositoryPath("resources/reference/gem-materials.json"),"utf8"));
  const selected=new Set((env.BLUSTONE_PACKAGE_NAMES??"").split(","));
  for(const ref of refs) {
    const owner=gemArtworkOwner(ref,catalog.packs,selected),pin=catalog.packs.find((pack:any)=>pack.package===owner);
    const preferred=path.resolve(env.BLUSTONE_PACKAGE_DIR??repositoryPath("resources/runtime/packages"),owner);
    const fallback=env.BLUSTONE_RESOURCE_ASSET_DIR?path.resolve(env.BLUSTONE_RESOURCE_ASSET_DIR,owner):preferred;
    const file=existsSync(preferred)?preferred:fallback;
    if(!existsSync(file)||!statSync(file).isFile()) throw new TypeError("Missing original Gem owner");
    const bytes=readFileSync(file);
    if(bytes.length!==pin.bytes||createHash("sha256").update(bytes).digest("hex")!==pin.sha256) throw new TypeError("Changed original Gem owner");
  }
  return refs;
}
