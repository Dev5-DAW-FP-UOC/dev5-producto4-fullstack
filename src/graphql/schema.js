// src/graphql/schema.js

import { GraphQLBoolean, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";

import {
  // Usuarios
  altaUsuario,
  listarUsuarios,
  buscarUsuarioPorEmail,
  buscarUsuarioPorId,
  modificarUsuario,
  borrarUsuario,
  loginUsuario,

  // Voluntariados
  altaVoluntariado,
  listarVoluntariados,
  modificarVoluntariado,
  borrarVoluntariado,
  voluntariadosPorUsuario,

  // Categorias
  getCategorias,

  // Seleccionados
  guardarSeleccionado,
  listarSeleccionados,
  seleccionadosPorUsuario,
  borrarSeleccionado,
  buscarSeleccionadoPorId,
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

const SeleccionadoType = new GraphQLObjectType({
  name: "Seleccionado",
  fields: {
    id: { type: GraphQLInt },
    id_usuario: { type: GraphQLInt },
    id_voluntariado: { type: GraphQLInt },
  },
});

/* =====================================
 *  ROOT QUERY
 * ===================================== */

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
        if (!isAdmin(u) && u.email !== email) throw new Error("Acceso denegado");
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
        // Dashboard: todos ven todos
        requireAuth(ctx);
        return listarVoluntariados();
      },
    },

    voluntariadosPorUsuario: {
      type: new GraphQLList(VoluntariadoType),
      args: { id_usuario: { type: new GraphQLNonNull(GraphQLInt) } },
      resolve: async (_p, { id_usuario }, ctx) => {
        const u = requireAuth(ctx);
        if (!isAdmin(u) && u.id !== id_usuario) throw new Error("Acceso denegado");
        return voluntariadosPorUsuario(id_usuario);
      },
    },

    // ----- CATEGORÍAS -----
    categorias: {
      type: new GraphQLList(GraphQLString),
      resolve: () => getCategorias(),
    },

    // ----- SELECCIONADOS -----
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
        if (!isAdmin(u) && u.id !== id_usuario) throw new Error("Acceso denegado");
        return seleccionadosPorUsuario(id_usuario);
      },
    },

    // ✅ NUEVO: selecciones globales (para bloquear voluntariados en otros dashboards)
    seleccionadosGlobal: {
      type: new GraphQLList(SeleccionadoType),
      resolve: async (_p, _a, ctx) => {
        requireAuth(ctx);
        return listarSeleccionados();
      },
    },

    // ----- SESIÓN -----
    me: {
      type: UsuarioType,
      resolve: async (_p, _a, ctx) => {
        const sUser = ctx?.req?.session?.user;
        if (!sUser) return null;
        return buscarUsuarioPorId(sUser.id);
      },
    },
  },
});

/* =====================================
 *  ROOT MUTATION
 * ===================================== */

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
        if (!isAdmin(u) && u.email !== emailOriginal) throw new Error("Acceso denegado");
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

    logout: {
      type: GraphQLBoolean,
      resolve: async (_p, _a, ctx) => {
        if (!ctx?.req?.session) return true;

        await new Promise((resolve, reject) => {
          ctx.req.session.destroy((err) => (err ? reject(err) : resolve()));
        });

        ctx.res.clearCookie("volunet.sid", {
          httpOnly: true,
          sameSite: "lax",
          secure: false,
          path: "/",
        });

        return true;
      },
    },

    // ----- VOLUNTARIADOS -----
    crearVoluntariado: {
      type: VoluntariadoType,
      args: {
        type: { type: new GraphQLNonNull(GraphQLString) },
        titulo: { type: new GraphQLNonNull(GraphQLString) },
        id_usuario: { type: new GraphQLNonNull(GraphQLInt) },
        modalidad: { type: GraphQLString },
        categoria: { type: new GraphQLNonNull(GraphQLString) },
        resumen: { type: new GraphQLNonNull(GraphQLString) },
        fecha: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_p, args, ctx) => {
        const u = requireAuth(ctx);

        const created = await altaVoluntariado({
          ...args,
          modalidad: args.modalidad || "Presencial",
          id_usuario: u.id,
        });

        ctx.io?.emit("voluntariado:changed", { action: "created", id: created.id, byUserId: u.id });
        return created;
      },
    },

    modificarVoluntariado: {
      type: GraphQLBoolean,
      args: {
        id: { type: new GraphQLNonNull(GraphQLInt) },
        type: { type: GraphQLString },
        titulo: { type: GraphQLString },
        id_usuario: { type: GraphQLInt },
        categoria: { type: GraphQLString },
        resumen: { type: GraphQLString },
        fecha: { type: GraphQLString },
      },
      resolve: async (_p, { id, ...datosActualizados }, ctx) => {
        const u = requireAuth(ctx);

        if (!isAdmin(u)) {
          const misVol = await voluntariadosPorUsuario(u.id);
          if (!misVol.some((v) => v.id === id)) throw new Error("Acceso denegado");
          if ("id_usuario" in datosActualizados) delete datosActualizados.id_usuario;
        }

        const ok = await modificarVoluntariado(id, datosActualizados);
        if (ok) ctx.io?.emit("voluntariado:changed", { action: "updated", id, byUserId: u.id });
        return ok;
      },
    },

    borrarVoluntariado: {
      type: GraphQLBoolean,
      args: { id: { type: new GraphQLNonNull(GraphQLInt) } },
      resolve: async (_p, { id }, ctx) => {
        const u = requireAuth(ctx);

        if (!isAdmin(u)) {
          const misVol = await voluntariadosPorUsuario(u.id);
          if (!misVol.some((v) => v.id === id)) throw new Error("Acceso denegado");
        }

        const ok = await borrarVoluntariado(id);
        if (ok) ctx.io?.emit("voluntariado:changed", { action: "deleted", id, byUserId: u.id });
        return ok;
      },
    },

    // ----- SELECCIONADOS (GLOBAL EXCLUSIVO) -----
    crearSeleccionado: {
      type: SeleccionadoType,
      args: {
        id_usuario: { type: new GraphQLNonNull(GraphQLInt) }, // compatibilidad
        id_voluntariado: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: async (_p, { id_voluntariado }, ctx) => {
        const u = requireAuth(ctx);

        const sel = await guardarSeleccionado(u.id, id_voluntariado);

        // ✅ broadcast para todos (otros usuarios/navegadores incluidos)
        ctx.io?.emit("seleccionado:changed", {
          action: "created",
          id: sel.id,
          id_usuario: sel.id_usuario,
          id_voluntariado: sel.id_voluntariado,
        });

        return sel;
      },
    },

    borrarSeleccionado: {
      type: GraphQLBoolean,
      args: { id: { type: new GraphQLNonNull(GraphQLInt) } },
      resolve: async (_p, { id }, ctx) => {
        const u = requireAuth(ctx);

        // Necesitamos el doc para emitir id_voluntariado al soltarlo
        const doc = await buscarSeleccionadoPorId(id);
        if (!doc) return false;

        if (!isAdmin(u) && doc.id_usuario !== u.id) {
          throw new Error("Acceso denegado");
        }

        const ok = await borrarSeleccionado(id);

        if (ok) {
          ctx.io?.emit("seleccionado:changed", {
            action: "deleted",
            id,
            id_usuario: doc.id_usuario,
            id_voluntariado: doc.id_voluntariado,
          });
        }

        return ok;
      },
    },
  },
});

export const schema = new GraphQLSchema({
  query: RootQuery,
  mutation: RootMutation,
});
