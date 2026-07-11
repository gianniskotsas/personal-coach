import { oAuthProtectedResourceMetadata } from "better-auth/plugins";
import { auth } from "@/lib/auth";

// MCP clients discover the auth server from the 401's WWW-Authenticate
// `resource_metadata` URL (which points under /api/auth). Some clients instead
// probe this root well-known path; expose it here so both discovery styles work.
export const GET = oAuthProtectedResourceMetadata(auth);
