// src/graphql/schema.js

import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from "graphql";

import {
  // Usuarios
  altaUsuario,
  // Voluntariados
  altaVoluntariado,
  borrarSeleccionado,
  borrarUsuario,
  borrarVoluntariado,
  buscarUsuarioPorEmail,
  buscarUsuarioPorId,
  // Categorias
  getCategorias,
  // Seleccionados
  guardarSeleccionado,
  listarSeleccionados,
  listarUsuarios,
  listarVoluntariados,
  loginUsuario,
  modificarUsuario,
  modificarVoluntariado,
  seleccionadosPorUsuario,
  voluntariadosPorUsuario,
} from "../services/almacenajeService.js";

function getSessionUser(ctx) {
  return ctx?.req?.session?.user ?? null;
}

function requireAuth(ctx) {
  const u = getSessionUser(ctx);
  if (!u) throw new Error("No autenticado");
  return u;
}

function isAdmin(u) {
  return u?.rol === "admin";
}

function requireAdmin(ctx) {
  const u = requireAuth(ctx);
  if (!isAdmin(u)) throw new Error("Acceso denegado: requiere rol admin");
  return u;
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
    password: { type: GraphQLString },
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
    nombre_usuario: { type: GraphQLString },
    modalidad: { type: GraphQLString },
    categoria: { type: GraphQLString },
    resumen: { type: GraphQLString },
    fecha: { type: GraphQLString },
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
    // ----- USUARIOS -----
    usuarios: {
      type: new GraphQLList(UsuarioType),
      resolve: (_p, _a, ctx) => {
        requireAdmin(ctx);
        return listarUsuarios();
      },
    },

    usuarioPorEmail: {
      type: UsuarioType,
      args: { email: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: async (_p, { email }, ctx) => {
        const u = requireAuth(ctx);
        if (!isAdmin(u) && u.email !== email)
          throw new Error("Acceso denegado");
        return buscarUsuarioPorEmail(email);
      },
    },

    usuarioPorId: {
      type: UsuarioType,
      args: { id: { type: new GraphQLNonNull(GraphQLInt) } },
      resolve: async (_p, { id }, ctx) => {
        const u = requireAuth(ctx);
        if (!isAdmin(u) && u.id !== id) throw new Error("Acceso denegado");
        return buscarUsuarioPorId(id);
      },
    },

    // ----- VOLUNTARIADOS -----
    voluntariados: {
      type: new GraphQLList(VoluntariadoType),
      resolve: async (_p, _a, ctx) => {
        const u = requireAuth(ctx);
        if (isAdmin(u)) return listarVoluntariados();
        return voluntariadosPorUsuario(u.id);
      },
    },

    voluntariadosPorUsuario: {
      type: new GraphQLList(VoluntariadoType),
      args: { id_usuario: { type: new GraphQLNonNull(GraphQLInt) } },
      resolve: async (_p, { id_usuario }, ctx) => {
        const u = requireAuth(ctx);
        if (!isAdmin(u) && u.id !== id_usuario)
          throw new Error("Acceso denegado");
        return voluntariadosPorUsuario(id_usuario);
      },
    },

    // ----- CATEGORÍAS -----
    categorias: {
      type: new GraphQLList(GraphQLString),
      resolve: () => getCategorias(),
    },

    // ----- SELECIONADOS -----
    seleccionados: {
      type: new GraphQLList(SeleccionadoType),
      resolve: async (_p, _a, ctx) => {
        const u = requireAuth(ctx);
        if (isAdmin(u)) return listarSeleccionados();
        return seleccionadosPorUsuario(u.id);
      },
    },

    seleccionadosPorUsuario: {
      type: new GraphQLList(SeleccionadoType),
      args: { id_usuario: { type: new GraphQLNonNull(GraphQLInt) } },
      resolve: async (_p, { id_usuario }, ctx) => {
        const u = requireAuth(ctx);
        if (!isAdmin(u) && u.id !== id_usuario)
          throw new Error("Acceso denegado");
        return seleccionadosPorUsuario(id_usuario);
      },
    },

    me: {
      type: UsuarioType,
      resolve: async (_p, _a, ctx) => {
        const sUser = ctx?.req?.session?.user;
        if (!sUser) return null;
        return buscarUsuarioPorId(sUser.id); // debe devolver 1 usuario (objeto)
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
    // ----- USUARIOS -----

    crearUsuario: {
      type: UsuarioType,
      args: {
        nombre: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
        rol: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (_p, args, ctx) => {
        requireAdmin(ctx);
        return altaUsuario(args);
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
      resolve: async (_p, { emailOriginal, ...datosActualizados }, ctx) => {
        const u = requireAuth(ctx);
        if (!isAdmin(u) && u.email !== emailOriginal)
          throw new Error("Acceso denegado");
        return modificarUsuario(emailOriginal, datosActualizados);
      },
    },

    borrarUsuario: {
      type: GraphQLBoolean,
      args: { email: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: (_p, { email }, ctx) => {
        requireAdmin(ctx);
        return borrarUsuario(email);
      },
    },

    // ----- LOGIN -----

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
        return usuario;
      },
    },

    // ----- VOLUNTARIADOS -----

    crearVoluntariado: {
      type: VoluntariadoType,
      args: {
        type: { type: new GraphQLNonNull(GraphQLString) },
        titulo: { type: new GraphQLNonNull(GraphQLString) },
        id_usuario: { type: new GraphQLNonNull(GraphQLInt) },
        modalidad: { type: GraphQLString }, // opcional
        categoria: { type: new GraphQLNonNull(GraphQLString) },
        resumen: { type: new GraphQLNonNull(GraphQLString) },
        fecha: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_p, args, ctx) => {
        const u = requireAuth(ctx);

        const created = await altaVoluntariado({
          ...args,
          modalidad: args.modalidad || "Presencial", // ✅ default válido
          id_usuario: u.id, // ✅ el dueño siempre es el logueado
        });

        ctx.io?.to("admins").emit("voluntariado:created", { byUserId: u.id });
        ctx.io
          ?.to(`user:${u.id}`)
          .emit("voluntariado:created", { byUserId: u.id });

        return created; // ✅ devuelve el creado (no crees otro)
      },
    },

    modificarVoluntariado: {
      type: GraphQLBoolean,
      args: {
        id: { type: new GraphQLNonNull(GraphQLInt) },
        type: { type: GraphQLString },
        titulo: { type: GraphQLString },
        id_usuario: { type: GraphQLInt },
        // modalidad: { type: GraphQLString },
        categoria: { type: GraphQLString },
        resumen: { type: GraphQLString },
        fecha: { type: GraphQLString },
      },
      resolve: async (_p, { id, ...datosActualizados }, ctx) => {
        const u = requireAuth(ctx);

        if (!isAdmin(u)) {
          const misVol = await voluntariadosPorUsuario(u.id);
          if (!misVol.some((v) => v.id === id))
            throw new Error("Acceso denegado");
          // extra: impedir cambiar el dueño
          if ("id_usuario" in datosActualizados)
            delete datosActualizados.id_usuario;
        }

        return modificarVoluntariado(id, datosActualizados);
      },
    },

    borrarVoluntariado: {
      type: GraphQLBoolean,
      args: { id: { type: new GraphQLNonNull(GraphQLInt) } },
      resolve: async (_p, { id }, ctx) => {
        const u = requireAuth(ctx);

        if (!isAdmin(u)) {
          const misVol = await voluntariadosPorUsuario(u.id);
          if (!misVol.some((v) => v.id === id))
            throw new Error("Acceso denegado");
        }

        return borrarVoluntariado(id);
      },
    },

    // ----- SELECCIONADOS -----

    crearSeleccionado: {
      type: SeleccionadoType,
      args: {
        id_usuario: { type: new GraphQLNonNull(GraphQLInt) },
        id_voluntariado: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: async (_p, { id_voluntariado }, ctx) => {
        const u = requireAuth(ctx);

        const sel = await guardarSeleccionado(u.id, id_voluntariado);

        // 🔔 PUB/SUB: avisar para refrescar dashboard
        ctx.io?.to("admins").emit("seleccionado:changed", { userId: u.id });
        ctx.io
          ?.to(`user:${u.id}`)
          .emit("seleccionado:changed", { userId: u.id });

        return sel;
      },
    },

    borrarSeleccionado: {
      type: GraphQLBoolean,
      args: { id: { type: new GraphQLNonNull(GraphQLInt) } },
      resolve: async (_p, { id }, ctx) => {
        const u = requireAuth(ctx);

        if (!isAdmin(u)) {
          const misSel = await seleccionadosPorUsuario(u.id);
          if (!misSel.some((s) => s.id === id)) {
            throw new Error("Acceso denegado");
          }
        }

        const ok = await borrarSeleccionado(id);

        // 🔔 PUB/SUB: avisar para refrescar dashboard
        ctx.io?.to("admins").emit("seleccionado:changed", { userId: u.id });
        ctx.io
          ?.to(`user:${u.id}`)
          .emit("seleccionado:changed", { userId: u.id });

        return ok;
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
