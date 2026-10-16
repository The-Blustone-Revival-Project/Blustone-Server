import {createHash} from "node:crypto";
import {inflateSync} from "node:zlib";
import {MIRAGE_BACKGROUND_SOURCE} from "./mirage-backgrounds.js";

export const GEM_ANVIL_SOURCE=Object.freeze({pack:"resources/runtime/assets/LEVELING.jet",
  packSha256:MIRAGE_BACKGROUND_SOURCE.sha256,packBytes:18524,headerOffset:3119,payloadOffset:3143,
  decodedBytes:267,storedBytes:226,encodedName:"66718994452152741",
  sha256:"fae1527132d31e47b7e714523971219333a2d57981817d1f262ca869b9054f47"});
export interface GemAnvilRow {destination_level:number;base_float32:number;increment_source:string;increment_byte:number}
const hash=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
/** Native LoadAnvilStatus stores the base as float32, but converts the third
 * source column float32 ->uint32 ->byte. Decimal increments are not retained. */
export function originalGemAnvilRows(pack:Buffer):GemAnvilRow[] {
  const p=GEM_ANVIL_SOURCE,o=p.headerOffset;
  if(pack.length!==p.packBytes||hash(pack)!==p.packSha256)throw new TypeError("Original gem anvil LEVELING pin mismatch");
  if(pack.readUInt32LE(o)!==267||pack.readUInt32LE(o+4)!==267||pack.readUInt32LE(o+8)!==226||
    pack.readBigUInt64LE(o+12).toString()!==p.encodedName||pack.readUInt16LE(o+20)!==0||pack.subarray(o+22,o+24).toString("ascii")!=="RW")
    throw new TypeError("Original ANVILHEATED header mismatch");
  const raw=inflateSync(pack.subarray(p.payloadOffset,p.payloadOffset+p.storedBytes),{maxOutputLength:p.decodedBytes});
  if(raw.length!==267||hash(raw)!==p.sha256||raw.subarray(0,2).toString("ascii")!=="RW"||raw.readUInt32LE(2)!==261)
    throw new TypeError("Original ANVILHEATED RW pin mismatch");
  const lines=raw.subarray(6).toString("utf8").replace(/^\uFEFF/,"").trimEnd().split(/\r?\n/);
  if(!lines.shift()?.startsWith("#")||lines.length!==14)throw new TypeError("Original ANVILHEATED row shape mismatch");
  return lines.map((line,index)=>{
    const cells=line.split(",");
    if(cells.length!==3||cells.some(value=>!/^\d+(?:\.\d+)?$/.test(value))||Number(cells[0])!==index+2)
      throw new TypeError("Original ANVILHEATED row mismatch");
    return {destination_level:index+2,base_float32:Math.fround(Number(cells[1])),increment_source:cells[2],
      increment_byte:Math.trunc(Math.fround(Number(cells[2])))&255};
  });
}
function uint32(value:number):number {
  if(!Number.isInteger(value)||value<0||value>0xffff_ffff)throw new TypeError("Gem anvil input requires uint32");return value;
}
/** Exact source pre-format percentage arithmetic, NOT authoritative server
 * probability/RNG. The U32 failure word is passed to a signed-int UI argument;
 * MUL wraps32 before VCVT.F32.S32, rather than multiplying as JS double. */
export function gemAnvilPreview(pack:Buffer,currentLevel:number,failed:number) {
  uint32(currentLevel);uint32(failed);
  const destination=(currentLevel+1)>>>0,signedDestination=destination|0;
  const row=originalGemAnvilRows(pack).find(row=>row.destination_level===signedDestination);
  const base=row?.base_float32??0,increment=row?.increment_byte??255;
  const product=Math.imul(failed,increment);
  return {destination_level:destination,destination_level_signed:signedDestination,found:!!row,
    base_float32:base,increment_byte:increment,failed_word:failed,product_signed32:product,
    percentage_before_format:Math.fround(base+Math.fround(product))};
}
/** Native heat stage AFTER the separate numeric formatting/parsing path.
 * The caller supplies that stage's float32 percentage. Upper clamp only;
 * this does not claim exact text formatting or a lower clamp. */
export function gemAnvilHeatStage(percentageAfterFormatter:number):number {
  if(!Number.isFinite(percentageAfterFormatter))throw new TypeError("Gem anvil heat stage requires finite percentage");
  const percent=Math.fround(percentageAfterFormatter);
  return Math.fround(Math.min(Math.fround(Math.fround(percent*255)/100),255)/255);
}
