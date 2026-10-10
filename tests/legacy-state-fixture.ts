import { ServerState as ProductionServerState } from "../src/state.js";

export * from "../src/state.js";

/** Explicit historical low-ID fixture for the existing handler and save tests.
 * Production instances use the collision-free namespace; dedicated namespace
 * tests import the production class directly and verify its migration path. */
export class ServerState extends ProductionServerState {
  constructor(baseUrl?: string, stateFile?: string) {
    super(baseUrl, stateFile, { legacyCardIds: true });
  }
}
