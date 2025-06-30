import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAppDispatch } from "../store";
import { clearToken } from "../store/authSlice";
import { useQuery } from "@tanstack/react-query";
import { io } from "socket.io-client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/axios";

interface Medicion {
  temperatura: number;
  voltaje: number;
  corriente: number;
  bateria?: number;
  timestamp: string;
}

export default function PanelPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [liveData, setLiveData] = useState<Medicion[]>([]);

  const logout = () => {
    dispatch(clearToken());
    localStorage.removeItem("token");
    navigate({ to: "/login" });
  };

  const { data: fetchedMediciones, isLoading } = useQuery({
    queryKey: ["mediciones"],
    queryFn: async () => {
      const res = await api.get<Medicion[]>("/mediciones");
      return res.data;
    },
  });

  // Socket.IO para datos en tiempo real
  useEffect(() => {
    const socket = io(import.meta.env.VITE_WS_URL);

    socket.on("connect", () => console.log("✅ Socket.IO conectado"));
    socket.on("disconnect", () => console.log("❌ Socket.IO desconectado"));
    socket.on("connect_error", (err) => console.error("💥 Socket error", err));

    socket.on("nueva-medicion", (nueva: Medicion) => {
      setLiveData((prev) => [nueva, ...prev].slice(0, 50));
    });

    return () => {
      socket.disconnect(); // ✅ cleanup correcto
    };
  }, []);

  const mediciones = [...(liveData ?? []), ...(fetchedMediciones ?? [])].slice(
    0,
    50
  );
  const claves = ["temperatura", "voltaje", "corriente", "bateria"] as const;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl">Panel en tiempo real</h1>
        <button
          onClick={logout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
        >
          Cerrar sesión
        </button>
      </div>

      {isLoading ? (
        <p>Cargando mediciones...</p>
      ) : (
        claves.map((clave, idx) => {
          const colores = ["#ff6363", "#36b37e", "#3f83f8", "#fbbf24"]; // amarillo para batería
          const titulos = {
            temperatura: "Temperatura (°C)",
            voltaje: "Voltaje (V)",
            corriente: "Corriente (mA)",
            bateria: "Nivel de batería (V)",
          };

          return (
            <div key={clave}>
              <h2 className="text-lg font-semibold mb-2">{titulos[clave]}</h2>
              <div className="w-full h-60 bg-white border rounded mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...mediciones].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(tick) =>
                        new Date(tick).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      }
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(label) =>
                        new Date(label).toLocaleString()
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey={clave}
                      stroke={colores[idx]}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
