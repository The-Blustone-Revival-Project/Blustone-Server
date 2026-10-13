# Episode reward wallet preservation

The exact RequestReward callback is bound via RTTI1e0e94a/vtable21531b0 to
Gb20680. It selects ret_data atGb206e0 and calls CSRMEpisode.ParseReward
Gb1ca7c atGb206fa. ParseReward synchronizes item atGb1cada, selects user at
Gb1cb00 and calls generic CSRPlayData.SyncUser Gb7047c atGb1cb0e.

SyncUser unconditionally reads user.iap_qty atGb7094a and stores paid Manda
atExchangeMgr+9c/Gb70996; free_iap_qty atGb709a0 overwrites+a0/Gb709ec. Missing
nonnull-user scalar fields default0 even after wallet delta pairs were parsed.
Earlier Episode currency receipts supplied pairs alone and could therefore
zero client quantities until an authoritative refresh. Server wallets were
already correct; this fix supplies both coherent scalar snapshots as well.

Before currency settlement, paid/free values and the planned reward quantity
are checked against native uint32 capacity. E02 includes the updated free
scalar and untouched paid scalar; E18 echoes both untouched Manda scalars with
its gold pair. Validation happens before changing wallet/claim markers, and
storage failure retains prior rollback behavior. No original quantities or
currency mappings changed; other currencies/items/owners remain intact.

Null/missing user is a distinct safe path: SyncUser tests its JSON tag at
Gb704ae/b0; tag0 branches viaGb704b2 toGb70d0a epilogue. Existing settled and
item-only user:null replies retain that early return without currency reset.
An empty object would be unsafe and is not substituted for null.

```powershell
npm run build
node scripts/verify-independent.mjs --fixture --exercise-episode-wallet
```

Disposable encrypted proof preloads authored clear flags, claims the original
E02 quantity30(20→50free/55paid unchanged) and E18 quantity100000(100→100100gold),
checks scalar/pair coherence and null-user replay, and preserves exact other
gameplay across restart except normal lobby clocks. Clear flags are fixture
admission, not native battle proof. Focused tests also cover oversized paid
wallet refusal without consuming a reward, rollback and owner isolation.

Original ARM SHA256 remains
c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec.
No live claim/save/profile/client/input change or APK build occurred.
