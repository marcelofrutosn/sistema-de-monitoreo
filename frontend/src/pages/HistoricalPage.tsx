import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { Chart } from "react-google-charts";

interface Medicion {
  temperatura: number;
  voltaje: number;
  corriente: number;
  bateria?: number;
  timestamp: string;
}

export default function HistoricalPage() {
  const [from, setFrom] = useState(() =>
    new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
  );
  const [to, setTo] = useState(() =>
    new Date(`${new Date().toISOString().replace("Z", "")}-03:00`).toISOString()
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
  const colores = ["#ff6363", "#36b37e", "#3f83f8", "#f59e0b"];

  const formatChartData = (clave: keyof Medicion) => {
    return [
      ["Hora", titulos[clave]],
      ...(data ?? [])
        .slice()
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        .map((m) => [
          new Date(m.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          m[clave] ?? null,
        ]),
    ];
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
            value={from.slice(0, 16)}
            onChange={(e) =>
              setFrom(new Date(`${e.target.value}-03:00`).toISOString())
            }
          />
        </div>
        <div>
          <label className="block mb-1">Hasta</label>
          <input
            type="datetime-local"
            className="border p-1"
            value={to.slice(0, 16)}
            onChange={(e) =>
              setTo(new Date(`${e.target.value}-03:00`).toISOString())
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
        claves.map((clave, idx) => (
          <div key={clave} className="mb-6">
            <h2 className="text-lg font-semibold mb-2 capitalize">
              {titulos[clave]}
            </h2>
            <Chart
              chartType="LineChart"
              width="100%"
              height="300px"
              data={formatChartData(clave)}
              options={{
                colors: [colores[idx]],
                hAxis: { title: "Hora" },
                vAxis: { title: titulos[clave] },
                legend: { position: "none" },
              }}
            />
          </div>
        ))
      )}
    </div>
  );
}
