import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { store } from "../store";

function NotFoundRedirector() {
  const navigate = useNavigate();
  const token = store.getState().auth.token;

  useEffect(() => {
    navigate({ to: token ? "/" : "/login", replace: true });
  }, [token, navigate]);

  return null;
}

export const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
    </>
  ),
  notFoundComponent: NotFoundRedirector, // 👈 redirect dinámico si no existe la ruta
});
