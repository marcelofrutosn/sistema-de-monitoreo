// src/routes/login.route.tsx
import { createRoute, redirect } from "@tanstack/react-router";
import { rootRoute } from "./root.route";
import LoginPage from "../pages/LoginPage";
import { store } from "../store";

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
  beforeLoad: async () => {
    const token = store.getState().auth.token;
    if (token) {
      throw redirect({ to: "/" });
    }
  },
});
