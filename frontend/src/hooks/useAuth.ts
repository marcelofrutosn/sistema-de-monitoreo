import { useAppSelector } from "../store";

export function useAuth() {
  const token = useAppSelector((state) => state.auth.token);
  return {
    token,
    isAuthenticated: !!token,
  };
}
