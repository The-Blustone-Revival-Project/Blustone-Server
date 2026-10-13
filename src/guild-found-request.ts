import {GUILD_JOIN_TYPES} from "./guild-lobby.js";
export interface GuildFoundRequest {name:string;desc:string;type:1|2|3;fc_point_limit:number;region:string;emblem_id:string}
/** RequestBuild Ga6f8c4 sends exactly six action fields with no fee/payment/ID.
 * Known emblem, nonempty name, canonical decimal numeric parsing and existing
 * local signed32 count bounds are admission policy, not original server rules. */
export function parseGuildFoundRequest(raw:unknown,knownEmblems:ReadonlySet<string>):GuildFoundRequest {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new TypeError("Expected Guild Found request");
  const row=raw as Record<string,unknown>;
  const text=(key:string)=>{
    const value=row[key];if(typeof value!=="string") throw new TypeError(`Guild Found ${key} requires string`);
    return value;
  };
  const integer=(key:string)=>{
    const value=row[key],source=typeof value==="number"&&Number.isSafeInteger(value)?String(value):value;
    if(typeof source!=="string"||!/^(?:0|[1-9]\d*)$/.test(source)||BigInt(source)>0x7fff_ffffn)
      throw new TypeError(`Guild Found ${key} requires supported nonnegative signed32`);
    return Number(source);
  };
  const name=text("name"),desc=text("desc"),region=text("region"),emblem_id=text("emblem_id"),type=integer("type");
  if(!name.length) throw new TypeError("Guild Found name cannot be empty");
  if(!Object.values(GUILD_JOIN_TYPES).includes(type as 1|2|3)) throw new TypeError("Unsupported Guild join type");
  if(!knownEmblems.has(emblem_id)) throw new TypeError("Guild Found emblem lacks original reference");
  return {name,desc,type:type as 1|2|3,fc_point_limit:integer("fc_point_limit"),region,emblem_id};
}
