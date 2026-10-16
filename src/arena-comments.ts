export interface ArenaComments {start_message:string;win_message:string;lose_message:string}
const keys=["start_message","win_message","lose_message"] as const;
export const ARENA_COMMENT_DEFAULTS:Readonly<ArenaComments>=Object.freeze({
  start_message:"Local revival sparring",win_message:"Well fought!",lose_message:"Train and try again."});
/** Local display/storage admission, not a recovered original length quota. */
export const LOCAL_ARENA_COMMENT_CODEPOINTS=128;
function object(raw:unknown,complete:boolean):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||Object.getPrototypeOf(raw)!==Object.prototype||
    complete&&keys.some(key=>!Object.hasOwn(raw,key))||Reflect.ownKeys(raw).some(key=>typeof key!=="string"||
      !(keys as readonly string[]).includes(key)||!Object.getOwnPropertyDescriptor(raw,key)?.enumerable||
      !Object.hasOwn(Object.getOwnPropertyDescriptor(raw,key)!,"value")))
    throw new TypeError("Arena comments require plain own message data fields");
  return raw as Record<string,unknown>;
}
function text(raw:unknown):string {
  if(typeof raw!=="string"||!raw||[...raw].length>LOCAL_ARENA_COMMENT_CODEPOINTS||
    Buffer.from(raw,"utf8").toString("utf8")!==raw||/[\u0000-\u001f]/.test(raw))
    throw new TypeError("Arena messages require nonempty lossless text within the local codepoint/control bounds");
  return raw;
}
/** RequestUpdateMe can omit keys for null C-string arguments. Preserve that
 * patch grammar; no numeric type selector, trimming or profanity inference. */
export function parseArenaCommentInfo(raw:unknown):Partial<ArenaComments> {
  if(typeof raw==="string") {
    try{raw=JSON.parse(raw);}catch{throw new TypeError("comment_info requires JSON message object text");}
  }
  const row=object(raw,false);
  return Object.fromEntries(keys.filter(key=>Object.hasOwn(row,key)).map(key=>[key,text(row[key])])) as Partial<ArenaComments>;
}
export function normalizeArenaComments(raw:unknown):ArenaComments {
  const row=object(raw,true);
  return Object.fromEntries(keys.map(key=>[key,text(row[key])])) as unknown as ArenaComments;
}
/** First explicit selection captures all three current local default strings,
 * even when the selected value equals its default. An empty patch does not
 * create state. Returned data never aliases caller input or frozen defaults. */
export function planArenaComments(current:ArenaComments|undefined,raw:unknown):{next:ArenaComments|undefined;changed:boolean} {
  const previous=current===undefined?undefined:normalizeArenaComments(current),patch=parseArenaCommentInfo(raw);
  if(!Object.keys(patch).length)return {next:previous,changed:false};
  const next={...(previous??ARENA_COMMENT_DEFAULTS),...patch};
  return {next,changed:previous===undefined||keys.some(key=>next[key]!==previous[key])};
}
