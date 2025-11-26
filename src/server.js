// src/server.js
import express from "express";
import { createHandler } from "graphql-http";
import { schema } from "graphql";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// Endpoint GraphQL
app.use(
  "/graphql",
  createHandler({
    schema,
  })
);

app.get("/", (_req, res) => {
  res.send("API Volunet GraphQL funcionando");
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  console.log(`Endpoint GraphQL en http://localhost:${PORT}/graphql`);
});
