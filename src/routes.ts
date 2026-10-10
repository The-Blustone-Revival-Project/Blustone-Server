import type { Express, RequestHandler } from "express";

export type RouteMethod = "get" | "post" | "put" | "patch" | "delete";

/** One source of truth for an HTTP handler registration. */
export interface RouteDefinition {
  method: RouteMethod;
  path: string;
  handler: RequestHandler;
  name: string;
}

export function registerRoutes(app: Express, definitions: readonly RouteDefinition[]): void {
  const seen = new Set<string>();
  for (const definition of definitions) {
    const key = `${definition.method.toUpperCase()} ${definition.path}`;
    if (seen.has(key)) throw new Error(`Duplicate route definition: ${key}`);
    seen.add(key);
    app[definition.method](definition.path, definition.handler);
  }
}

export function routeSummary(definitions: readonly RouteDefinition[]): Array<Pick<RouteDefinition, "method" | "path" | "name">> {
  return definitions.map(({ method, path, name }) => ({ method, path, name }));
}
