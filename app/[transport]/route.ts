import { createMcpHandler } from "mcp-handler";
import { withMcpAuth } from "better-auth/plugins"; // >=1.7: requireMcpAuth from the mcp package
import { auth } from "@/lib/auth";
import { registerTools } from "@/lib/mcp/tools";

const mcpHandler = createMcpHandler(
  (server) => registerTools(server),
  { serverInfo: { name: "personal-coach", version: "1.0.0" } },
  { basePath: "", maxDuration: 60 }
);

const handler = withMcpAuth(auth, (req) => mcpHandler(req));
export { handler as GET, handler as POST, handler as DELETE };
