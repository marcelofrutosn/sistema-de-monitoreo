import { Request, Response } from "express";
import Medicion from "../models/Medicion";
import { broadcast } from "../services/websocket.service";

export const crearMedicion = async (req: Request, res: Response) => {
  console.log(req.body);
  const { voltaje, corriente, temperatura, bateria, potencia } = req.body;
  try {
    const nueva = await Medicion.create({
      voltaje,
      corriente,
      temperatura,
      bateria,
      potencia,
    });
    broadcast(nueva);
    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB Error" });
  }
};

export const obtenerMediciones = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;

    if (from && to) {
      const desde = new Date(from as string);
      const hasta = new Date(to as string);

      if (isNaN(desde.getTime()) || isNaN(hasta.getTime())) {
        return res.status(400).json({ error: "Fechas inválidas" });
      }

      const datos = await Medicion.find({
        timestamp: { $gte: desde, $lte: hasta },
      }).sort({ timestamp: -1 }); // orden cronológico ascendente

      return res.json(datos);
    }

    // Si no se pasan parámetros, devolver las últimas 50
    const datos = await Medicion.find().sort({ timestamp: -1 }).limit(50);
    res.json(datos);
  } catch (err) {
    console.error("Error al obtener mediciones:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
