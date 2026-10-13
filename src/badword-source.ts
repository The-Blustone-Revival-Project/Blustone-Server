import {createHash} from "node:crypto";

/** Existing imported public original export; no cleartext word list is copied
 * into authored source. Native loader merges the five fixed locale dictionaries
 * unchanged; it alone skips empty entries. No current-language filter/casefold. */
export const BADWORD_SOURCE=Object.freeze({
  path:"resources/reference/recovered-data/leveldb-tables/all-tables.json",bytes:15797336,
  sha256:"f166f857d45c6dd68e97bd4b8f055be795796400fa10ba9f040aaa1b1d8f0a78",
});
export const BADWORD_LOCALE_SOURCES=Object.freeze({
  EN:{entries:502,raw_bytes:9265,raw_sha256:"b41900180c6c2b8fb24b5dda03141fede4e1b1ac1df0468b689b41e6862372ca"},
  JA:{entries:31,raw_bytes:694,raw_sha256:"11a63bfe0a7f56d102de620efd56f711ad79f4d9f43b8f3238ba5497bfbb6d55"},
  KO:{entries:4159,raw_bytes:85119,raw_sha256:"add444b58c358d0e69742c3bb30b00ff2c75f432d0eab1c2203994f78102883d"},
  SC:{entries:4082,raw_bytes:84468,raw_sha256:"f191393271035d174f219cd4a96141f2dd21cc0e3e2dd0a84c80c5f4e7b6111e"},
  TC:{entries:85,raw_bytes:1630,raw_sha256:"3a2ff4022f165964fc3f396b0cead73283fa1ab949ecafdd23336c3bd9337e49"},
} as const);
export type BadwordLocale=keyof typeof BADWORD_LOCALE_SOURCES;
/** CSRDataMgr.Init G8b1df4..G8b1e50 fixed table-key sequence. */
export const ORIGINAL_BADWORD_LOAD_LOCALES=Object.freeze(["KO","EN","JA","SC","TC"] as const);
function object(raw:unknown):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new TypeError("Expected original badword object");
  return raw as Record<string,unknown>;
}
/** Read one explicitly selected original locale, including EVERY entry. No
 * fallback locale or global union is inferred. Returned order is ID lexical;
 * HasBadWord boolean semantics are order-independent, replacement is not here. */
export function originalBadwordLocale(bytes:Buffer,locale:BadwordLocale) {
  if(!Object.hasOwn(BADWORD_LOCALE_SOURCES,locale)) throw new TypeError("Unknown original badword locale");
  if(bytes.length!==BADWORD_SOURCE.bytes||createHash("sha256").update(bytes).digest("hex")!==BADWORD_SOURCE.sha256)
    throw new TypeError("Original badword export source pin mismatch");
  const source=object(JSON.parse(bytes.toString("utf8"))),tables=object(source.tables),rows=tables.BADWORD_RO;
  if(!Array.isArray(rows)||rows.length!==5) throw new TypeError("Original badword locale rows missing");
  const selected=rows.filter(row=>object(row).key===locale);
  if(selected.length!==1) throw new TypeError("Missing or duplicate original badword locale");
  const row=object(selected[0]),pin=BADWORD_LOCALE_SOURCES[locale];
  if(typeof row.raw!=="string") throw new TypeError("Original badword raw JSON is missing");
  const raw=Buffer.from(row.raw,"utf8");
  if(raw.length!==pin.raw_bytes||createHash("sha256").update(raw).digest("hex")!==pin.raw_sha256)
    throw new TypeError("Original badword locale payload pin mismatch");
  const words=object(JSON.parse(row.raw)),projection=object(row.json),ids=Object.keys(words).sort();
  if(ids.length!==pin.entries||Object.keys(projection).length!==ids.length||
    ids.some(id=>!/^[1-9]\d*$/.test(id)||typeof words[id]!=="string"||words[id]!==projection[id]))
    throw new TypeError("Original badword source shape/count differs");
  return Object.freeze(ids.map(id=>Object.freeze({id,word:words[id] as string})));
}
/** CGMDataMgr.HasBadWord G793cb8: raw case-sensitive byte substring scan.
 * Empty input returnsfalse first; an empty dictionary string matches EVERY
 * nonempty input. No Unicode/case/word-boundary/whitespace normalization. */
export function hasBadwordBytes(input:Uint8Array,words:readonly Uint8Array[]):boolean {
  if(!input.length) return false;
  const data=Buffer.from(input);
  return words.some(word=>word.length===0||data.indexOf(Buffer.from(word))!==-1);
}
/** Compile already admitted exact strings without silently replacing malformed
 * JS surrogate input. Native Guild edit validates UTF8 before HasBadWord. */
export function badwordMatcher(words:readonly string[]) {
  const encoded=words.map(word=>{
    if(typeof word!=="string"||Buffer.from(word,"utf8").toString("utf8")!==word)
      throw new TypeError("Badword dictionary requires lossless UTF8 strings");
    return Buffer.from(word,"utf8");
  });
  return (input:string)=>{
    if(typeof input!=="string"||Buffer.from(input,"utf8").toString("utf8")!==input)
      throw new TypeError("Badword input requires lossless UTF8 string");
    return hasBadwordBytes(Buffer.from(input,"utf8"),encoded);
  };
}
/** Native CSRDataMgr.Init loads ALL five locale tables into one shared list
 * and skips empty strings at G8b2080/82. Read locale rows only for diagnostics;
 * the client never restricts HasBadWord to its currently selected language. */
export function originalBadwordMatcher(bytes:Buffer) {
  const words=ORIGINAL_BADWORD_LOAD_LOCALES.flatMap(locale=>originalBadwordLocale(bytes,locale)
    .filter(row=>row.word.length>0).map(row=>row.word));
  return badwordMatcher(words);
}
