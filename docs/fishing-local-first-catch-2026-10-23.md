# Fishing first-catch restoration

Status: implemented for explicit LOCAL policies; pure, state, encrypted HTTP and schema16-to17 coexistence checks pass. Native settlement and rendering remain unverified. Default disabled. No live save or app change has been made for this provider. BlueStacks activation failed after fresh selection and one retry; taskbar restoration is pending.

## Recovered native contract

Source: original libnative_core.so SHA256 c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec; Ghidra addresses below are ELF offsets plus0x10000.

CSRSceneMgr::ApplyScene scene0x46 checks Fishing's record-loaded flag (GEA84FA), IsRecord (GEA850A), and GetState(27,2) (GEA854E). Loaded, no-record accounts with state<=1 enter the tutorial. Clearing27/0 alone does not skip this guide. Do not fabricate a record or preclear27/2.

The guide constructs TutorialThrow via scene0x4d, selecting LU003 through SetLure(1) atGEA8702/Gb2f064, then TutorialWait through scene0x4e. No ordinary Begin or source bait debit was recovered in these tutorial bodies. Selection does not establish consumption.

TutorialHook success case-3 calls RequestTutorialEnd(1,callback,1) atGef279a. RequestTutorialEnd atGb28864 resets fishing and sends five auth fields plus log_id:-1/is_win:1 to /fishing/EndWithSell. It supplies no fish identity, lure, place, distance, or inventory binding. Successful callbackGef3764 and animation completion precede the native RequestClear27/2 atGef28b0. The server must not advance that flag from End itself.

## Explicit LOCAL provider

Enable BLUSTONE_FISHING_TUTORIAL_MODE=local-first-catch with BLUSTONE_FISHING_TUTORIAL_POLICY_JSON loaded from config/policies/fishing-practice-tutorial.json. Supply the separate practice items/catalogue JSON and publish LU003 metadata through the archived bait-shop provider. No owned bait or invented bait debit is required for this tutorial. Ordinary casts remain a separate opt-in feature with positive log IDs and earned/purchased bait.

The practice policy awards LOCAL_PRACTICE_FISH, bronze, length10000, automatically selling for authored10gold. The fish's actual identity, original first-catch reward, length, and original sale prices remain unknown. FS001 and FS001_V are original art; the local item ID to those resources is an authored association, not recovered species identification. The player-facing label is Practice Fish.

Schema17 records one journal per account: policy, full fish metadata/grade-price reference hash, generated item instance ID, and settlement time. It retains the sold quantity0 stack and allocator. Records remain available after sale or disabling the provider. Later ordinary record lengths replace it only if strictly longer.

Pending ordinary casts block tutorial responses before duplicate handling, because the shared native callback removes the current consume marker. A successful tutorial is never replayed: terminal duplicates return the existing LOCAL10203 cleanup response. This prevents additive cached item/count duplication; it does not prove hot-cache recovery after a lost reply. Cold reload publishes the earned record and permits ordinary scene selection even if native27/2 acknowledgment was missed.

Both failed temporary writes and failed renames roll back inventory, owned fish, gold, allocator, and journal. The provider refuses a first award after actual27/2 completion, an ordinary successful catch, or positive fish ownership. Invalid producer fields are refused rather than accepted as a fish/reward choice.

## Native validation procedure

Use a fresh visible safe Village and preserve a private preflight snapshot. Configure the complete recipe and restart only the task-owned server, retaining current profile, Mirage policy/quota, team progression, Rupee settings and account state. Do not patch the live save or clear app storage.

Follow Airport's fishing choice and the native guide. Tutorial Hook needs paired DOWN/UP taps at intervals of at least0.1seconds. Tap promptly during the normal phase until70. At70, the guide pauses input for comments. Stop tapping, dismiss the fury explanation, and leave it alone during the scripted1.5second fury phase. Resume only after the instruction that it is no longer in fury mode; reach100. Observe actual EndWithSell(-1,1), result artwork, sale receipt and native Clear27/2 before claiming the tutorial works.

For ordinary fishing, purchase bait through the real six-Manda-for-ten-LU003 action. Cast through the observed UI and tap BT_LOOTING once at NOW_CATCH, not before or after its escape window. Normal hook left/right buttons select directions2/3; matching current direction scales gain0.6 and opposite1.2. Keep input prompt. Do not leave a timed wait/hook idle while inspecting source or logs.

Use npm run test:fishing-tutorial and npm run resources:verify-fishing-art for host checks. Native completion is a separate requirement; passing tests do not establish it.

## Local activation settings (pending native validation)

Preserve all existing launch settings described in AGENTS.md. Add these settings before starting the server; they do not grant bait or preclear tutorial flags:

```powershell
$env:BLUSTONE_BAIT_SHOP_MODE='archive-2018-projection'
$env:BLUSTONE_BAIT_SHOP_DAILY_LIMIT='3'
$env:BLUSTONE_FISHING_ITEMS_JSON=Get-Content -Raw config/policies/fishing-practice-items.json
$env:BLUSTONE_FISHING_CATALOGUE_JSON=Get-Content -Raw config/policies/fishing-practice-catalogue.json
$env:BLUSTONE_FISHING_TUTORIAL_MODE='local-first-catch'
$env:BLUSTONE_FISHING_TUTORIAL_POLICY_JSON=Get-Content -Raw config/policies/fishing-practice-tutorial.json
$env:BLUSTONE_FISHING_CAST_MODE='local-configured'
$env:BLUSTONE_FISHING_CAST_POLICY_JSON=Get-Content -Raw config/policies/fishing-practice-casts.json
$env:BLUSTONE_FISHING_SALE_MODE='local-bound'
$env:BLUSTONE_FISHING_SALE_BINDINGS_JSON=Get-Content -Raw config/policies/fishing-practice-sale-bindings.json
```

After successful tutorial settlement, retained item metadata and catalogue must still be supplied on restart even when tutorial mode is disabled (remove its policy JSON environment variable too). Changing a captured fish definition or grade price deliberately refuses startup. Do not retune earned journals or remove the zero-quantity tutorial stack.
