import type { CoreTool } from "ai";
import type { z } from "zod";

/**
 * Matt here!
 *
 * I have a weird WSL setup which means I have occasional
 * trouble connecting to localhost. So, this is a me-only
 * workaround.
 */
export const getLocalhost = () => {
  return process.env.LOCALHOST_OVERRIDE || "localhost";
};

type GetZodObjectFromCoreTool<T> =
  T extends CoreTool<infer Z extends z.ZodType>
    ? z.infer<Z>
    : never;

export type GetToolExecutionMapFromTools<
  TTools extends Record<string, CoreTool<any>>,
> = {
  [K in keyof TTools]?: (
    args: GetZodObjectFromCoreTool<TTools[K]>,
  ) => Promise<any>;
};
