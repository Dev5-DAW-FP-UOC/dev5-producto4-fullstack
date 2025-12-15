import session from "express-session";
import MongoStore from "connect-mongo";

export function sessionMiddleware() {
  const mongoUrl = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
  const dbName = process.env.MONGODB_DB ?? "volunet_prod4";

  return session({
    name: "volunet.sid", // nombre de cookie (opcional)
    secret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl,
      dbName,
      collectionName: "sessions",
      ttl: 60 * 60 * 24, // 1 día
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // en local sin https
      maxAge: 1000 * 60 * 60 * 24, // 1 día
    },
  });
}