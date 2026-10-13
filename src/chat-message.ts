/** Pure native Chat JSON components. No listener, sender authentication,
 * token creation, room membership, readiness or retry policy is inferred. */
export interface ChatRequest {command:number;tag:string;version:string;utc:number;payload:unknown}
export interface ChatResponse {accessToken:string;command:number;tag:number;payload:unknown;error:{code:number;message:string}}
export interface ReceivedGuildPayload {who:string;nickname:string;message:string;type:number}
const codec=JSON as typeof JSON&{rawJSON?:(source:string)=>unknown;isRawJSON?:(value:unknown)=>boolean};
function rawNumber(source:string):unknown {
  if(!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(source)||!Number.isFinite(Number(source)))
    throw new TypeError("Chat raw token must be a finite JSON number");
  if(!codec.rawJSON) throw new TypeError("Exact native Chat number serialization requires JSON.rawJSON");
  return codec.rawJSON(source);
}
function token(value:unknown):string|undefined {
  return codec.isRawJSON?.(value)?(value as {rawJSON:string}).rawJSON:undefined;
}
function text(raw:unknown,label:string):string {
  if(typeof raw!=="string"||Buffer.from(raw,"utf8").toString("utf8")!==raw)
    throw new TypeError(`Chat ${label} requires lossless UTF8 string`);
  return raw;
}
function object(raw:unknown,keys:readonly string[]):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||token(raw)!==undefined||
    ![Object.prototype,null].includes(Object.getPrototypeOf(raw))||Object.keys(raw).some(key=>!keys.includes(key)))
    throw new TypeError("Unsupported Chat object/field");
  if(Reflect.ownKeys(raw).some(key=>typeof key!=="string"||!Object.getOwnPropertyDescriptor(raw,key)?.enumerable||
    !Object.hasOwn(Object.getOwnPropertyDescriptor(raw,key)!,"value"))) throw new TypeError("Chat object must contain JSON data properties");
  const row=raw as Record<string,unknown>;
  if(keys.some(key=>!Object.hasOwn(row,key))) throw new TypeError("Incomplete Chat object");
  return row;
}
function integer(raw:unknown,label:string,signed=false):number {
  if(typeof raw!=="number"||!Number.isInteger(raw)||raw<(signed?-0x8000_0000:0)||raw>(signed?0x7fff_ffff:0xffff_ffff))
    throw new TypeError(`Chat ${label} requires exact ${signed?"int32":"uint32"}`);
  return raw;
}
function serial(raw:unknown,label:string,stored=false):string {
  // Safe numeric values parsed from1.0/1e0 also normalize to canonical1 under
  // LOCAL admission, matching native float coercion. Unsafe identities require
  // exact decimal INTEGER tokens; their float spelling cannot prove uint64.
  const value=token(raw)??(typeof raw==="number"&&Number.isSafeInteger(raw)?String(raw):stored&&typeof raw==="string"?raw:undefined);
  if(value===undefined||!/^(?:0|[1-9]\d*)$/.test(value)||BigInt(value)>0xffff_ffff_ffff_ffffn)
    throw new TypeError(`Chat ${label} requires exact uint64 integer`);
  return value;
}
/** Detach valid JSON, retaining exact unsafe integer token objects. String
 * keys/values must be lossless; no Date/function/undefined or prototype data. */
function json(raw:unknown,ancestors=new Set<object>()):unknown {
  if(raw===null||typeof raw==="boolean") return raw;
  if(typeof raw==="string") return text(raw,"JSON string");
  if(typeof raw==="number") {
    if(!Number.isFinite(raw)||Number.isInteger(raw)&&!Number.isSafeInteger(raw))
      throw new TypeError("Chat JSON number is nonfinite or already rounded; use exact JSON text");
    return raw;
  }
  const source=token(raw);
  if(source!==undefined) return rawNumber(source);
  if(!raw||typeof raw!=="object"||ancestors.has(raw)) throw new TypeError("Invalid/cyclic Chat JSON");
  if(Array.isArray(raw)?Object.getPrototypeOf(raw)!==Array.prototype:
    ![Object.prototype,null].includes(Object.getPrototypeOf(raw))) throw new TypeError("Chat JSON requires plain objects/arrays");
  for(const key of Reflect.ownKeys(raw)) {
    if(Array.isArray(raw)&&key==="length") continue;
    const descriptor=Object.getOwnPropertyDescriptor(raw,key)!;
    if(typeof key!=="string"||!descriptor.enumerable||!Object.hasOwn(descriptor,"value")||
      Array.isArray(raw)&&(!/^(?:0|[1-9]\d*)$/.test(key)||Number(key)>=raw.length))
      throw new TypeError("Chat JSON has non-JSON data properties");
  }
  ancestors.add(raw);
  try {
    if(Array.isArray(raw)) {
      const result:unknown[]=[];
      for(let index=0;index<raw.length;index++) {
        const descriptor=Object.getOwnPropertyDescriptor(raw,String(index));
        if(!descriptor?.enumerable||!Object.hasOwn(descriptor,"value")) throw new TypeError("Chat JSON array requires own indexed data");
        result.push(json(descriptor.value,ancestors));
      }
      return result;
    }
    return Object.fromEntries(Object.entries(raw).map(([key,value])=>[text(key,"JSON key"),json(value,ancestors)]));
  } finally {ancestors.delete(raw);}
}
/** JSON text reviver preserves unsafe numeric tokens BEFORE rounding. Arbitrary
 * payload floats retain their exact wire spelling. Safe numeric identities can
 * canonicalize float spellings; unsafe identities require decimal integers. */
function parse(source:string):unknown {
  text(source,"JSON source");
  return JSON.parse(source,(_key,value,context?:{source:string})=>{
    if(typeof value==="number"&&!Number.isFinite(value)) throw new TypeError("Nonfinite Chat JSON number");
    if(typeof value==="number"&&!Number.isSafeInteger(value)&&Number.isInteger(value)) {
      if(!context?.source) throw new TypeError("Unrecoverable Chat numeric token");
      return rawNumber(context.source);
    }
    return value;
  });
}
export function decodeChatRequest(source:string):ChatRequest {
  const row=object(parse(source),["command","tag","version","utc","payload"]);
  return {command:integer(row.command,"request command"),tag:serial(row.tag,"request tag"),
    version:text(row.version,"version"),utc:integer(row.utc,"UTC",true),payload:json(row.payload)};
}
/** Request tag is an INTEGER token; native utc is stored/dumped as DOUBLE. */
export function encodeChatRequest(raw:ChatRequest):string {
  const row=object(raw,["command","tag","version","utc","payload"]),utc=integer(row.utc,"UTC",true);
  return JSON.stringify({command:integer(row.command,"request command"),tag:rawNumber(serial(row.tag,"request tag",true)),
    version:text(row.version,"version"),utc:rawNumber(`${utc}.0`),payload:json(row.payload)});
}
function response(raw:unknown):ChatResponse {
  // Native response integer tag reads low32 and sets highword0; refusing wide
  // aliases here is LOCAL canonical admission, not lossless native uint64.
  const row=object(raw,["accessToken","command","tag","payload","error"]),error=object(row.error,["code","message"]);
  return {accessToken:text(row.accessToken,"access token"),command:integer(row.command,"response command",true),
    tag:integer(row.tag,"response tag"),payload:json(row.payload),
    error:{code:integer(error.code,"error code",true),message:text(error.message,"error message")}};
}
export const decodeChatResponse=(source:string):ChatResponse=>response(parse(source));
export const encodeChatResponse=(raw:ChatResponse):string=>JSON.stringify(response(raw));
/** Actual received Guild11000 payload; this does not authenticate its sender. */
export function parseReceivedGuildPayload(raw:unknown):ReceivedGuildPayload {
  const row=object(raw,["who","nickname","message","type"]);
  return {who:serial(row.who,"sender"),nickname:text(row.nickname,"nickname"),
    message:text(row.message,"message"),type:integer(row.type,"inner command")};
}
/** Compose the exact native sender INTEGER token for use as response.payload. */
export function receivedGuildPayloadWire(raw:ReceivedGuildPayload):Record<string,unknown> {
  const row=object(raw,["who","nickname","message","type"]);
  return {who:rawNumber(serial(row.who,"sender",true)),nickname:text(row.nickname,"nickname"),
    message:text(row.message,"message"),type:integer(row.type,"inner command")};
}
/** Existing client channel selector admission only, not channel/room creation. */
export function chatEnterPayload(raw:unknown):{channel:number} {
  const row=object(raw,["channel"]),channel=integer(row.channel,"channel",true);
  if(channel<1||channel>9999) throw new TypeError("Chat channel outside supported client1..9999 selector");
  return {channel};
}
