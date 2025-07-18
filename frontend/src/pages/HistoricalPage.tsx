import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { formatISO, startOfDay, endOfDay, parseISO, format } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";

import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  TimeScale,
  Tooltip,
  Legend,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import "chartjs-adapter-date-fns";
import { Line } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  TimeScale,
  Tooltip,
  Legend,
  zoomPlugin
);

interface Medicion {
  temperatura: number;
  voltaje: number;
  corriente: number;
  bateria?: number;
  timestamp: string;
}

export default function HistoricalPage() {
  const [from, setFrom] = useState(() =>
    formatISO(zonedTimeToUtc(startOfDay(new Date()), "America/Asuncion"))
  );
  const [to, setTo] = useState(() =>
    formatISO(zonedTimeToUtc(endOfDay(new Date()), "America/Asuncion"))
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["historical", from, to],
    queryFn: async () => {
      const res = await api.get<Medicion[]>("/mediciones", {
        params: { from, to },
      });
      return res.data;
    },
    enabled: false,
  });

  useEffect(() => {
    refetch();
  }, []);

  const claves = ["temperatura", "voltaje", "corriente", "bateria"] as const;
  const titulos = {
    temperatura: "Temperatura (°C)",
    voltaje: "Voltaje (V)",
    corriente: "Corriente (mA)",
    bateria: "Batería (V)",
  };
  const colores = ["#ef4444", "#36b37e", "#3f83f8", "#f59e0b"];

  const getChartData = (clave: keyof Medicion) => {
    const sorted = (data ?? []).sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    return {
      labels: sorted.map((m) => new Date(m.timestamp)),
      datasets: [
        {
          label: titulos[clave],
          data: sorted.map((m) => m[clave] ?? null),
          borderColor: colores[claves.indexOf(clave)],
          backgroundColor: colores[claves.indexOf(clave)],
          fill: false,
          tension: 0, // curva suave
          pointRadius: 0, // 🔥 No visible dots
        },
      ],
    };
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: "x" as const, // 👈 fix aquí
        },
        pan: {
          enabled: true,
          mode: "x" as const, // 👈 fix aquí también
        },
      },
      legend: {
        display: false,
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        type: "time" as const,
        time: {
          tooltipFormat: "dd-MM HH:mm",
        },
        title: {
          display: true,
          text: "Hora",
        },
      },
      y: {
        title: {
          display: true,
          text: "Valor",
        },
      },
    },
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Historial de Mediciones</h1>

      <div className="flex gap-4 mb-6 flex-wrap">
        <div>
          <label className="block mb-1">Desde</label>
          <input
            type="datetime-local"
            className="border p-1"
            value={format(parseISO(from), "yyyy-MM-dd'T'HH:mm")}
            onChange={(e) =>
              setFrom(
                formatISO(
                  zonedTimeToUtc(new Date(e.target.value), "America/Asuncion")
                )
              )
            }
          />
        </div>
        <div>
          <label className="block mb-1">Hasta</label>
          <input
            type="datetime-local"
            className="border p-1"
            value={format(parseISO(to), "yyyy-MM-dd'T'HH:mm")}
            onChange={(e) =>
              setTo(
                formatISO(
                  zonedTimeToUtc(new Date(e.target.value), "America/Asuncion")
                )
              )
            }
          />
        </div>
        <button
          className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700 self-end"
          onClick={() => refetch()}
        >
          Buscar
        </button>
      </div>

      {isLoading ? (
        <p>Cargando datos...</p>
      ) : (
        claves.map((clave) => (
          <div key={clave} className="mb-6">
            <h2 className="text-lg font-semibold mb-2 capitalize">
              {titulos[clave]}
            </h2>
            <div className="h-[200px] w-full">
              <Line
                data={getChartData(clave)}
                options={options}
                width={"100%"}
              />
            </div>{" "}
          </div>
        ))
      )}
    </div>
  );
}
