# Guild association and action-price reads

Authenticated /guild/GetUserGuilds accepts the native singleton
target_pvid_list JSON-array form string. It returns compact USER rows under
ret_data.user_guilds for established joined same-server accounts. Those fields
are Guild summary metadata, not Hunter/user profiles: pvid/id/name/type/
fc_point_limit/contribution/region/emblem_id. Unknown, unjoined or foreign-server
accounts produce[]. Arbitrary batches refuse because the native callback uses
only the first USER row. Reads neither assign membership nor update personal
my_guild or saved gameplay. The contribution field copies explicitly supplied
Guild aggregate as local projection policy; its original producer is unproved.

Authenticated /reference/GetGuildPrices publishes detached bare action/
price_type/price arrays from immutable explicit constructor guildPrices or
BLUSTONE_GUILD_ACTION_PRICES_JSON. Default remains empty. Duplicate/malformed
rows refuse before saves are restored. Original callback binding and action
meanings are recorded in the separate native audit: creation1 has a gold UI
gate, name2/country3 modification quotes sum for a Manda UI gate. Original
amounts, server currency settlement, debit priority and permissions are missing.
Quotes do not enable Found/Update or any membership/fee/reward transaction.

```powershell
npm run build
node scripts/verify-independent.mjs --fixture --profile current-e6-guild --exercise-guild-records --exercise-gem-level-reference
```

The compiled encrypted proof now also checks compact association metadata,
single-target validation, authored17/23/31 action-price arrays and actual
registered /guild/Update refusal. It preserves established records and exact
gameplay across restart apart from normal lobby fuel clocks. The initial test
used a guessed /guild/Modify route; HTTP404 exposed that mismatch, and the
proof now targets the recovered /guild/Update vocabulary instead. No complete
Update request/settlement contract is claimed.

Focused tests prove auth, same-server/unknown/unjoined handling, detached
whitelisted metadata, aggregate/personal counter distinction, immutable price
snapshots, malformed-config byte preservation and restart. Live source/profile/
save/client remain untouched; native menus and original numerical rows remain
unverified.
