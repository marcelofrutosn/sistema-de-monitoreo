import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "./routes/root.route";
import { panelRoute } from "./routes/panel.route";
import { loginRoute } from "./routes/login.route";
import { notFoundRoute } from "./routes/notfound.route";

const routeTree = rootRoute.addChildren([
  panelRoute,
  loginRoute,
  notFoundRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
