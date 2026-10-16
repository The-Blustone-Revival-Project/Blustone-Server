# Unreconstructed WebView operations refuse without claiming rewards

The nine paths in `webviewEvidenceRoutes` previously returned local success,
including `accepted:true` and `claimed:true`, despite having no event period,
catalogue, eligible owner, price, pool, reward DTO or settlement implementation.
GetCardList also returned empty success without a reconstructed catalogue.
These responses could falsely tell a page that a claim or recommendation was
recorded. They now return HTTP200 with provisional LOCAL `result_code:2001`,
`success:false` and identical `ret_data`/`data`:
`{accepted:false,claimed:false,items:[]}`.

Affected paths:

- `/webview/evaluation/GetCardList`
- `/webview/evaluation/RecordCardRecommend`
- `/webview/event_battle/PointReward`
- `/webview/event_battle/WinReward`
- `/webview/event_item_collect/ItemExchangeReward`
- `/webview/event_money_spend/Reward`
- `/webview/event_quest/JoinCamp`
- `/webview/event_quest/Reward`
- `/webview/event_quest/RewardLast`

The unavailable message and error code are explicit revival policy, not a
recovered original error response. These are WebView routes, not a claim about
native game RPC contracts. Route and sanitized request-key diagnostics remain;
body values are never reflected, and keys containing token/secret/password/
cookie/otp are filtered. There is no account lookup, game allocation, wallet
change, participation record, reward grant or persistence on these paths,
regardless of credentials or malformed decoded body shape. Invalid JSON syntax
may still be refused earlier by Express's independent HTTP400 parser boundary.

Working `/webview/my-info` GET and `/webview/my-info/update` POST retain their
existing authenticated profile-edit behavior. Their handlers were not changed.

`tests/webview-unavailable.ts` checks all nine routes with ordinary, invalid
shape, authenticated, anonymous, JSON and form inputs. It additionally calls
the handlers with malformed decoded scalar/null/missing bodies. Account/game
lookup and persistence are replaced with throwing sentinels; all requests must
leave the exact disposable save bytes, account/game data and root identities
unchanged. It checks both receipt aliases, unavailable semantics, sanitized key
diagnostics and absence of reflected secret/body values. The existing smoke
test now expects the explicit JoinCamp refusal.
