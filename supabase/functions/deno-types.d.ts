/**
 * Type declarations for Deno modules
 */

declare module "https://deno.land/std@0.177.0/http/server.ts" {
  export function serve(handler: (req: Request) => Promise<Response>): void;
}

declare module "https://deno.land/x/supabase@1.11.7/mod.ts" {
  export function createClient(url: string, key: string): any;
}
