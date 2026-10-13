import { repositoryPath } from "./paths.js";
import express, { type Request, type Response } from "express";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LOCAL_MAIL_PORTRAIT_PATH } from "./mail.js";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import { discoverEndpoints, defaultCatalogPath, groupEndpoints } from "./catalog.js";
import { buildOpenApi } from "./openapi.js";
import { NativeAuthError, ServerState } from "./state.js";
import { gameResponse } from "./game-routes.js";
import { readConfig, type ServerConfig } from "./config.js";
import { applyBodyParsers, errorHandler, notFound, requestLogging } from "./middleware.js";
import { registerRoutes, routeSummary, type RouteDefinition } from "./routes.js";
import { webviewRouteDefinitions } from "./webview-routes.js";
import {attachGuildChat} from "./guild-chat.js";

export interface AppContext {
  app: express.Express;
  state: ServerState;
  endpoints: string[];
  openapi: ReturnType<typeof buildOpenApi>;
  routes: readonly RouteDefinition[];
}

interface ResourcePackage {
  name: string;
  packageName: string;
  signature: string;
  packageMd5: string;
  size: number;
  stamp: string;
  step: number;
  filePath: string;
}

const coreRoutes = new Set([
  "/healthz", "/debug/routes", "/debug/state", "/VERSION", "/AUTHORIZATION_REQUEST",
  "/selected_server", "/launcher/GetBaseInfo", "/shared_secret/Exchange",
  "/v2/account/RegisterGuest", "/v2/account/Login", "/account/ConfirmNickname", "/login",
  "/account/Unbind", "/account/Unregister", "/pv_account/get_token",
  "/pv_account/register_push_token",
]);

export function createApp(options: { baseUrl?: string; catalogPath?: string; stateFile?: string; legacyCardIds?: boolean;guildChatMode?:"disabled"|"local-memory" } = {}): AppContext {
  const baseUrl = options.baseUrl ?? "http://127.0.0.1:8080";
  const state = new ServerState(baseUrl, options.stateFile, { legacyCardIds: options.legacyCardIds,guildChatMode:options.guildChatMode });
  const endpoints = discoverEndpoints(options.catalogPath ?? defaultCatalogPath());
  const openapi = buildOpenApi(endpoints, baseUrl);
  let runtimeReslistHeader: string | undefined;
  let runtimeReslistSequence: string[] | undefined;
  let runtimeReslistIndex = 0;
  let reslistRequestCount = 0;
  const app = express();
  const routeDefinitions: RouteDefinition[] = [];

  app.disable("x-powered-by");
  applyBodyParsers(app);
  app.use(requestLogging());
  routeDefinitions.push(
    // Unchanged original 1.4.4.1 system icon. Native profile callback requires100x100.
    { method: "get", path: LOCAL_MAIL_PORTRAIT_PATH, name: "local-mail-portrait", handler: (_req, res) =>
      res.sendFile(repositoryPath("assets", "local-mail-profile-100.png")) },
    { method: "get", path: "/healthz", name: "health", handler: (_req, res) => res.json({ ok: true, service: "blustone-replica", ...state.summary() }) },
    { method: "get", path: "/debug/routes", name: "route-introspection", handler: (_req, res) => res.json({ count: endpoints.length, groups: groupEndpoints(endpoints), registered: routeSummary(routeDefinitions) }) },
    { method: "get", path: "/debug/state", name: "state-introspection", handler: (_req, res) => res.json(state.summary()) },
    { method: "post", path: "/debug/reslist", name: "reslist-override", handler: (req, res) => {
      const body = req.body as Record<string, unknown>;
      if (Array.isArray(body.sequence) && body.sequence.every((item) => typeof item === "string")) {
        runtimeReslistSequence = body.sequence as string[];
        runtimeReslistIndex = 0;
        runtimeReslistHeader = undefined;
        return res.json({ ok: true, sequence_length: runtimeReslistSequence.length });
      }
      if (typeof body.body !== "string") return res.status(400).json({ error: "body or sequence must be provided" });
      runtimeReslistSequence = undefined;
      runtimeReslistIndex = 0;
      runtimeReslistHeader = body.body;
      return res.json({ ok: true, bytes: Buffer.byteLength(runtimeReslistHeader, "utf8") });
    } },
  );
  app.get("/openapi.json", (_req, res) => res.json(openapi));
  app.get("/openapi.yaml", (_req, res) => {
    res.type("text/yaml").send(YAML.stringify(openapi));
  });
  // The CDN bootstrap asks for `/reslist_<version>.list` before it can decide
  // whether any bundled JET packages need patching. An empty manifest is a
  // valid local-replica starting point; package routes can be added as the
  // client reveals them.
  app.get(/^\/reslist_\d+\.list$/, (_req, res) => {
    const requestIndex = reslistRequestCount++;
    const sequenceBody = runtimeReslistSequence?.[Math.min(runtimeReslistIndex++, runtimeReslistSequence.length - 1)];
    const bootstrapHeader = requestIndex === 0 ? process.env.BLUSTONE_RESLIST_BOOTSTRAP_HEADER : undefined;
    const explicitHeader = sequenceBody ?? runtimeReslistHeader ?? bootstrapHeader ?? process.env.BLUSTONE_RESLIST_HEADER;
    const body = explicitHeader ?? resourceManifest(resourcePackages());
    return res.status(200).type("text/plain").send(body.endsWith("\n") ? body : `${body}\n`);
  });
  app.get(/^\/(?:cdn\/|resource\/|resources\/)?([^/]+\.jet)$/i, (req, res) => {
    const packageName = String(req.params[0] ?? "");
    const resource = resourcePackages().find((item) => item.packageName.toLowerCase() === packageName.toLowerCase());
    if (!resource) return res.status(404).json({ error: "resource package not found", package: packageName });
    res.type("application/octet-stream");
    return res.sendFile(resource.filePath, { dotfiles: "deny" }, (error) => {
      const statusCode = typeof (error as { statusCode?: unknown } | undefined)?.statusCode === "number"
        ? (error as unknown as { statusCode: number }).statusCode
        : 500;
      if (error && !res.headersSent) res.status(statusCode).json({ error: "resource package read failed" });
    });
  });
  app.get(/^\/(?:cdn\/|resource\/|resources\/)?([A-Za-z0-9_.-]+)_([0-9]+)\.pkg$/i, (req, res) => {
    const packageName = `${String(req.params[0] ?? "")}.jet`;
    const resource = resourcePackages().find((item) => item.packageName.toLowerCase() === packageName.toLowerCase());
    if (!resource) return res.status(404).json({ error: "resource package not found", package: packageName });
    res.type("application/octet-stream");
    if (["empty", "wrap", "pkgi1", "pkgi1-tree"].includes(process.env.BLUSTONE_PACKAGE_MODE ?? "")) {
      return sendBufferWithRange(req, res, packagePayload(resource));
    }
    return res.sendFile(resource.filePath, { acceptRanges: true, dotfiles: "deny" }, (error) => {
      const statusCode = typeof (error as { statusCode?: unknown } | undefined)?.statusCode === "number"
        ? (error as unknown as { statusCode: number }).statusCode
        : 500;
      if (error && !res.headersSent) res.status(statusCode).json({ error: "resource package read failed" });
    });
  });
  // The native launcher resolves these URL keys before entering the lobby.
  // A retired production maintenance document otherwise remains the client's
  // fallback even after the local lobby bootstrap succeeds.  Return a local
  // handoff page so the WebView can leave its stale history explicitly.
  routeDefinitions.push(
    { method: "get", path: "/maintenance-replica-online", name: "maintenance-compat", handler: (_req, res) => res.type("html").send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Blustone Replica</title><style>body{font-family:sans-serif;background:#eef3f8;color:#263238;text-align:center;padding:18vh 8vw}button{font-size:22px;padding:16px 32px;border:0;border-radius:12px;background:#f5365c;color:#fff}</style></head><body><h1>Blustone Replica</h1><p>The local server is online.</p><button onclick="history.back()">Continue to Midgard</button></body></html>`) },
    { method: "get", path: "/d_unit_id_1", name: "unit-id-compat", handler: (_req, res) => res.status(204).end() },
    { method: "get", path: "/ad_unit_id_1", name: "ad-unit-compat", handler: (_req, res) => res.status(204).end() },
    { method: "get", path: "/login", name: "native-email-login-page", handler: (_req, res) => res.type("html").send(
      "<!doctype html><html><head><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Blustone Login</title></head><body><form method=\"post\" action=\"/login\"><label>Email <input name=\"email\" type=\"email\" autocomplete=\"username\" required></label><label>Password <input name=\"password\" type=\"password\" autocomplete=\"current-password\" required></label><button type=\"submit\">Login</button></form></body></html>",
    ) },
    { method: "post", path: "/login", name: "native-email-login", handler: (req, res) => {
      try {
        const result = state.webLogin(payloadOf(req, state), headersOf(req));
        const wantsHtml = String(req.headers.accept ?? "").includes("text/html") || String(req.headers["content-type"] ?? "").toLowerCase().startsWith("application/x-www-form-urlencoded");
        if (wantsHtml && Number(result.result_code ?? 1) === 1) {
          const data = JSON.stringify(result.ret_data).replaceAll("<", "\\u003c");
          return res.type("html").send(`<!doctype html><html><body><script>(function(){const data=${data};if(window.VSWebViewBridge){if(typeof window.VSWebViewBridge.SetData==='function')window.VSWebViewBridge.SetData(JSON.stringify(data));if(typeof window.VSWebViewBridge.GetDataFromJS==='function')window.VSWebViewBridge.GetDataFromJS(JSON.stringify(data));if(typeof window.VSWebViewBridge.CloseView==='function')window.VSWebViewBridge.CloseView();}else{document.body.textContent='Login complete';}})();</script></body></html>`);
        }
        return sendResponse(req, res, state, result);
      } catch (error) {
        if (error instanceof NativeAuthError) return sendResponse(req, res, state, state.failure(error.code, error.message));
        throw error;
      }
    } },
  );
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi, {
    customSiteTitle: "Blustone Replica API",
    swaggerOptions: { displayRequestDuration: true, persistAuthorization: false, docExpansion: "none" },
  }));

  for (const method of ["get", "post"] as const) {
    routeDefinitions.push(
      { method, path: "/VERSION", name: `version-${method}`, handler: (req, res) => sendResponse(req, res, state, state.envelope({ version: "2.8.0.1", version_code: 28010 })) },
      { method, path: "/AUTHORIZATION_REQUEST", name: `authorization-${method}`, handler: (req, res) => sendResponse(req, res, state, state.envelope({ authorized: true, mock: true })) },
      { method, path: "/selected_server", name: `selected-server-${method}`, handler: (req, res) => sendResponse(req, res, state, state.selectServer(payloadOf(req, state))) },
      { method, path: "/launcher/GetBaseInfo", name: `base-info-${method}`, handler: (req, res) => {
        const data = state.baseInfo();
        return sendResponse(req, res, state, state.envelope(data, { ...data }));
      } },
      { method, path: "/shared_secret/Exchange", name: `shared-secret-${method}`, handler: (req, res) => {
        if (method === "get") return res.status(405).json({ error: "POST required" });
        try {
          const exchange = state.exchangeSecret(payloadOf(req, state));
          return res.status(200).setHeader("Content-Type", "application/octet-stream")
            .setHeader("PV-AccessToken", exchange.accessToken).setHeader("PV-Signature", exchange.signature).send(exchange.body);
        } catch (error) {
          return res.status(400).json({ error: error instanceof Error ? error.message : "invalid shared-secret request" });
        }
      } },
      { method, path: "/v2/account/RegisterGuest", name: `register-guest-${method}`, handler: (req, res) => stateCall(req, res, state, () => state.registerGuest(payloadOf(req, state), headersOf(req))) },
      { method, path: "/v2/account/Login", name: `login-${method}`, handler: (req, res) => stateCall(req, res, state, () => state.login(payloadOf(req, state), headersOf(req))) },
      { method, path: "/account/ConfirmNickname", name: `confirm-nickname-${method}`, handler: (req, res) => stateCall(req, res, state, () => state.confirmNickname(payloadOf(req, state), headersOf(req))) },
      { method, path: "/account/Unbind", name: `unbind-${method}`, handler: (req, res) => sendResponse(req, res, state, state.envelope({ accepted: true })) },
      { method, path: "/account/Unregister", name: `unregister-${method}`, handler: (req, res) => sendResponse(req, res, state, state.envelope({ accepted: true })) },
      { method, path: "/pv_account/get_token", name: `get-token-${method}`, handler: (req, res) => {
        return stateCall(req, res, state, () => {
          const account = state.accountFor(payloadOf(req, state), headersOf(req));
          return state.envelope({}, { token: account.vsToken, vs_token: account.vsToken, pvid: account.pvid });
        });
      } },
      { method, path: "/pv_account/register_push_token", name: `register-push-${method}`, handler: (req, res) => stateCall(req, res, state, () => state.registerPushToken(payloadOf(req, state), headersOf(req))) },
    );
  }

  let diagnosticResponseAt = 0;
  for (const route of endpoints) {
    if (coreRoutes.has(route)) continue;
    routeDefinitions.push({ method: "post", path: route, name: `recovered-${route.slice(1).replaceAll("/", "-")}`, handler: (req, res) => {
      const spacing = Math.min(1000, Math.max(0, Number(process.env.BLUSTONE_DIAGNOSTIC_RESPONSE_SPACING_MS) || 0));
      // Read-only reference-registration probes need time before an owned
      // missing-reference instance reaches inventory. This delays responses,
      // never filters ownership or changes stored cards; unset for normal runs.
      const lobbyHold = route === "/lobby/GetCardInven" || route === "/lobby/GetCardBook"
        ? Math.min(60_000, Math.max(0, Number(process.env.BLUSTONE_DIAGNOSTIC_LOBBY_HOLD_MS) || 0)) : 0;
      const respond = () => {
        if (res.destroyed) return;
        console.info(`response-dispatch ${new Date().toISOString()} ${route}`);
        stateCall(req, res, state, () => gameResponse(state, route, payloadOf(req, state), headersOf(req)));
      };
      if (!spacing && !lobbyHold) return respond();
      diagnosticResponseAt = Math.max(Date.now(), diagnosticResponseAt) + spacing;
      setTimeout(respond, Math.max(lobbyHold, diagnosticResponseAt - Date.now()));
    } });
  }

  // WebView event/evaluation contracts are evidence-backed form fixtures and
  // intentionally remain separate from the recovered native route catalog.
  routeDefinitions.push(...webviewRouteDefinitions());

  registerRoutes(app, routeDefinitions);
  app.use(notFound());
  app.use(errorHandler());
  return { app, state, endpoints, openapi, routes: routeDefinitions };
}

function resourcePackages(): ResourcePackage[] {
  const packageDirectory = path.resolve(
    process.env.BLUSTONE_PACKAGE_DIR
      ?? repositoryPath("resources", "runtime", "packages"),
  );
  const names = (process.env.BLUSTONE_PACKAGE_NAMES ?? "E_NEW.jet,E_MIDAGE.jet")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => /^[A-Za-z0-9_.-]+\.jet$/i.test(name));
  const stamp = process.env.BLUSTONE_RESLIST_STAMP ?? "1634659";
  const assetDirectory = process.env.BLUSTONE_RESOURCE_ASSET_DIR
    ? path.resolve(process.env.BLUSTONE_RESOURCE_ASSET_DIR)
    : undefined;
  return names.flatMap((packageName) => {
    const bundledPath = path.join(packageDirectory, packageName);
    const assetPath = assetDirectory ? path.join(assetDirectory, packageName) : undefined;
    const filePath = existsSync(bundledPath) ? bundledPath : (assetPath ?? bundledPath);
    if (!existsSync(filePath) || !statSync(filePath).isFile()) return [];
    const sourceBytes = readFileSync(filePath);
    const bytes = packagePayload({ filePath, stamp });
    return [{
      name: packageName.slice(0, -4),
      packageName,
      // The manifest's `sign` is validated after unpacking against the
      // inner `.jet` file. The download `size`, however, is the byte size of
      // the outer `.pkg` response. Keeping these distinct is required once
      // the native PKGI v1 container is enabled.
      signature: createHash("md5").update(sourceBytes).digest("hex").toUpperCase(),
      packageMd5: createHash("md5").update(bytes).digest("hex").toUpperCase(),
      size: bytes.length,
      stamp,
      step: 0,
      filePath,
    }];
  });
}

function packagePayload(resource: Pick<ResourcePackage, "filePath" | "stamp">): Buffer {
  if (process.env.BLUSTONE_PACKAGE_MODE === "empty") {
    const header = Buffer.alloc(20);
    const stamp = Number(resource.stamp) || 0;
    header.writeUInt32LE(stamp, 0);
    header.writeUInt32LE(stamp, 4);
    header.writeUInt32LE(0, 8);
    header.writeUInt32LE(0, 12);
    header.writeUInt32LE(0, 16);
    return header;
  }
  if (process.env.BLUSTONE_PACKAGE_MODE === "pkgi1") {
    const payload = readFileSync(resource.filePath);
    const name = Buffer.from(path.basename(resource.filePath), "utf8");
    const stamp = Number(resource.stamp) || 0;
    const header = Buffer.alloc(20);
    // CPVCDN::ExportPKGIver1 reads a 20-byte little-endian header and uses
    // the final u32 as the item count. The two u32s after the filename are
    // deliberately ordered as item_size, item_offset; UnPacking consumes
    // them as record +0x10 (size) and record +0x0c (offset).
    header.writeUInt32LE(stamp, 0);
    header.writeUInt32LE(0, 4);
    header.writeUInt32LE(1, 8);
    header.writeUInt32LE(0, 12);
    header.writeUInt32LE(1, 16);
    const recordLength = 1 + name.length + 8;
    const record = Buffer.alloc(recordLength);
    record.writeUInt8(name.length, 0);
    name.copy(record, 1);
    record.writeUInt32LE(payload.length, 1 + name.length);
    record.writeUInt32LE(header.length + recordLength, 5 + name.length);
    return Buffer.concat([header, record, payload]);
  }
  if (process.env.BLUSTONE_PACKAGE_MODE === "pkgi1-tree") {
    const entries = packageTreeEntries(resource.filePath);
    const stamp = Number(resource.stamp) || 0;
    const header = Buffer.alloc(20);
    header.writeUInt32LE(stamp, 0);
    header.writeUInt32LE(0, 4);
    header.writeUInt32LE(entries.length, 8);
    header.writeUInt32LE(0, 12);
    header.writeUInt32LE(entries.length, 16);

    const records: Buffer[] = [];
    const tableLength = entries.reduce((total, entry) => total + 1 + Buffer.byteLength(entry.name, "utf8") + 8, 0);
    let offset = header.length + tableLength;
    for (const entry of entries) {
      const name = Buffer.from(entry.name, "utf8");
      if (name.length > 255) throw new Error(`Package entry name is too long: ${entry.name}`);
      const record = Buffer.alloc(1 + name.length + 8);
      record.writeUInt8(name.length, 0);
      name.copy(record, 1);
      record.writeUInt32LE(entry.payload.length, 1 + name.length);
      // Native CPVCDN::UnPacking reads the absolute payload offset from the
      // record. Keep the table contiguous, then append all payloads.
      record.writeUInt32LE(offset, 5 + name.length);
      records.push(record);
      offset += entry.payload.length;
    }
    return Buffer.concat([header, ...records, ...entries.map((entry) => entry.payload)]);
  }
  if (process.env.BLUSTONE_PACKAGE_MODE === "wrap") {
    const payload = readFileSync(resource.filePath);
    const name = Buffer.from(path.basename(resource.filePath), "utf8");
    const header = Buffer.alloc(20);
    const stamp = Number(resource.stamp) || 0;
    header.writeUInt32LE(stamp, 0);
    header.writeUInt32LE(stamp, 4);
    header.writeUInt32LE(0, 8);
    header.writeUInt32LE(0, 12);
    header.writeUInt32LE(1, 16);
    const record = Buffer.alloc(1 + name.length + 16);
    record.writeUInt8(name.length, 0);
    name.copy(record, 1);
    const payloadOffset = header.length + record.length;
    record.writeUInt32LE(payloadOffset, 1 + name.length);
    record.writeUInt32LE(payload.length, 5 + name.length);
    record.writeUInt32LE(payload.length, 9 + name.length);
    record.writeUInt32LE(0, 13 + name.length);
    return Buffer.concat([header, record, payload]);
  }
  return readFileSync(resource.filePath);
}

interface PackageEntry {
  name: string;
  payload: Buffer;
}

function packageTreeEntries(packagePath: string): PackageEntry[] {
  // These opt-in trees are for reconstructed local resources that the original
  // package unpacker writes below files/local. They are deliberately disabled
  // by default and only allow files below configured directories.
  const packageBase = path.basename(packagePath).toUpperCase();
  const isUiDatabase = ["UI_XML_RO.JET", "UI_XML_RO.DB.JET"].includes(packageBase);
  const entries: PackageEntry[] = isUiDatabase
    ? []
    : [{ name: path.basename(packagePath), payload: readFileSync(packagePath) }];
  const treeRoot = isUiDatabase
    ? (process.env.BLUSTONE_UI_PACKAGE_TREE_DIR ?? process.env.BLUSTONE_PACKAGE_TREE_DIR)
    : process.env.BLUSTONE_PACKAGE_TREE_DIR;
  if (!treeRoot || (!["E_NEW.JET", "UI_XML_RO.JET", "UI_XML_RO.DB.JET"].includes(packageBase))) return entries;
  const root = path.resolve(treeRoot);
  if (!existsSync(root) || !statSync(root).isDirectory()) return entries;
  const requiredPrefix = isUiDatabase
    ? (process.env.BLUSTONE_UI_PACKAGE_TREE_PREFIX ?? "UI_XML_RO.db/").replaceAll("\\", "/")
    : undefined;
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, item.name);
      if (item.isDirectory()) visit(fullPath);
      else if (item.isFile() && !/^(?:\d+\.log|LOCK|LOG|LOG\.old|CURRENT\.ldb|LOCK\.ldb|LOG\.ldb)$/i.test(item.name)) files.push(fullPath);
    }
  };
  visit(root);
  for (const filePath of files) {
    const relative = path.relative(root, filePath).split(path.sep).join("/");
    if (requiredPrefix && !relative.startsWith(requiredPrefix)) continue;
    if (!isUiDatabase && relative.toLowerCase() !== "e_new.jet") continue;
    if (relative.toLowerCase() === path.basename(packagePath).toLowerCase()) continue;
    entries.push({ name: relative, payload: readFileSync(filePath) });
  }
  // The recovered phone bundle stores stage/map resources as separate JET
  // entries.  Include only the explicitly selected, offline-recovered assets
  // in the E_NEW package so the native CDN unpacker materializes them below
  // files/local.  This keeps arbitrary host files out of the package route.
  if (!isUiDatabase && packageBase === "E_NEW.JET" && process.env.BLUSTONE_RESOURCE_ASSET_DIR) {
    const assetRoot = path.resolve(process.env.BLUSTONE_RESOURCE_ASSET_DIR);
    const assetNames = (process.env.BLUSTONE_RESOURCE_ASSET_NAMES
      ?? "MAP_ZONE_1.jet,ST001.jet,M001.jet,MAIN_BG01.jet,MAIN_ICON.jet,SNOW.jet,UI_BATTLE.jet,UI_BATTLE2.jet")
      .split(",")
      .map((name) => path.basename(name.trim()))
      .filter((name) => /^[A-Za-z0-9_.-]+\.jet$/i.test(name));
    // `BLUSTONE_RESOURCE_ASSET_GLOB` widens the folded set without editing the
    // explicit list. It exists for the **gacha card art**: a card whose
    // `res_prefix` has no package in this list renders as empty animation
    // layers, exactly like the `ST001` `resource_id` gap in AGENTS.md §16.6
    // item 3. `tools/start-server.ps1` already globs `C001*.jet` into
    // `BLUSTONE_RESOURCE_ASSET_NAMES` (and that is still the right place to do
    // it); this dial is the in-process equivalent for anyone starting the
    // server directly.
    //
    // UNSET BY DEFAULT ON PURPOSE. `C00*.jet` is ~570 packages / 587 MB, which
    // would change the E_NEW payload the working battle downloads. A tester who
    // wants the second card's portrait sets
    // `BLUSTONE_RESOURCE_ASSET_GLOB='C002.jet'` (the base art, 739 583 bytes -
    // the animation slots `_A*`/`_D*` live inside it) or `'C002*.jet'` for the
    // whole family (+5.9 MB of effect/portrait/voice) or `'C00*.jet'` for the
    // entire roster. Only files that actually exist under the asset root are
    // folded in, so a bad glob is a no-op rather than a crash.
    for (const pattern of (process.env.BLUSTONE_RESOURCE_ASSET_GLOB ?? "").split(",").map((value) => value.trim()).filter(Boolean)) {
      if (!/^[A-Za-z0-9_.*?-]+$/.test(pattern)) continue;
      for (const entry of readdirSync(assetRoot, { withFileTypes: true })) {
        if (!entry.isFile() || !globMatches(pattern, entry.name)) continue;
        if (!/^[A-Za-z0-9_.-]+\.jet$/i.test(entry.name)) continue;
        if (!assetNames.some((name) => name.toLowerCase() === entry.name.toLowerCase())) assetNames.push(entry.name);
      }
    }
    for (const name of assetNames) {
      const assetPath = path.resolve(assetRoot, name);
      if (!assetPath.startsWith(`${assetRoot}${path.sep}`) || !existsSync(assetPath) || !statSync(assetPath).isFile()) continue;
      if (entries.some((entry) => entry.name.toLowerCase() === name.toLowerCase())) continue;
      entries.push({ name, payload: readFileSync(assetPath) });
    }
  }
  return entries;
}

/**
 * Minimal `*` / `?` glob for `BLUSTONE_RESOURCE_ASSET_GLOB`.
 *
 * Deliberately not a dependency and not a full glob: the only patterns in use
 * are `C002*.jet` / `C00*.jet`, and every other metacharacter is rejected by the
 * caller's character-class filter before this runs. Case-insensitive, because
 * the package names are matched case-insensitively everywhere else here.
 */
function globMatches(pattern: string, name: string): boolean {
  const source = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${source}$`, "i").test(name);
}

function sendBufferWithRange(req: Request, res: Response, body: Buffer) {
  res.setHeader("Accept-Ranges", "bytes");
  const range = req.headers.range;
  // CPVCDN normally sends a Range header, but some BlueStacks startup paths
  // omit it while still parsing the package as a partial response.  Keep the
  // normal 200 behavior by default and expose a diagnostic compatibility mode
  // that turns an un-ranged package fetch into a complete 206 response.
  if (!range && process.env.BLUSTONE_FORCE_PACKAGE_RANGE !== "1") {
    return res.status(200).setHeader("Content-Length", body.length).send(body);
  }
  if (!range) {
    return res
      .status(206)
      .setHeader("Content-Range", `bytes 0-${body.length - 1}/${body.length}`)
      .setHeader("Content-Length", body.length)
      .send(body);
  }
  const match = /^bytes=(\d+)-(\d*)$/.exec(range);
  if (!match) return res.status(416).setHeader("Content-Range", `bytes */${body.length}`).end();
  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : body.length - 1;
  if (start >= body.length || requestedEnd < start) return res.status(416).setHeader("Content-Range", `bytes */${body.length}`).end();
  const end = Math.min(requestedEnd, body.length - 1);
  return res
    .status(206)
    .setHeader("Content-Range", `bytes ${start}-${end}/${body.length}`)
    .setHeader("Content-Length", end - start + 1)
    .send(body.subarray(start, end + 1));
}

function resourceManifest(resources: ResourcePackage[]): string {
  const totalSize = resources.reduce((total, resource) => total + resource.size, 0);
  const lines = [String(process.env.BLUSTONE_RESLIST_HEADER_STAMP ?? process.env.BLUSTONE_RESLIST_STAMP ?? "1634659"), String(resources.length), String(totalSize)];
  for (const resource of resources) {
    lines.push([resource.name, resource.stamp, resource.size, resource.step, resource.signature, resource.packageMd5].join(","));
  }
  return `${lines.join("\n")}\n`;
}

function payloadOf(req: Request, state: ServerState): Record<string, unknown> {
  if (Buffer.isBuffer(req.body)) {
    const accessToken = accessTokenOf(req);
    if (accessToken && isSecureBody(req)) {
      try {
        const decoded = decodeWirePayload(state.decryptSecureBody(accessToken, req.body));
          console.info(`secure request decoded ${req.path} body_keys=${Object.keys(decoded).sort().join(",")}`);
          if (process.env.BLUSTONE_LOG_GAME_VALUES === "1") {
            // Widened deliberately. The narrow list made `/reference/GetMonster`
            // log as `{}`, because the id the client asks for is not in it - so
            // the exact key CSRGameMob::GetMonsterData misses on was invisible and
            // the 5x SetRefID assertions had no observable id behind them.
            // Read the field list from the *response* side too; the replica
            // answers with its own ids, so what it publishes can be diffed
            // against what the client requested.
            const fields = new Set([
              "stage_id", "area_id", "type", "step", "level", "rank", "ref_id", "inst_id",
              "deck_type", "qty", "slot",
              // Native training/lock identities; credentials remain excluded.
              "target_inst_id", "source_inst_list", "is_tuto",
              // Search attempt/helper identities and wave-cache flag; never OTP.
              "owner", "friend_pvid", "friend_leader_id", "vfid", "wave_info", "log_id", "cleared_wave",
              "deck_info",
              "play_info", // game result counters, not account credentials
              "id", "_id", "char_id", "name", "res_prefix", "monster_id", "target_id",
              // [RECOVERED] the expedition-map chest claim's identity field:
              // `to_string(GetRewards()[index].achieve_cnt)`
              // (CSRSyncMStage::RequestReward 0xb3bf4c). Without it in this
              // list the one request that decides whether a chest opens was
              // invisible here - the same mistake the narrow list made for
              // GetMonster's `list` (analysis/research/chest-rewards.md Q4).
              "target_achieve_cnt", "achieve_cnt",
              "pvid", "target_pvid", "sender_pvid", "receiver_pvid", "rival_pvid",
              "cnt", "value", "order", "group", "wave", "max_wave", "list",
              "deck_inst_id_1", "deck_inst_id_2", "deck_inst_id_3", "deck_inst_id_4",
            ]);
            const values = Object.fromEntries(Object.entries(decoded).filter(([key]) => fields.has(key)));
            console.info(`game-values ${req.path} ${JSON.stringify(values)}`);
          }
        return decoded;
      } catch (error) {
        console.warn(`secure request decode failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return { _rawLength: req.body.length, _rawBase64: req.body.toString("base64") };
  }
  if (req.body && typeof req.body === "object") return req.body as Record<string, unknown>;
  return {};
}

function accessTokenOf(req: Request): string {
  const value = req.headers["pv-accesstoken"];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function isSecureBody(req: Request): boolean {
  return Buffer.isBuffer(req.body) && String(req.headers["content-type"] ?? "").toLowerCase().startsWith("application/octet-stream");
}

function decodeWirePayload(body: Buffer): Record<string, unknown> {
  const text = body.toString("utf8").replace(/\0+$/g, "");
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch {
    // The native request transformer normally emits URL-encoded form data.
  }
  return Object.fromEntries(new URLSearchParams(text).entries());
}

function stateCall(
  req: Request,
  res: Response,
  state: ServerState,
  work: () => Record<string, unknown>,
) {
  try {
    return sendResponse(req, res, state, work());
  } catch (error) {
    if (error instanceof NativeAuthError) return sendResponse(req, res, state, state.failure(error.code, error.message));
    throw error;
  }
}

function sendResponse(req: Request, res: Response, state: ServerState, payload: Record<string, unknown>) {
  // The native response decryptor treats non-success result_code responses as
  // plaintext JSON. This is how Login/RegisterGuest failures are delivered by
  // the original service even when the request itself was encrypted.
  if (Number(payload.result_code ?? 1) !== 1) return res.status(200).type("application/json").json(payload);
  const accessToken = accessTokenOf(req);
  if (accessToken && isSecureBody(req)) {
    try {
      const secure = state.encryptSecureBody(accessToken, Buffer.from(JSON.stringify(payload), "utf8"));
      // Dump the plaintext for the routes whose response shape is still being
      // reconstructed. The tester agent asked for this twice: the byte count
      // alone cannot show WHAT we answered, and when a native parser rejects a
      // response the only way to find out is to read it.
      if (process.env.BLUSTONE_DUMP_RESPONSES === "1" ||
          (process.env.BLUSTONE_DUMP_CARD_REFERENCE === "1" && req.path === "/reference/GetCard") ||
          /GetMonster|GetTargetStageMonster|mission\/(Start|Complete)/.test(req.path)) {
        console.info(`secure response-body ${req.path} ${JSON.stringify(payload)}`);
      }
      console.info(`secure response ${req.path} plaintext_bytes=${Buffer.byteLength(JSON.stringify(payload), "utf8")} ciphertext_bytes=${secure.body.length}`);
      return res
        .status(200)
        .setHeader("Content-Type", "application/octet-stream")
        .setHeader("PV-AccessToken", accessToken)
        .setHeader("PV-Signature", secure.signature)
        .send(secure.body);
    } catch (error) {
      return res.status(401).json({ error: error instanceof Error ? error.message : "secure response failed" });
    }
  }
  return res.json(payload);
}

function headersOf(req: Request): Record<string, string> {
  return Object.fromEntries(Object.entries(req.headers).map(([key, value]) => [key.toLowerCase(), Array.isArray(value) ? value[0] : value ?? ""]));
}

export function startServer(port = Number(process.env.BLUSTONE_PORT ?? 8080), host = process.env.BLUSTONE_BIND_HOST ?? "127.0.0.1") {
  const config = readConfig({ ...process.env, BLUSTONE_PORT: String(port), BLUSTONE_BIND_HOST: host });
  const context = createApp({ baseUrl: config.baseUrl, catalogPath: config.catalogPath, stateFile: config.stateFile });
  const server = context.app.listen(config.port, config.host, () => {
    console.info(`Blustone TypeScript server listening on ${config.host}:${config.port}`);
    console.info(`Swagger UI: http://${config.host}:${config.port}/docs`);
    console.info(`Recovered route catalog: ${context.endpoints.length} routes`);
  });
  const guildChat=context.state.guildChatEnabled()?attachGuildChat(server,context.state):undefined;

  // Connection-level diagnostics.
  //
  // The request log only shows requests that actually arrived as HTTP. The
  // native client drives libcurl from its main thread and is currently parked
  // in an epoll wait, which means it believes a transfer is outstanding. If it
  // had opened a socket to this server and stalled before/without speaking
  // HTTP - a WebSocket upgrade, a raw connect, a TLS handshake attempt - there
  // would be no request line to log and the stall would look like "the client
  // just stopped". Track every socket so that case is visible: bytes received
  // and whether the peer ever sent a request line.
  //
  // Set BLUSTONE_TRACE_CONNECTIONS=1 to enable (it is noisy by design).
  const traceConnections = process.env.BLUSTONE_TRACE_CONNECTIONS === "1";
  if (traceConnections) {
    const open = new Map<number, { peer: string; bytes: number; at: number; spoke: boolean }>();
    const bySocket = new WeakMap<import("node:net").Socket, number>();
    let nextId = 0;
    // Mark on the server's own request event: a raw 'connection' socket does
    // not reliably emit 'request', so listening there reports a normal
    // keep-alive connection as if it had never spoken HTTP.
    server.on("request", (req) => {
      const id = bySocket.get(req.socket);
      const entry = id === undefined ? undefined : open.get(id);
      if (entry) entry.spoke = true;
    });
    server.on("connection", (socket: import("node:net").Socket) => {
      const id = nextId++;
      const entry = { peer: `${socket.remoteAddress}:${socket.remotePort}`, bytes: 0, at: Date.now(), spoke: false };
      open.set(id, entry);
      bySocket.set(socket, id);
      socket.on("data", (chunk: Buffer) => { entry.bytes += chunk.length; });
      socket.on("close", () => {
        open.delete(id);
        const held = Date.now() - entry.at;
        if (!entry.spoke) {
          console.info(`connection ${id} ${entry.peer} closed after ${held}ms with ${entry.bytes} bytes and NO HTTP request (stalled or non-HTTP client)`);
        } else if (held > 2000) {
          console.info(`connection ${id} ${entry.peer} held ${held}ms for ${entry.bytes} bytes`);
        }
      });
    });
    setInterval(() => {
      const now = Date.now();
      for (const [id, entry] of open) {
        if (now - entry.at > 5000) {
          console.info(`connection ${id} ${entry.peer} open ${now - entry.at}ms, ${entry.bytes} bytes, http_requests=${entry.spoke}`);
        }
      }
    }, 5000).unref();
  }

  // A replica should behave like a long-lived server rather than dropping
  // keep-alive connections under the client, because the native HTTP layer
  // reuses connections and a premature close can leave a transfer outstanding.
  const keepAlive = Number(process.env.BLUSTONE_KEEPALIVE_MS ?? 120000);
  server.keepAliveTimeout = Number.isFinite(keepAlive) ? keepAlive : 120000;
  server.headersTimeout = Number(process.env.BLUSTONE_HEADERS_MS ?? 125000);
  server.requestTimeout = 0;

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    guildChat?.close();
    console.info(`Received ${signal}; draining HTTP server`);
    server.close((error) => {
      if (error) {
        console.error(`HTTP shutdown failed: ${error.message}`);
        process.exitCode = 1;
      }
    });
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  return server;
}

if (process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js")) {
  startServer();
}
