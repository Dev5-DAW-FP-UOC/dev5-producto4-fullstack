// src/server.js
import "dotenv/config"; // Carga automáticamente .env
import express from "express";
import { createHandler } from "graphql-http/lib/use/express";
import { schema } from "./graphql/schema.js";
import { initMongoData } from "./services/almacenajeService.js";
import { connectMongoose } from "./db/mongoose.js";


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

// Middleware para parsear JSON en peticiones HTTP.
app.use(express.json());

/**
 * Ruta raíz de la API. Sirve como comprobación rápida
 * de que el servidor Express está levantado.
 */
app.get("/", (_req, res) => {
  res.send("API Volunet GraphQL funcionando");
});

/**
 * Endpoint GraphQL.
 * Todas las peticiones a `/graphql` se procesan mediante `graphql-http`.
 */
app.all(
  "/graphql",
  createHandler({
    schema,
  })
);

// Conectar Mongoose al arrancar el servidor

await connectMongoose();


// Inicializamos datos en MongoDB y después arrancamos el servidor HTTP.
await initMongoData();

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  console.log(`Endpoint GraphQL en http://localhost:${PORT}/graphql`);
});
