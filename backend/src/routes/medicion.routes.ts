import { Router } from "express";
import {
  crearMedicion,
  obtenerMediciones,
} from "../controllers/medicion.controller";
import { checkApiKey } from "../middleware/auth.middleware";

const router = Router();

router.post("/", checkApiKey, crearMedicion);
router.get("/", obtenerMediciones);

export default router;
