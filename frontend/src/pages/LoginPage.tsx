import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useDispatch } from "react-redux";
import { setToken } from "../store/authSlice";
import { api } from "@/lib/axios";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/auth/login", { email, password }).then((res) => res.data),
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      dispatch(setToken(data.token));
      navigate({ to: "/" });
    },
  });

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <input
        className="border p-2 mb-2 w-64"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="border p-2 mb-4 w-64"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? "Ingresando..." : "Ingresar"}
      </button>
      {mutation.isError && (
        <p className="text-red-500 mt-2">Error al iniciar sesión</p>
      )}
    </div>
  );
}
