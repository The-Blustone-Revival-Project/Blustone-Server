import {createHash} from "node:crypto";
import {inflateSync} from "node:zlib";
import {originalMirageEnvironments,originalMirageResourceIndex,type OriginalJetResource} from "./mirage-resources.js";

export const MIRAGE_BACKGROUND_SOURCE=Object.freeze({pack:"resources/runtime/assets/LEVELING.jet",bytes:18524,
  sha256:"ba73fff17002cc94f7f1a98bf657be1bef042283051a5b92c395347006d3c57e",
  commonHeaderOffset:3369,commonPayloadOffset:3393,commonDecodedBytes:2119,commonStoredBytes:813,
  commonSha256:"7b9078265f4f1c0383d3d9b289939c9e3ac4db6de39a882111e1746bfeb447c4",
  jsonSha256:"8f0a2890d7f1a43314f5637617239d2ad2f31f8bec6f68b48e87b2f62ef3162a"});
const layers=["longlong","long","short","shortshort","window"] as const;
export type MirageBackgroundLayer=typeof layers[number];
export type MirageBackgroundPrefixes=Record<MirageBackgroundLayer,string>;
const digest=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
/** Original LoadCommon selects COMMON, not the different COMMON_DESC example.
 * All bytes are pinned before parsing; each call returns detached values. */
export function originalMirageBackgroundPrefixes(pack:Buffer):MirageBackgroundPrefixes {
  const pin=MIRAGE_BACKGROUND_SOURCE;
  if(pack.length!==pin.bytes||digest(pack)!==pin.sha256)throw new TypeError("Original background LEVELING pin mismatch");
  const offset=pin.commonHeaderOffset;
  let encoded=0n;for(const char of "COMMON")encoded=encoded*38n+BigInt("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ._".indexOf(char));
  if(pack.readUInt32LE(offset)!==2119||pack.readUInt32LE(offset+4)!==2119||pack.readUInt32LE(offset+8)!==813||
    pack.readBigUInt64LE(offset+12)!==encoded||pack.readUInt16LE(offset+20)!==0||pack.subarray(offset+22,offset+24).toString("ascii")!=="RW")
    throw new TypeError("Original COMMON header mismatch");
  const raw=inflateSync(pack.subarray(pin.commonPayloadOffset,pin.commonPayloadOffset+pin.commonStoredBytes),{maxOutputLength:pin.commonDecodedBytes});
  if(raw.length!==2119||digest(raw)!==pin.commonSha256||raw.subarray(0,2).toString("ascii")!=="RW"||raw.readUInt32LE(2)!==2113||
    raw.subarray(6,9).toString("hex")!=="efbbbf"||digest(raw.subarray(6))!==pin.jsonSha256)
    throw new TypeError("Original COMMON RW/JSON mismatch");
  const common=JSON.parse(raw.subarray(9).toString("utf8"));
  const expected={longlong:"D",long:"C",short:"B",shortshort:"A",window:"E"};
  if(common.bg_prefix_header!==""||layers.some(layer=>common[`bg_prefix_${layer}`]!==expected[layer]))
    throw new TypeError("Original COMMON background prefix mismatch");
  return Object.fromEntries(layers.map(layer=>[layer,common[`bg_prefix_${layer}`]])) as MirageBackgroundPrefixes;
}

/** Source-derived recipe/name coverage for the two original STI002 ENV rows.
 * Supplied resources must already come from the independently pinned index.
 * AT name presence does not establish its dependencies or renderer readiness. */
export function originalMirageLayerRecipe(environmentId:string,leveling:Buffer,environments:Buffer,
  verifiedResources:ReadonlyMap<string,OriginalJetResource>) {
  const prefixes=originalMirageBackgroundPrefixes(leveling),env=originalMirageEnvironments(environments);
  if(environmentId!=="2"&&environmentId!=="15")throw new TypeError("Only original Mirage STI002 environment recipes are admitted");
  const columns=environments.toString("utf8").trimEnd().split(/\r?\n/).slice(1).map(line=>line.split(",")).find(row=>row[0]===environmentId)!;
  const prefix=env.get(environmentId)!;
  const recipe=layers.map((layer,index)=>{
    const composition=Number(columns[3+index*3]);
    if(composition!==[11,11,11,111,11][index])throw new TypeError("Original environment composition mismatch");
    let remaining=composition;const sequence:string[]=[];
    do{const digit=remaining%10;sequence.push(`${prefix}_${prefixes[layer]}${digit}`);remaining=Math.floor(remaining/10);}while(remaining);
    const required=[...new Set(sequence)].map(name=>{
      const resource=verifiedResources.get(name);
      if(!resource||resource.name!==name||resource.payload_prefix_hex!=="4154")throw new TypeError("Original background layer AT name/type is unavailable");
      return {name,repetitions:sequence.filter(value=>value===name).length,type:"AT" as const,sha256:resource.sha256};
    });
    return {layer,suffix:prefixes[layer],composition,sequence,required};
  });
  return {environment_id:environmentId,environment_prefix:prefix,layers:recipe};
}

/** Complete original five-layer asset-name dependencies. Every input is
 * independently pinned here, including the AT/S2 index. This establishes
 * referenced bytes, not native rendering, scene/UI completeness or run data. */
export function originalMirageLayerDependencies(environmentId:string,leveling:Buffer,environments:Buffer,pack:Buffer,index:Buffer) {
  const resources=originalMirageResourceIndex("st002",pack,index);
  const recipe=originalMirageLayerRecipe(environmentId,leveling,environments,resources);
  return {...recipe,layers:recipe.layers.map(layer=>({...layer,required:layer.required.map(required=>{
    const animation=resources.get(required.name)!,at=animation.atprojection;
    if(!at?.supported||!at.frames?.length||at.frame_count!==at.frames.length)
      throw new TypeError("Original background AT frames are unavailable");
    const frames=at.frames.map(frame=>{
      const sprite=resources.get(frame.sprite_name),s2=sprite?.s2projection;
      const image=s2?.image_name?resources.get(s2.image_name):undefined;
      if(!frame.sprite_projection_supported||!s2?.supported||!image||image.payload_prefix_hex!=="4932"||
        frame.sprite_encoded_name!==sprite!.encoded_name||s2.image_encoded_name!==image.encoded_name||s2.image_sha256!==image.sha256)
        throw new TypeError("Original background AT/S2/I2 dependency is unavailable");
      return {duration:frame.duration_float32,sprite:{name:sprite!.name,sha256:sprite!.sha256},
        image:{name:image.name,sha256:image.sha256,decoded_bytes:image.decoded_bytes}};
    });
    return {...required,frames};
  })}))};
}
