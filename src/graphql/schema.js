// src/graphql/schema.js

import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLBoolean, GraphQLInt, GraphQLNonNull } from "graphql";
import { Usuario } from "../models/Usuario.js";

import {
  // Usuarios
  altaUsuario,
  listarUsuarios,
  buscarUsuarioPorEmail,
  buscarUsuarioPorId,
  modificarUsuario,
  borrarUsuario,
  // Voluntariados
  altaVoluntariado,
  listarVoluntariados,
  modificarVoluntariado,
  borrarVoluntariado,
  loginUsuario,
  voluntariadosPorUsuario,
  // Categorias
  getCategorias,
  // Seleccionados
  guardarSeleccionado,
  listarSeleccionados,
  seleccionadosPorUsuario,
  borrarSeleccionado,
} from "../services/almacenajeService.js";

/* =========================
 * Helpers: sesión y roles
 * ========================= */
function sanitizeUser(u) {
  if (!u) return null;
  // eslint-disable-next-line no-unused-vars
  const { password, ...safe } = u;
  return safe;
}

function requireAuth(ctx) {
  const user = ctx?.req?.session?.user;
  if (!user) throw new Error("No autenticado");
  return user;
}

function requireAdmin(ctx) {
  const user = requireAuth(ctx);
  if (user.rol !== "admin") throw new Error("No autorizado (solo admin)");
  return user;
}

async function withCreadorNombre(vols) {
  const ids = [...new Set((vols || []).map((v) => v.id_usuario).filter((v) => v != null))];

  if (ids.length === 0) return (vols || []).map((v) => ({ ...v, creadorNombre: "Anónimo" }));

  const users = await Usuario.find({ id: { $in: ids } }, { id: 1, nombre: 1 }).lean();
  const map = new Map(users.map((u) => [u.id, u.nombre]));

  return (vols || []).map((v) => ({
    ...v,
    creadorNombre: map.get(v.id_usuario) || "Anónimo",
  }));
}

/* =====================================
 *  TYPES
 * ===================================== */

/**
 * Type GraphQL que representa a un usuario del sistema.
 * Equivale al modelo `Usuario` del backend.
 */
const UsuarioType = new GraphQLObjectType({
  name: "Usuario",
  fields: {
    id: { type: GraphQLInt },
    nombre: { type: GraphQLString },
    email: { type: GraphQLString },
    rol: { type: GraphQLString },
  },
});

/**
 * Type GraphQL que representa un voluntariado.
 * Equivale al modelo `Voluntariado` del backend.
 */
const VoluntariadoType = new GraphQLObjectType({
  name: "Voluntariado",
  fields: {
    id: { type: GraphQLInt },
    type: { type: GraphQLString },
    titulo: { type: GraphQLString },
    id_usuario: { type: GraphQLInt },
    modalidad: { type: GraphQLString },
    categoria: { type: GraphQLString },
    resumen: { type: GraphQLString },
    fecha: { type: GraphQLString },
    creadorNombre: { type: GraphQLString },
  },
});

/**
 * Type GraphQL que representa la relación de selección
 * entre un usuario y un voluntariado.
 */
const SeleccionadoType = new GraphQLObjectType({
  name: "Seleccionado",
  fields: {
    id: { type: GraphQLInt }, // id de la selección
    id_usuario: { type: GraphQLInt }, // id del usuario que selecciona
    id_voluntariado: { type: GraphQLInt }, // id del voluntariado seleccionado
  },
});

/* =====================================
 *  ROOT QUERY
 * ===================================== */

/**
 * Root Query de la API GraphQL.
 * Define todas las operaciones de lectura.
 */
const RootQuery = new GraphQLObjectType({
  name: "Query",
  fields: {
    // --- SESIÓN ----
    me: {
      type: UsuarioType,
      resolve: (_parent, _args, ctx) => {
        const user = ctx?.req?.session?.user;
        return user ? sanitizeUser(user) : null;
      },
    },
    // ----- USUARIOS (solo admin) -----
    usuarios: {
      type: new GraphQLList(UsuarioType),
      resolve: async (_parent, _args, ctx) => {
        requireAdmin(ctx);
        const users = await listarUsuarios();
        return users.map(sanitizeUser);
      },
    },

    usuarioPorEmail: {
      type: UsuarioType,
      args: { email: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: async (_parent, { email }, ctx) => {
        requireAdmin(ctx);
        return sanitizeUser(await buscarUsuarioPorEmail(email));
      },
    },

    usuarioPorId: {
      type: UsuarioType,
      args: { id: { type: new GraphQLNonNull(GraphQLInt) } },
      resolve: async (_parent, { id }, ctx) => {
        requireAdmin(ctx);
        return sanitizeUser(await buscarUsuarioPorId(id));
      },
    },

    // ----- VOLUNTARIADOS (admin: todos | user: solo los suyos) -----
    voluntariados: {
      type: new GraphQLList(VoluntariadoType),
      resolve: async (_parent, _args, ctx) => {
        const u = requireAuth(ctx);
        if (u.rol === "admin") {
          return await listarVoluntariados();
        }
        return await voluntariadosPorUsuario(u.id);
      },
    },

    voluntariadosFeed: {
      type: new GraphQLList(VoluntariadoType),
      resolve: async (_parent, _args, ctx) => {
        requireAuth(ctx); // si quieres permitir sin login, quita esto
        const vols = await listarVoluntariados(); // TODOS
        return await withCreadorNombre(vols);
      },
    },

    voluntariadosPorUsuario: {
      type: new GraphQLList(VoluntariadoType),
      args: { id_usuario: { type: new GraphQLNonNull(GraphQLInt) } },
      resolve: async (_parent, { id_usuario }, ctx) => {
        const u = requireAuth(ctx);
        if (u.rol === "admin") {
          return await voluntariadosPorUsuario(id_usuario);
        }
        if (u.id !== id_usuario) throw new Error("No autorizado");
        return await voluntariadosPorUsuario(id_usuario);
      },
    },

    // ----- CATEGORÍAS (cualquiera autenticado) -----
    categorias: {
      type: new GraphQLList(GraphQLString),
      resolve: async (_parent, _args, ctx) => {
        requireAuth(ctx);
        return await getCategorias();
      },
    },

    // ----- SELECIONADOS -----
    // Admin puede ver todas las selecciones
    seleccionados: {
      type: new GraphQLList(SeleccionadoType),
      resolve: async (_p, _a, ctx) => {
        requireAdmin(ctx);
        return await listarSeleccionados();
      },
    },

    // Admin puede pedir cualquier usuario; user solo las suyas
    seleccionadosPorUsuario: {
      type: new GraphQLList(SeleccionadoType),
      args: {
        id_usuario: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: async (_p, { id_usuario }, ctx) => {
        const u = requireAuth(ctx);
        if (u.rol === "admin") return await seleccionadosPorUsuario(id_usuario);
        if (u.id !== id_usuario) throw new Error("No autorizado");
        return await seleccionadosPorUsuario(id_usuario);
      },
    },
  },
});

/* =====================================
 *  ROOT MUTATION
 * ===================================== */

/**
 * Root Mutation de la API GraphQL.
 * Define todas las operaciones de escritura (alta, modificación, borrado).
 */
const RootMutation = new GraphQLObjectType({
  name: "Mutation",
  fields: {
    // ----- LOGIN / LOGOUT ----
    login: {
      type: UsuarioType,
      args: {
        email: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_parent, { email, password }, ctx) => {
        const usuario = await loginUsuario(email, password);
        if (!usuario) throw new Error("Email o contraseña incorrectos");

        ctx.req.session.user = {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
        };

        return sanitizeUser(usuario);
      },
    },

    logout: {
      type: GraphQLBoolean,
      resolve: async (_parent, _args, ctx) => {
        const sess = ctx.req.session;
        if (!sess) return true;

        return await new Promise((resolve) => {
          sess.destroy(() => resolve(true));
        });
      },
    },

    // ----- USUARIOS (solo admin) -----
    crearUsuario: {
      type: UsuarioType,
      args: {
        nombre: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
        rol: { type: GraphQLString }, // opcional; default "user" en modelo
      },
      resolve: async (_parent, args, ctx) => {
        requireAdmin(ctx);
        return sanitizeUser(await altaUsuario(args));
      },
    },

    modificarUsuario: {
      type: GraphQLBoolean,
      args: {
        emailOriginal: { type: new GraphQLNonNull(GraphQLString) },
        nombre: { type: GraphQLString },
        email: { type: GraphQLString },
        password: { type: GraphQLString },
        rol: { type: GraphQLString },
      },
      resolve: async (_parent, { emailOriginal, ...usuarioActualizado }, ctx) => {
        requireAdmin(ctx);
        return await modificarUsuario(emailOriginal, usuarioActualizado);
      },
    },

    borrarUsuario: {
      type: GraphQLBoolean,
      args: { email: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: async (_parent, { email }, ctx) => {
        requireAdmin(ctx);
        return await borrarUsuario(email);
      },
    },

    // --- VOLUNTARIADOS ---
    // admin: puede crear para cualquier id_usuario
    // user: solo puede crear/modificar/borrar los suyos
    crearVoluntariado: {
      type: VoluntariadoType,
      args: {
        type: { type: new GraphQLNonNull(GraphQLString) },
        id_usuario: { type: new GraphQLNonNull(GraphQLInt) },
        titulo: { type: new GraphQLNonNull(GraphQLString) },
        categoria: { type: new GraphQLNonNull(GraphQLString) },
        modalidad: { type: new GraphQLNonNull(GraphQLString) },
        resumen: { type: new GraphQLNonNull(GraphQLString) },
        fecha: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_parent, args, ctx) => {
        const u = requireAuth(ctx);
        if (u.rol !== "admin" && u.id !== args.id_usuario) {
          throw new Error("No autorizado");
        }
        return await altaVoluntariado(args);
      },
    },

    modificarVoluntariado: {
      type: GraphQLBoolean,
      args: {
        id: { type: new GraphQLNonNull(GraphQLInt) },
        type: { type: GraphQLString },
        id_usuario: { type: GraphQLInt }, // opcional, pero controlamos abajo
        titulo: { type: GraphQLString },
        categoria: { type: GraphQLString },
        modalidad: { type: GraphQLString },
        resumen: { type: GraphQLString },
        fecha: { type: GraphQLString },
      },
      resolve: async (_parent, { id, ...actualizado }, ctx) => {
        const u = requireAuth(ctx);

        // Si NO es admin, NO se permite cambiar el id_usuario (propietario)
        if (u.rol !== "admin" && actualizado.id_usuario && actualizado.id_usuario !== u.id) {
          throw new Error("No autorizado");
        }

        // Si NO es admin, solo puede modificar voluntariados cuyo id_usuario sea el suyo.
        if (u.rol !== "admin") {
          const mis = await voluntariadosPorUsuario(u.id);
          const esMio = mis.some((v) => v.id === id);
          if (!esMio) throw new Error("No autorizado");
        }

        return await modificarVoluntariado(id, actualizado);
      },
    },

    borrarVoluntariado: {
      type: GraphQLBoolean,
      args: { id: { type: new GraphQLNonNull(GraphQLInt) } },
      resolve: async (_parent, { id }, ctx) => {
        const u = requireAuth(ctx);

        if (u.rol !== "admin") {
          const mis = await voluntariadosPorUsuario(u.id);
          const esMio = mis.some((v) => v.id === id);
          if (!esMio) throw new Error("No autorizado");
        }

        return await borrarVoluntariado(id);
      },
    },

    // --- SELECCIONADOS ---
    guardarSeleccionado: {
      type: SeleccionadoType,
      args: {
        id_voluntariado: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: async (_p, { id_voluntariado }, ctx) => {
        const u = requireAuth(ctx);
        // u.id es el id del usuario logueado
        return await guardarSeleccionado(u.id, id_voluntariado);
      },
    },

    // Admin puede borrar cualquier selección por id
    // User solo puede borrar selecciones que sean suyas (verificación extra)
    borrarSeleccionado: {
      type: GraphQLBoolean,
      args: { id: { type: new GraphQLNonNull(GraphQLInt) } },
      resolve: async (_p, { id }, ctx) => {
        const u = requireAuth(ctx);

        if (u.rol !== "admin") {
          // Verificamos que esa selección pertenece al user
          const mias = await seleccionadosPorUsuario(u.id);
          const esMia = mias.some((s) => s.id === id);
          if (!esMia) throw new Error("No autorizado");
        }

        return await borrarSeleccionado(id);
      },
    },
  },
});

/* =====================================
 *  EXPORT SCHEMA
 * ===================================== */

/**
 * Esquema principal de GraphQL que combina Query y Mutation.
 */
export const schema = new GraphQLSchema({
  query: RootQuery,
  mutation: RootMutation,
});
