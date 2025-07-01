import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "./routes/root.route";
import { panelRoute } from "./routes/panel.route";
import { loginRoute } from "./routes/login.route";
import { notFoundRoute } from "./routes/notFound.route";
import { historicalRoute } from "./routes/historical.route";

const routeTree = rootRoute.addChildren([
  panelRoute,
  loginRoute,
  historicalRoute,
  notFoundRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
