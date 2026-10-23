# Starter skill display names: exact native field, missing identity join

Bounded source-only check,2026-10-23. Targets ordinary refs001..004, types1..5.
No label adapter, skill/reference change, build/dist write, native input, save
or APK edit. The current invented active names/SkillN placeholders are not
promoted into recovered names by this audit.

## Native name owner is established

Immutable ELF SHA256:
c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec.
G addresses use ELF code+0x10000.

SRSKILL_INFO.parse Gf219ac reads exact JSON key name at LDR Gf21a1a / ADD
Gf21a20 and key desc at Gf21a5e/Gf21a64. It copies the supplied name as a
string; no CGMDataMgr.GetLocalizedText call occurs in this complete parser.
CSRCardAnalyzer.GetSkillName G86d608 obtains the card's awakening-scoped
skill through GetSkillInfo at G86d63a and returns its INFO+0x10 string directly
at G86d676. This identifies a server-provided display-string field rather than
a demonstrated local <HunterID,slot> name table. A complete frontend locale-key
reinterpretation path was not closed here and must not be guessed.

Retained source also exposes the full parser in DataDump
sources/native/hunters/ghidra-ordinary-skill-layout.txt. Numeric effect graphs,
Rage cost, rank gates, description formulas and name strings remain separate
fields; recovering one cannot recover the others.

## Public table checks do not supply20 name bindings

Server resources/reference/recovered-data/leveldb-tables/all-tables.json,
SHA256 f166f857d45c6dd68e97bd4b8f055be795796400fa10ba9f040aaa1b1d8f0a78,
was parsed as structured data, without private-cache or external media scans.

- CHAR_STR_RO keys for each starter carry gear names/descriptions, title,
  summary and victory text; no starter skill-name keys are present.
- SKILL_REF_RO keys such as001|1|0 and001|1|1 supply Rage text, effect
  descriptions and formulas. They are not names. SKILL_REF.json's source pin
  remains50ad32940affdd74f070a59ebc0a99727fa1c35a386f1526ce17c3a9291ebf70.
- SKILL_TAG_RO keys <ref>|<slot> supply mechanic tags, not titles.
- SKILL_EFFECT_RO starter slot2/4 records supply effect/cut-in labels, not a
  proven complete skill-title binding for types1..5.
- SKILL_DESC_RO is keyed by locale and numbered effect-description fragments;
  its numeric173..344 dictionary is not a starter-name/slot table.
- UI_TEXT_RO contains no indexed001..004 skill-name keys. Its four keys with
  those digit strings are unrelated p001/p002 pet names/descriptions. Bare
  Korean localization keys may include skill-like wording, but they do not
  independently join a name to one exact Hunter and type.

The released datasets/hunters/skill-reference.json is a1070-row normalized
copy of the same symbolic SKILL_REF records, retaining raw_record/provenance
and its missing-magnitude limitation. It adds no title field or new identity
join. The curated2019 archive TSV supplies stat observations, not five skill
name columns.

## Decision

No exact20-slot name adapter is justified by the inspected public artifacts.
Do not turn HARD_HIT/HEAL/BLEED tags, an effect label or a translated sentence
into a purported original title. Do not borrow a name from an awakened/costume
reference or add implied numeric behavior to fill a blank skill panel.

A decisive next artifact is an original ordinary GetCard skill row carrying
name with an exact base ref/type, or a public source naming each skill with
that same identity/slot. Until then, retain current placeholders as explicit
reconstruction. This is a bounded negative join result, not a claim that every
public historical source is exhausted. Production tests were not rerun because
no implementation changed.
