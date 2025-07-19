import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { formatISO, startOfDay, endOfDay, parseISO, format } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";
import ReactApexChart from "react-apexcharts";

interface Medicion {
  temperatura: number;
  voltaje: number;
  corriente: number;
  bateria?: number;
  timestamp: string;
  potencia: number;
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
  const getChartData = (clave: (typeof claves)[number]) => {
    const sorted = (data ?? []).sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return {
      series: [
        {
          name: titulos[clave],
          data: sorted.map((m) => {
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
          height: 200,
          zoom: { enabled: true, type: "x", autoScaleYaxis: true },
          toolbar: { show: true },
        },
        stroke: { curve: "smooth" as const, width: 1 },
        colors: [colores[claves.indexOf(clave)]],
        xaxis: {
          type: "datetime" as const,
          labels: {
            format: "HH:mm",
          },
          title: { text: "Hora" },
        },
        yaxis: {
          title: { text: "Valor" },
          decimalsInFloat: 2,
        },
        tooltip: {
          x: { format: "HH:mm:ss" },
        },
        legend: { show: false },
      },
    };
  };

  return (
    <div className="p-4 ">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {claves.map((clave) => {
            const chart = getChartData(clave);
            return (
              <div key={clave} className="mb-6 px-10">
                <h2 className="text-lg font-semibold mb-2 capitalize">
                  {titulos[clave]}
                </h2>
                <ReactApexChart
                  options={chart.options}
                  series={chart.series}
                  type="line"
                  height={200}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
