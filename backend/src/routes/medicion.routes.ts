import { Router } from "express";
import {
  crearMedicion,
  obtenerMediciones,
} from "../controllers/medicion.controller";
import { checkApiKey } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/jwt.middleware";

const router = Router();

router.post("/", checkApiKey, crearMedicion);
router.get("/", requireAuth, obtenerMediciones);

export default router;
