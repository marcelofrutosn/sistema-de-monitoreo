import { createRoute, redirect } from "@tanstack/react-router";
import { rootRoute } from "./root.route";
import { store } from "../store";
import HistoricalPage from "@/pages/HistoricalPage";

export const historicalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/historico", // 👈 esto hace que / sea el panel
  component: HistoricalPage,
  beforeLoad: async () => {
    const token = store.getState().auth.token;
    if (!token) {
      throw redirect({ to: "/login" });
    }
  },
});
