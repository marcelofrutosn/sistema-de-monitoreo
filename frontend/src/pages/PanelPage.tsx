import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAppDispatch } from "../store";
import { clearToken } from "../store/authSlice";
import { useQuery } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { api } from "@/lib/axios";
import GaugeComponent from "react-gauge-component";
import ReactApexChart from "react-apexcharts";

interface Medicion {
  temperatura: number;
  voltaje: number;
  corriente: number;
  bateria?: number;
  timestamp: string;
  potencia: number;
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

  const claves = [
    "potencia",
    "temperatura",
    "voltaje",
    "corriente",
    "bateria",
  ] as const;

  const titulos = {
    temperatura: "Temperatura (°C)",
    voltaje: "Voltaje (V)",
    corriente: "Corriente (mA)",
    bateria: "Batería (V)",
    potencia: "Potencia (W)",
  };

  const colores = ["#ef4444", "#36b37e", "#3f83f8", "#f59e0b", "#8b5cf6"];

  const buildChartData = (clave: (typeof claves)[number]) => {
    return {
      series: [
        {
          name: titulos[clave],
          data: mediciones.map((m) => {
            // Crear fecha UTC y ajustar a zona horaria local de Paraguay (UTC-3)
            const utcDate = new Date(m.timestamp);
            // Obtener offset de zona horaria local en minutos
            const timezoneOffset = utcDate.getTimezoneOffset();
            // Ajustar el timestamp para mostrar hora local
            const localTimestamp =
              utcDate.getTime() - timezoneOffset * 60 * 1000;

            return {
              x: localTimestamp,
              y: m[clave] ?? null,
            };
          }),
        },
      ],
      options: {
        chart: {
          type: "line" as const,
          height: 300,
          zoom: { enabled: true },
          toolbar: { show: true },
        },
        stroke: {
          curve: "smooth" as const,
          width: 1,
        },
        xaxis: {
          type: "datetime" as const,
          labels: { format: "HH:mm" },
        },
        yaxis: {
          labels: { formatter: (val: number) => val.toFixed(2) },
        },
        tooltip: {
          x: { format: "HH:mm:ss" },
        },
        colors: [colores[claves.indexOf(clave)]],
      },
    };
  };

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
      <div className="flex justify-between items-center">
        <div className="text-3xl font-bold">Mediciones</div>
        {(liveData[0]?.bateria || liveData[0]?.bateria === 0) &&
          (() => {
            const bateria = liveData[0].bateria || 0;

            // Calculamos el porcentaje relativo (3.2V = 0%, 4.2V = 100%)
            const porcentaje = Math.min(
              100,
              Math.max(0, ((bateria - 3.2) / (4.2 - 3.2)) * 100)
            );

            // Estado de carga
            const estado =
              bateria > 4
                ? "Midiendo parametros"
                : bateria >= 3.3 && bateria <= 4
                ? "Cargando y midiendo"
                : "Batería baja";

            return (
              <div className=" p-4">
                <h2 className="text-lg font-semibold text-center mb-4">
                  <span>{estado}</span>
                </h2>

                {/* Barra de progreso */}
                <div className="w-full bg-gray-200 rounded h-6 overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${porcentaje}%`,
                      backgroundColor:
                        porcentaje < 20
                          ? "#ef4444" // rojo
                          : porcentaje < 60
                          ? "#facc15" // amarillo
                          : "#22c55e", // verde
                    }}
                  />
                </div>

                {/* Información a la derecha */}
                <div className="flex justify-between mt-2">
                  <span>
                    {bateria.toFixed(2)} V ({porcentaje.toFixed(0)}%)
                  </span>
                </div>
              </div>
            );
          })()}
      </div>
      {isLoading ? (
        <p>Cargando mediciones...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {claves.map((clave) => {
              const chartData = buildChartData(clave);
              return (
                <div key={clave} className="flex-1 min-w-[400px] px-10">
                  <h2 className="text-lg font-semibold mb-2">
                    {titulos[clave]}
                  </h2>
                  <ReactApexChart
                    options={chartData.options}
                    series={chartData.series}
                    type="line"
                    height={300}
                  />
                </div>
              );
            })}
          </div>

          {/* Gauge para batería */}
        </>
      )}
    </div>
  );
}
