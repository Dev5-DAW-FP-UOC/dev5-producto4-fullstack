import "dotenv/config";
import express from "express";
import { createHandler } from "graphql-http/lib/use/express";
import { schema } from "./graphql/schema.js";
import { initMongoData } from "./services/almacenajeService.js";
import { sessionMiddleware } from "./auth/session.js";
import { connectMongoose } from "./db/mongoose.js";
import cors from "cors";


console.log("SERVER.JS CARGADO ✅");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.use(
  cors({
    origin: ["http://127.0.0.1:5500", "http://localhost:5500"],
    credentials: true, // necesario para cookies/sesión
  })
);

// (opcional pero recomendado) responder preflight
app.options(/.*/, cors());



app.use(sessionMiddleware());

app.get("/debug-session", (req, res) => {
  req.session.user = { id: 999, rol: "debug" };
  res.setHeader("Cache-Control", "no-store");
  res.json({
    ok: true,
    sessionID: req.sessionID,
    cookieName: req.session?.cookie?.name,
    user: req.session.user,
  });
});

app.get("/", (_req, res) => res.send("API Volunet GraphQL funcionando"));

app.all(
  "/graphql",
  createHandler({
    schema,
    context: (req, res) => ({ 
      req: req.raw,
      res: res.raw ?? res, 
    }),
  })
);

// ✅ 1) conectar primero
await connectMongoose();

// ✅ 2) luego seed
await initMongoData();

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  console.log(`Endpoint GraphQL en http://localhost:${PORT}/graphql`);
});
