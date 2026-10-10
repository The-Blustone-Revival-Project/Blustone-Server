# Contributing to the Blustone replica server

This project is a local compatibility implementation reconstructed from the
client. It is not an official server and must not be exposed to the public
internet. Do not commit APKs, recovered private phone archives, account state,
transport keys, or production credentials.

## Development loop

1. Copy `.env.example` to a private local environment and set paths for the
   recovered assets if needed.
2. Run `npm install`.
3. Run `npm run build`, `npm test`, and `npm run openapi:export`.
4. Start with `npm run dev` and inspect `/healthz`, `/debug/routes`, and
   `/docs/`.

The route registry is assembled in `src/server.ts` through the typed
`RouteDefinition` contract in `src/routes.ts`. Transport, logging, body
parsing, request IDs and error handling live in `src/middleware.ts`; validated
environment configuration lives in `src/config.ts`; persistent local gameplay
state is in `src/game.ts` and `src/state.ts`; recovered-game response policy is
isolated in `src/game-routes.ts`.

## Adding a recovered endpoint

Use this order:

1. Add or verify the route literal in the recovered catalog.
2. Add a named response branch in `src/game-routes.ts` or a dedicated route
   module when the handler has meaningful state transitions.
3. Record the native parser evidence in `analysis/` and mark uncertainty in
   `src/openapi.ts` with `x-evidence` and `x-runtime-confidence`.
4. Add a contract test to `tests/smoke.ts` and persistence tests when state
   changes.
5. Run the full build, tests and OpenAPI export before opening a PR.

Avoid silently turning unknown responses into plausible production data. Empty
arrays or provisional balances are acceptable only when documented as local
compatibility fixtures and covered by a test.

## Security and privacy

The local state file contains account tokens and shared transport keys. Keep it
outside version control. The recovered `private/` phone archive contains
account/cache data and must remain local. Use the emulator endpoint explicitly;
never run experiments against the physical phone unless the task specifically
requires it.
