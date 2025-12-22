// src/server.js
import "dotenv/config";
import express from "express";
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createHandler } from "graphql-http/lib/use/express";
import { schema } from "./graphql/schema.js";
import { connectMongoose } from "./db/mongoose.js";
import { initMongoData } from "./services/almacenajeService.js";
import session from "express-session";
import cors from 'cors';

const app = express();
const httpServer = createServer(app); // Envolvemos express con un servidor HTTP real

// Configuración de Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5500", // Coincide con tu frontend
    credentials: true
  }
});

// Escuchamos conexiones de Socket.io
io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);
  socket.on('disconnect', () => console.log('Cliente desconectado'));
});

// Guardamos 'io' en la app para usarlo en los resolvers
app.set('io', io);

// MIDDLEWARES
app.use(cors({
  origin: 'http://localhost:5500', 
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'secreto_por_defecto',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24
  }
}));

// ENDPOINT GRAPHQL
app.all(
  "/graphql",
  createHandler({
    schema,
    context: (req) => {
      // Pasamos req para poder acceder a app.get('io') en los resolvers
      return {
        req: req.raw, 
        session: req.raw ? req.raw.session : req.session
      };
    },
  })
);

app.get("/", (_req, res) => res.send("API Volunet GraphQL + WebSockets funcionando"));

// ARRANQUE DEL SERVIDOR
const PORT = process.env.PORT || 4000;

try {
  await connectMongoose();
  await initMongoData();

  httpServer.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);
    console.log(`WebSockets habilitados en el mismo puerto`);
  });

} catch (error) {
  console.error("Error al arrancar:", error);
  process.exit(1);
}