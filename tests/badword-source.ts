import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {repositoryPath} from "../src/paths.js";
import {BADWORD_SOURCE,BADWORD_LOCALE_SOURCES,originalBadwordLocale,badwordMatcher,hasBadwordBytes,ORIGINAL_BADWORD_LOAD_LOCALES,originalBadwordMatcher} from "../src/badword-source.js";
const bytes=readFileSync(repositoryPath(BADWORD_SOURCE.path));
const manifest=JSON.parse(readFileSync(repositoryPath("resources/reference/badword-source.json"),"utf8"));
assert.equal(manifest.source.sha256,BADWORD_SOURCE.sha256);assert.equal(manifest.source.bytes,bytes.length);
assert.equal(manifest.total_entries,8859);assert.deepEqual(manifest.native_load_order,ORIGINAL_BADWORD_LOAD_LOCALES);
for(const locale of Object.keys(BADWORD_LOCALE_SOURCES) as Array<keyof typeof BADWORD_LOCALE_SOURCES>) {
  const entries=originalBadwordLocale(bytes,locale);
  assert.equal(entries.length,BADWORD_LOCALE_SOURCES[locale].entries);
  assert.equal(manifest.locales[locale].raw_sha256,BADWORD_LOCALE_SOURCES[locale].raw_sha256);
  assert.ok(entries.every(row=>typeof row.word==="string"));assert.equal(entries.filter(row=>row.word.length===0).length,0);
  assert.ok(Object.isFrozen(entries)&&Object.isFrozen(entries[0]));
  assert.equal(badwordMatcher(entries.map(row=>row.word))(entries[0].word),true,"positive original corpus control; no actual words printed");
}
assert.deepEqual(ORIGINAL_BADWORD_LOAD_LOCALES,["KO","EN","JA","SC","TC"]);
const merged=originalBadwordMatcher(bytes);
for(const locale of ORIGINAL_BADWORD_LOAD_LOCALES) {
  const entries=originalBadwordLocale(bytes,locale);
  assert.equal(merged(entries[0].word),true,"all native source locales checked without printing words");
}
assert.equal(merged(""),false);
const damaged=Buffer.from(bytes);damaged[0]^=1;assert.throws(()=>originalBadwordLocale(damaged,"EN"),/pin mismatch/);
assert.throws(()=>originalBadwordLocale(bytes.subarray(1),"EN"),/pin mismatch/);
assert.throws(()=>originalBadwordLocale(bytes,"XX" as any),/locale/);
const input=["Token","가나"],match=badwordMatcher(input);input[0]="CHANGED";
assert.equal(match("prefixTokenSuffix"),true);assert.equal(match("prefix token suffix"),false);
assert.equal(match("TOKEN"),false,"no invented case folding");assert.equal(match("가나다"),true);
assert.equal(badwordMatcher(["é"])("e\u0301"),false,"no invented Unicode normalization");
assert.equal(badwordMatcher(["Token"])("T oken"),false,"no invented whitespace normalization");
assert.equal(badwordMatcher([""])(""),false);assert.equal(badwordMatcher([""])("X"),true,"meaningful empty dictionary entry is not dropped");
assert.equal(badwordMatcher([])("X"),false);
assert.equal(hasBadwordBytes(new Uint8Array([1,0,2]),[new Uint8Array([0,2])]),true,"std::string byte lengths preserve embedded NUL matching");
assert.throws(()=>badwordMatcher(["\ud800"]),/lossless/);assert.throws(()=>match("\ud800"),/lossless/);
console.log("Original badword source: all five pinned locale payloads/counts, native merged locale order, exact raw substring/case/UTF8 semantics, meaningful empty-entry behavior and damaged source refusal passed; words not printed.");
