// src/server.js
import "dotenv/config"; // Carga automáticamente .env
import express from "express";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo";
import { createHandler } from "graphql-http/lib/use/express";
import { schema } from "./graphql/schema.js";
import { connectMongoose } from "./db/mongoose.js";
import { initMongoData } from "./services/almacenajeService.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Puerto en el que escucha la API HTTP.
 * Se puede sobreescribir con la variable de entorno `PORT`.
 * @type {number|string}
 */
const app = express();

/**
 * Instancia principal de la aplicación Express.
 * @type {import("express").Express}
 */
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:8080"],
    credentials: true,
  })
);

app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URL || "mongodb://127.0.0.1:27017/volunet_prod4",
      collectionName: "sessions",
      ttl: 60 * 60 * 8, // 8h
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // en HTTPS real => true
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

app.get("/debug-session", (req, res) => {
  res.json({
    hasSession: !!req.session,
    sessionID: req.sessionID ?? null,
  });
});

// Middleware para parsear JSON en peticiones HTTP.
app.use(express.json());

app.use(express.static(path.join(__dirname, "..", "public")));

/**
 * Ruta raíz de la API. Sirve como comprobación rápida
 * de que el servidor Express está levantado.
 */
app.get("/health", (_req, res) => {
  res.send("API Volunet GraphQL funcionando");
});

/**
 * Endpoint GraphQL.
 * Todas las peticiones a `/graphql` se procesan mediante `graphql-http`.
 */
app.all("/graphql", (req, res) => {
  return createHandler({
    schema,
    context: { req, res }, // <-- aquí metes el req/res reales de Express (con req.session)
  })(req, res);
});
// app.all(
//   "/graphql",
//   createHandler({
//     schema,

//     //context: (req, res) => ({ req, res }),
//   })
// );

await connectMongoose();
// Inicializamos datos en MongoDB y después arrancamos el servidor HTTP.
await initMongoData();

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  console.log(`Endpoint GraphQL en http://localhost:${PORT}/graphql`);
});
