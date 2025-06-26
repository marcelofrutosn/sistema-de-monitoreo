import { createRoute, redirect } from "@tanstack/react-router";
import { rootRoute } from "./root.route";
import { store } from "../store";

export const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  // ⚠️ sin path: se vuelve fallback por defecto
  id: "*", // necesario para identificarla
  beforeLoad: () => {
    const token = store.getState().auth.token;
    console.log("op");
    return token ? redirect({ to: "/" }) : redirect({ to: "/login" });
  },
  component: () => null,
});
