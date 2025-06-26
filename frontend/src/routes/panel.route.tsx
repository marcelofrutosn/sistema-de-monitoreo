// src/routes/panel.route.tsx
import { createRoute, redirect } from "@tanstack/react-router";
import { rootRoute } from "./root.route";
import PanelPage from "../pages/PanelPage";
import { store } from "../store";

export const panelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/", // 👈 esto hace que / sea el panel
  component: PanelPage,
  beforeLoad: async () => {
    const token = store.getState().auth.token;
    if (!token) {
      throw redirect({ to: "/login" });
    }
  },
});
