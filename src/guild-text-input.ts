/** Original management edit-popup lengths, not complete creation eligibility.
 * Name passes14 and description80; ANY non-ASCII byte halves the limit, then
 * ResultCB floors the limit at8 and compares RMGetUTF8len code-point count.
 * Bad-word/font support, duplicate names, account levels and server policy are
 * independent unresolved gates. Passing this helper authorizes no mutation. */
export const GUILD_EDIT_INPUT_LIMITS=Object.freeze({name:14,desc:80} as const);
/** SetCommon's ordinary UI range/unit. This is a membership threshold setting,
 * not proof of required founder FC points or original server admission. */
export const GUILD_FC_POINT_LIMITS=Object.freeze({minimum:0,maximum:4000,unit:500} as const);
export function guildFcPointLimit(raw:unknown):number {
  const value=typeof raw==="number"&&Number.isInteger(raw)?String(raw):raw;
  if(typeof value!=="string"||!/^(?:0|[1-9]\d*)$/.test(value)||BigInt(value)>BigInt(GUILD_FC_POINT_LIMITS.maximum))
    throw new TypeError("Guild FC-point limit is outside original UI range");
  const count=Number(value);
  if(count%GUILD_FC_POINT_LIMITS.unit!==0) throw new TypeError("Guild FC-point limit is outside original UI unit");
  return count;
}
export function guildTextInput(field:"name"|"desc",text:unknown) {
  if(field!=="name"&&field!=="desc") throw new TypeError("Unsupported Guild text field");
  if(typeof text!=="string"||Buffer.from(text,"utf8").toString("utf8")!==text||text.includes("\0"))
    throw new TypeError("Guild text must be lossless UTF8 without NUL");
  const nonAscii=/[^\x00-\x7f]/.test(text),limit=GUILD_EDIT_INPUT_LIMITS[field];
  const max=Math.max(8,nonAscii?limit>>>1:limit),characters=Array.from(text).length;
  if(characters>max) throw new TypeError("Guild text exceeds original edit-popup character limit");
  return {text,characters,max_characters:max,contains_non_ascii:nonAscii};
}
