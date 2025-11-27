import express from "express";
import { createHandler } from "graphql-http/lib/use/express";
import { schema } from "./graphql/schema.js";
import { initMongoData } from "./services/almacenajeService.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("API Volunet GraphQL funcionando");
});

// Endpoint GraphQL: todas las peticiones (GET, POST…) a /graphql
app.all(
  "/graphql",
  createHandler({
    schema,
  })
);

await initMongoData();

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  console.log(`Endpoint GraphQL en http://localhost:${PORT}/graphql`);
});
