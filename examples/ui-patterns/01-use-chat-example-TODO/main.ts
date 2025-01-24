import { runLocalDevServer } from "../../_shared/dev-server/run-local-dev-server.ts";
import { honoApp } from "./server/server.ts";

await runLocalDevServer({
  root: import.meta.dirname,
  honoApp: honoApp,
});
