import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || "", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions);

    const db = mongoose.connection;
    const exists = await db.db
      .listCollections({ name: "mediciones" })
      .toArray();

    if (exists.length === 0) {
      await db.db.createCollection("mediciones", {
        timeseries: {
          timeField: "timestamp",
          granularity: "seconds",
        },
      });
      console.log("Time Series Collection creada: mediciones");
    }

    console.log(`MongoDB conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error("Error al conectar MongoDB:", error);
    process.exit(1);
  }
};

export default connectDB;
