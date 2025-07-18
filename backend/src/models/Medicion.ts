import mongoose, { Document, Schema } from "mongoose";

export interface IMedicion extends Document {
  voltaje: number;
  corriente: number;
  temperatura: number;
  bateria: number;
  timestamp: Date;
  potencia: number;
}

const MedicionSchema = new Schema<IMedicion>({
  voltaje: Number,
  corriente: Number,
  temperatura: Number,
  bateria: Number,
  potencia: Number,
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model<IMedicion>(
  "Medicion",
  MedicionSchema,
  "mediciones"
);
