import assert from "node:assert/strict";
import { ServerState } from "../src/state.js";
import { gameResponse } from "../src/game-routes.js";
import { guildInfo, guildLobby, guildCreationUnavailable, GUILD_JOIN_TYPES, GUILD_MEMBER_ROLES } from "../src/guild-lobby.js";
import type { GuildRecord } from "../src/guild-lobby.js";

// Authored local identities only; no original guild or player instance claims.
const records: GuildRecord[] = [{ id: 7001, name: "Authored Test Guild", type: 1, fc_point_limit: 0,
  contribution: 10, region: "", emblem_id: "AUTHORED_FLAG", desc: "Authored fixture", rank: 1,
  gvg_win_cnt: 0, gvg_inf_win_cnt: 0, members: [
    { pvid: 1000001, contribution: 3, newbie: 0, role: 1, fc_point: 30 },
    { pvid: 1000002, contribution: 7, newbie: 1, role: 4, fc_point: 10 },
  ] }];
const accounts = new Set([1000001, 1000002, 1000003]), emblems = new Set(["AUTHORED_FLAG"]);
const before = JSON.stringify(records);
assert.deepEqual(guildLobby(1000003), { my_guild: { guild_id: 0, status: 0, newbie: 0, role: 0, contribution: 0 } });
assert.deepEqual(guildLobby(1000002, records, accounts, emblems), {
  my_guild: { guild_id: 7001, status: 3, newbie: 1, role: 4, contribution: 7 },
});
assert.equal(guildInfo(records[0], accounts, emblems).member_cnt, 2);
assert.deepEqual(guildInfo(records[0], accounts, emblems).members, records[0].members);
assert.equal(guildLobby(1000001, records, accounts, emblems).my_guild.contribution, 3,
  "Personal contribution must not copy guild-wide contribution10");
assert.equal(guildLobby(1000003, records, accounts, emblems).my_guild.guild_id, 0);
assert.throws(() => guildLobby(0), TypeError);
assert.throws(() => guildLobby(1000004, records, accounts, emblems), /established account/);
assert.throws(() => guildInfo(records[0], new Set([1000001]), emblems), /member identity/);
assert.throws(() => guildInfo(records[0], accounts, new Set()), /reference/);
assert.throws(() => guildInfo({ ...records[0], members: [records[0].members[0], records[0].members[0]] }, accounts, emblems), /identity/);
assert.throws(() => guildInfo({ ...records[0], members: records[0].members.map((member) => ({ ...member, role: 3, newbie:0 })) }, accounts, emblems), /one established leader/);
assert.throws(() => guildInfo({ ...records[0], members: [records[0].members[0], {...records[0].members[1],role:2}] }, accounts, emblems), /effective native role/,
  "A newbie supervisor would become native role4; imported authorization must not diverge");
assert.throws(() => guildLobby(1000001, [records[0], { ...records[0], id: 7002 }], accounts, emblems), /conflicting/);
assert.throws(() => guildLobby(1000001, [records[0], records[0]], accounts, emblems), /Duplicate/);
assert.deepEqual(GUILD_JOIN_TYPES, { public: 1, permission: 2, private: 3 });
assert.deepEqual(GUILD_MEMBER_ROLES, { leader: 1, supervisor: 2, member: 3, newcomer: 4 });
assert.match(guildCreationUnavailable().error, /fee.*not reconstructed/);
assert.equal(JSON.stringify(records), before, "Reads cannot create/change membership or economy");
const state = new ServerState("http://localhost");
const auth = state.registerGuest({ device_id: "no-established-guild" }, {}).ret_data as any;
const game = state.gameFor(state.accountFor(auth, {}));
const saved = JSON.stringify(game);
assert.deepEqual((gameResponse(state, "/lobby/GetGuildInfo", auth) as any).ret_data,
  { my_guild: { guild_id: 0, status: 0, newbie: 0, role: 0, contribution: 0 } });
assert.deepEqual((gameResponse(state, "/guild/GetNotifications", auth) as any).ret_data, {guild_notifications:[]},
  "RequestMsgList must reach ParseNoties through its named child to replace the notification cache");
for (const route of ["/guild/Found", "/guild/Apply", "/guild/Donate", "/guild/SupportFuel", "/gvg/Start"]) {
  assert.equal((gameResponse(state, route, auth) as any).result_code, 2001, "missing membership/data cannot become mock gameplay success");
  assert.throws(() => gameResponse(state, route, {}), /authenticated account required/);
}
assert.throws(() => gameResponse(state, "/lobby/GetGuildInfo", {}), /authenticated account required/);
assert.equal(JSON.stringify(game), saved, "Guild reads/refusals do not change any owned game field");
console.log("Guild lobby: native flat PLAY_DATA, separate INFO/member rows, original join/role enums, authenticated no-guild projection and no free-creation inference passed.");
