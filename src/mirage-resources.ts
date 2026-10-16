import {createHash} from "node:crypto";

/** Original package and reproducible offline-index pins. Names establish asset
 * identity only: neither a client-loaded package nor a playable floor is implied.
 * Runtime consumers need no Python; jet-index.py is the independent decoder. */
export const MIRAGE_RESOURCE_SOURCES=Object.freeze({
  mirage:Object.freeze({pack:"resources/runtime/assets/MIRAGE.jet",bytes:3861142,
    sha256:"d2cf0adca895de1174f35f507cf5e38a21b8e74572a5c895c50ad6c062f4374e",
    index:"resources/reference/mirage-original-jet-index.json",
    indexSha256:"0aad1601eef30b3a32ced4aac1090999c89f987b33899983c1b355b72ff673fc",resources:60,chunks:71}),
  st002:Object.freeze({pack:"resources/runtime/assets/ST002.jet",bytes:2985916,
    sha256:"e75a9e7be84632e960a3084e4262726604c013d96633c3015d125f9ada9129ba",
    index:"resources/reference/st002-original-jet-index.json",
    indexSha256:"a59c0698b2024829c44b9769969907722bfc3f294bbf8428a62c4ada2fb328f5",resources:24,chunks:24}),
});
export const MIRAGE_ENVIRONMENT_SOURCE=Object.freeze({path:"resources/reference/recovered-data/environments.csv",
  sha256:"0c9e214daae929e264083329dc8fdd7f0b02b4f438ec159080a82d6264da1b4c"});
export interface OriginalJetResource {
  name:string;encoded_name:string;offset:number;total_bytes:number;decoded_bytes:number;sha256:string;payload_prefix_hex:string;
  chunks:{offset:number;payload_offset:number;raw_bytes:number;stored_bytes:number;part:number;type_bytes_hex:string;header_hex:string}[];
  s2projection?:{supported:boolean;image_name?:string;image_encoded_name?:string;image_sha256?:string;
    image_decoded_bytes?:number;point?:{x:number;y:number};
    images?:{image_name:string;image_encoded_name:string;image_sha256:string;image_decoded_bytes:number;point:{x:number;y:number}}[];
    [key:string]:unknown};
  atprojection?:{supported:boolean;opaque_byte?:number;frame_count?:number;
    frames?:{sprite_encoded_name:string;sprite_name:string;duration_float32:number;duration_hex:string;
      tag_hex:string;sprite_projection_supported:boolean;[key:string]:unknown}[];[key:string]:unknown};
}
function hash(bytes:Buffer):string{return createHash("sha256").update(bytes).digest("hex");}
/** Both inputs are pinned before parsing. This deliberately admits only these
 * recovered originals; it is not an arbitrary JET/schema admission interface. */
export function originalMirageResourceIndex(kind:keyof typeof MIRAGE_RESOURCE_SOURCES,pack:Buffer,index:Buffer):Map<string,OriginalJetResource> {
  const pin=MIRAGE_RESOURCE_SOURCES[kind];
  if(!pin||pack.length!==pin.bytes||hash(pack)!==pin.sha256||hash(index)!==pin.indexSha256)
    throw new TypeError("Original Mirage package/index pin mismatch");
  const report=JSON.parse(index.toString("utf8"));
  if(report.schema!==1||report.format!=="native-jet-base38-index"||report.bytes!==pack.length||report.sha256!==pin.sha256||
    report.exact_eof!==pack.length||report.resource_count!==pin.resources||report.physical_chunks!==pin.chunks||report.resources.length!==pin.resources)
    throw new TypeError("Original Mirage index identity mismatch");
  // Header-name provenance remains uint64 throughout; Number would lose bits.
  for(const row of report.resources as OriginalJetResource[])for(const chunk of row.chunks) {
    if(pack.subarray(chunk.offset,chunk.offset+24).toString("hex")!==chunk.header_hex||
      pack.readBigUInt64LE(chunk.offset+12).toString()!==row.encoded_name)
      throw new TypeError("Original Mirage index/header mismatch");
  }
  // JSON parsing creates independent rows and collections on each call.
  return new Map((report.resources as OriginalJetResource[]).map(row=>[row.name,row]));
}
/** CSV column0 is the native ENV_INFO map key; keep its exact string. All
 * candidates must be available before random native background selection. */
export function originalMirageEnvironments(bytes:Buffer):Map<string,string> {
  if(hash(bytes)!==MIRAGE_ENVIRONMENT_SOURCE.sha256)throw new TypeError("Original Mirage environment pin mismatch");
  const lines=bytes.toString("utf8").trimEnd().split(/\r?\n/);
  if(!lines[0].startsWith("#ID,Name,PreFix,")||lines.length!==51)throw new TypeError("Original environment shape mismatch");
  return new Map(lines.slice(1).map(line=>{const [id,,prefix]=line.split(",");return [id,prefix];}));
}
