import { Request, Response } from "express";
import User from "../models/User";
import jwt from "jsonwebtoken";

export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email ya registrado" });

    const user = await User.create({ email, password });
    res.status(201).json({ message: "Usuario creado" });
  } catch (err) {
    res.status(500).json({ error: "Error en el servidor" });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || "secret",
      {
        expiresIn: "7d",
      }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: "Error en el servidor" });
  }
};
