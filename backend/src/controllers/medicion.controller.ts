import { Request, Response } from "express";
import Medicion from "../models/Medicion";
import { broadcast } from "../services/websocket.service";

export const crearMedicion = async (req: Request, res: Response) => {
  console.log(req.body);
  const { voltaje, corriente, temperatura, bateria } = req.body;
  try {
    const nueva = await Medicion.create({
      voltaje,
      corriente,
      temperatura,
      bateria,
    });
    broadcast(nueva);
    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB Error" });
  }
};

export const obtenerMediciones = async (_req: Request, res: Response) => {
  const datos = await Medicion.find().sort({ timestamp: -1 }).limit(50);
  res.json(datos);
};
