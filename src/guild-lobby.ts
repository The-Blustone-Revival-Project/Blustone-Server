/** Native fields from ParseMyInfo Ga685f0 / PLAY_DATA.parse Ga823b0,
 * ParseGuild Ga6a384, and member helper Ga6b4b0. No original guild instances,
 * fees, reward tables or player affiliations have been reconstructed.
 */
export interface GuildMember { pvid: number; contribution: number; newbie: number; role: 1 | 2 | 3 | 4; fc_point: number }
export interface GuildRecord {
  id: number; name: string; type: 1 | 2 | 3; fc_point_limit: number; contribution: number;
  region: string; emblem_id: string; desc: string; rank: number;
  gvg_win_cnt: number; gvg_inf_win_cnt: number; members: GuildMember[];
}
export const GUILD_JOIN_TYPES = { public: 1, permission: 2, private: 3 } as const;
export const GUILD_MEMBER_ROLES = { leader: 1, supervisor: 2, member: 3, newcomer: 4 } as const;

function safeId(value: number) { return Number.isSafeInteger(value) && value > 0; }
function count(value: number) { return Number.isInteger(value) && value >= 0 && value <= 0x7fff_ffff; }

/** Project only complete already-established guilds. The caller's account and
 * original emblem registries prevent imported private/unknown identities from
 * silently becoming local members. This helper creates no affiliation.
 */
export function guildInfo(record: GuildRecord, knownAccounts: ReadonlySet<number>, knownEmblems: ReadonlySet<string>) {
  if (!safeId(record.id) || typeof record.name !== "string" || !record.name.length || ![1, 2, 3].includes(record.type) ||
      ![record.fc_point_limit, record.contribution, record.rank, record.gvg_win_cnt, record.gvg_inf_win_cnt].every(count) ||
      ![record.region, record.emblem_id, record.desc].every((value) => typeof value === "string") ||
      !knownEmblems.has(record.emblem_id) || !Array.isArray(record.members) || record.members.length === 0)
    throw new TypeError("Guild identity/reference is not established");
  const seen = new Set<number>();
  const members = record.members.map((member) => {
    if (!safeId(member.pvid) || !knownAccounts.has(member.pvid) || seen.has(member.pvid) ||
        !count(member.contribution) || !count(member.fc_point) || ![0, 1].includes(member.newbie) ||
        ![1, 2, 3, 4].includes(member.role)) throw new TypeError("Guild member identity is not established");
    seen.add(member.pvid);
    return { pvid: member.pvid, contribution: member.contribution, newbie: member.newbie, role: member.role, fc_point: member.fc_point };
  });
  if (members.filter((member) => member.role === 1).length !== 1) throw new TypeError("Guild needs one established leader");
  // Ban/invitation histories are not represented here. Omit their optional
  // fields rather than publish empty collections as if absence were proven.
  return { id: record.id, name: record.name, type: record.type, fc_point_limit: record.fc_point_limit,
    contribution: record.contribution, region: record.region, emblem_id: record.emblem_id, desc: record.desc,
    rank: record.rank, gvg_win_cnt: record.gvg_win_cnt, gvg_inf_win_cnt: record.gvg_inf_win_cnt,
    member_cnt: members.length, members };
}

/** ReqGuildInstCB Gae61dc reads ret_data.my_guild and passes JUST that subtree
 * to ParseMyInfo. my_guild is flat PLAY_DATA, not the Guild INFO object.
 */
export function guildLobby(pvid: number, established: readonly GuildRecord[] = [], knownAccounts: ReadonlySet<number> = new Set([pvid]),
  knownEmblems: ReadonlySet<string> = new Set()) {
  if (!safeId(pvid) || !knownAccounts.has(pvid)) throw new TypeError("Guild lobby requires an established account");
  const ids = new Set<number>();
  const own = established.map((record) => {
    if (ids.has(record.id)) throw new TypeError("Duplicate established guild identity");
    ids.add(record.id);
    return guildInfo(record, knownAccounts, knownEmblems);
  }).filter((record) => record.members.some((member) => member.pvid === pvid));
  if (own.length > 1) throw new TypeError("Account has conflicting guild affiliations");
  if (own.length === 0) return { my_guild: { guild_id: 0, status: 0, newbie: 0, role: 0, contribution: 0 } };
  const guild = own[0], member = guild.members.find((entry) => entry.pvid === pvid)!;
  return { my_guild: { guild_id: guild.id, status: 3, newbie: member.newbie, role: member.role, contribution: member.contribution } };
}

/** Preserve the explicit missing-fee gate. An absent action quote must not
 * become zero-cost guild creation. Payment-type and creation gates still need
 * exact original rows before a Found transaction can be enabled.
 */
export function guildCreationUnavailable() {
  return { error: "Original guild creation fee, payment type and admission gates are not reconstructed" };
}
