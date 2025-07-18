import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAppDispatch } from "../store";
import { clearToken } from "../store/authSlice";
import { useQuery } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { api } from "@/lib/axios";
import GaugeComponent from "react-gauge-component";
import Chart, {
  ArgumentAxis,
  ValueAxis,
  Series,
  ZoomAndPan,
  ScrollBar,
  Tooltip,
  Legend,
  Grid,
} from "devextreme-react/chart";

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

  useEffect(() => {
    const socket = io(import.meta.env.VITE_WS_URL);
    socket.on("connect", () => console.log("✅ Socket.IO conectado"));
    socket.on("disconnect", () => console.log("❌ Socket.IO desconectado"));
    socket.on("connect_error", (err) => console.error("💥 Socket error", err));
    socket.on("nueva-medicion", (nueva: Medicion) => {
      setLiveData((prev) => [nueva, ...prev].slice(0, 50));
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const mediciones = [...(liveData ?? []), ...(fetchedMediciones ?? [])].slice(
    0,
    100
  );

  const claves = ["temperatura", "voltaje", "corriente", "bateria"] as const;
  const titulos = {
    temperatura: "Temperatura (°C)",
    voltaje: "Voltaje (V)",
    corriente: "Corriente (mA)",
    bateria: "Batería (V)",
  };

  const colores = ["#ef4444", "#36b37e", "#3f83f8", "#f59e0b"];

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
        <>
          <div className="flex gap-4 overflow-x-auto mb-6">
            {claves.map((clave, idx) => (
              <div key={clave} className="flex-1 min-w-[400px]">
                <h2 className="text-lg font-semibold mb-2">{titulos[clave]}</h2>
                <Chart
                  dataSource={mediciones.map((m) => ({
                    hora: new Date(m.timestamp),
                    valor: m[clave] ?? null,
                  }))}
                  title={titulos[clave]}
                  id={`chart-${clave}`}
                  height={300}
                >
                  <ArgumentAxis
                    argumentType="datetime"
                    label={{ format: "shortTime" }}
                    grid={{ visible: true }}
                  />
                  <ValueAxis>
                    <Grid visible={true} />
                  </ValueAxis>

                  <Series
                    valueField="valor"
                    argumentField="hora"
                    type="spline"
                    color={colores[idx]}
                  />

                  <ZoomAndPan
                    argumentAxis="both"
                    valueAxis="none"
                    dragToZoom={true}
                    allowMouseWheel={true}
                    panKey="shift"
                  />
                  <ScrollBar visible={true} />
                  <Tooltip enabled={true} />
                  <Legend visible={false} />
                </Chart>
              </div>
            ))}
          </div>

          {/* Gauge para batería */}
          {(liveData[0]?.bateria || liveData[0]?.bateria === 0) && (
            <div className="max-w-md mx-auto">
              <h2 className="text-lg font-semibold text-center mb-4">
                Nivel de batería (V)
              </h2>
              <GaugeComponent
                type="semicircle"
                arc={{
                  width: 0.2,
                  padding: 0.005,
                  cornerRadius: 1,
                  gradient: true,
                  subArcs: [
                    {
                      limit: 20,
                      color: "#ef4444",
                    },
                    {
                      limit: 60,
                      color: "#facc15",
                    },
                    {
                      limit: 100,
                      color: "#22c55e",
                    },
                  ],
                }}
                pointer={{ type: "arrow", color: "#1f2937" }}
                labels={{
                  valueLabel: {
                    formatTextValue: () =>
                      `${liveData[0].bateria?.toFixed(2)} V`,
                  },
                  tickLabels: {
                    type: "outer",
                    ticks: [{ value: 0 }, { value: 50 }, { value: 100 }],
                  },
                }}
                value={((liveData[0].bateria - 3.0) / (4.2 - 3.0)) * 100}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
