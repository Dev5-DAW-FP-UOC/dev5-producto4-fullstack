import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLBoolean, GraphQLNonNull } from "graphql";

import {
  altaUsuario,
  listarUsuarios,
  buscarUsuarioPorEmail,
  buscarUsuarioPorId,
  modificarUsuario,
  borrarUsuario,
  loginUsuario,
  altaVoluntariado,
  listarVoluntariados,
  modificarVoluntariado,
  borrarVoluntariado,
  voluntariadosPorUsuario,
  getCategorias,
  guardarSeleccionado,
  seleccionadosPorUsuario,
  borrarSeleccionado,
} from "../services/almacenajeService.js";

/* =====================================
 * TYPES
 * ===================================== */

const resolveId = (parent) => parent._id ? parent._id.toString() : parent.id;

const UsuarioType = new GraphQLObjectType({
  name: "Usuario",
  fields: {
    id: { type: GraphQLString, resolve: resolveId },
    nombre: { type: GraphQLString },
    email: { type: GraphQLString },
    password: { type: GraphQLString },
    rol: { type: GraphQLString },
  },
});

const VoluntariadoType = new GraphQLObjectType({
  name: "Voluntariado",
  fields: {
    id: { type: GraphQLString, resolve: resolveId },
    tipo: { type: GraphQLString },
    titulo: { type: GraphQLString },
    email: { type: GraphQLString },
    categoria: { type: GraphQLString },
    descripcion: { type: GraphQLString },
    fecha: { type: GraphQLString },
  },
});

const SeleccionadoType = new GraphQLObjectType({
  name: "Seleccionado",
  fields: {
    id: { type: GraphQLString, resolve: resolveId },
    usuario: { type: GraphQLString },
    voluntariado: { type: VoluntariadoType },
  },
});

/* =====================================
 * ROOT QUERY
 * ===================================== */

const RootQuery = new GraphQLObjectType({
  name: "Query",
  fields: {
    me: {
      type: UsuarioType,
      resolve: async (_, __, context) => {
        if (!context.req.session.userId) return null;
        return await buscarUsuarioPorId(context.req.session.userId);
      }
    },
    usuarios: {
      type: new GraphQLList(UsuarioType),
      resolve: (_, __, context) => {
        if (context.req.session.userRol !== 'admin') {
           throw new Error("⛔ Acceso denegado: Solo administradores pueden ver usuarios.");
        }
        return listarUsuarios();
      },
    },
    usuarioPorEmail: {
      type: UsuarioType,
      args: { email: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: (_, { email }) => buscarUsuarioPorEmail(email),
    },
    usuarioPorId: {
      type: UsuarioType,
      args: { id: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: (_, { id }) => buscarUsuarioPorId(id),
    },
    voluntariados: {
      type: new GraphQLList(VoluntariadoType),
      resolve: () => listarVoluntariados(),
    },
    voluntariadosPorUsuario: {
      type: new GraphQLList(VoluntariadoType),
      args: { id_usuario: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: (_, { id_usuario }) => voluntariadosPorUsuario(id_usuario),
    },
    categorias: {
      type: new GraphQLList(GraphQLString),
      resolve: () => getCategorias(),
    },
    seleccionadosPorUsuario: {
      type: new GraphQLList(SeleccionadoType),
      args: { id_usuario: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: (_, { id_usuario }) => seleccionadosPorUsuario(id_usuario),
    },
  },
});

/* =====================================
 * ROOT MUTATION
 * ===================================== */

const RootMutation = new GraphQLObjectType({
  name: "Mutation",
  fields: {
    crearUsuario: {
      type: UsuarioType,
      args: {
        nombre: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
        rol: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (_, args, context) => {
        if (context.req.session.userRol !== 'admin') {
            throw new Error("⛔ Solo administradores pueden crear usuarios.");
        }
        return altaUsuario(args);
      },
    },
    borrarUsuario: {
      type: GraphQLBoolean,
      args: { email: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: (_, { email }, context) => {
        if (context.req.session.userRol !== 'admin') {
            throw new Error("⛔ Solo administradores pueden borrar usuarios.");
        }
        return borrarUsuario(email);
      },
    },
    login: {
      type: UsuarioType,
      args: {
        email: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_, { email, password }, context) => {
        const usuario = await loginUsuario(email, password);
        if (!usuario) {
          throw new Error("Email o contraseña incorrectos");
        }
        context.req.session.userId = usuario._id.toString();
        context.req.session.userRol = usuario.rol;
        return usuario;
      },
    },
    logout: {
      type: GraphQLBoolean,
      resolve: (_, __, context) => {
        return new Promise((resolve) => {
          context.req.session.destroy(() => resolve(true));
        });
      }
    },
    crearVoluntariado: {
      type: VoluntariadoType,
      args: {
        tipo: { type: new GraphQLNonNull(GraphQLString) },
        titulo: { type: new GraphQLNonNull(GraphQLString) },
        categoria: { type: new GraphQLNonNull(GraphQLString) },
        descripcion: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        fecha: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_, args, context) => {
        if (!context.req.session.userId) throw new Error("Debes iniciar sesión");
        
        // 1. Guardar en BBDD
        const nuevoVoluntariado = await altaVoluntariado(args);

        // 2. [NUEVO] Emitir evento WebSocket a todos los clientes
        if (context.io) {
            context.io.emit('nuevo_voluntariado', nuevoVoluntariado);
            console.log("📢 [WS] Evento 'nuevo_voluntariado' emitido");
        }

        return nuevoVoluntariado;
      },
    },
    borrarVoluntariado: {
      type: GraphQLBoolean,
      args: { id: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: async (_, { id }, context) => {
        if (context.req.session.userRol !== 'admin') {
             throw new Error("⛔ Solo administradores pueden borrar voluntariados.");
        }
        
        const borrado = await borrarVoluntariado(id);

        // [NUEVO] Emitir evento de borrado
        if (borrado && context.io) {
            context.io.emit('voluntariado_borrado', id);
            console.log("📢 [WS] Evento 'voluntariado_borrado' emitido");
        }

        return borrado;
      },
    },
    crearSeleccionado: {
      type: SeleccionadoType,
      args: {
        id_usuario: { type: new GraphQLNonNull(GraphQLString) },
        id_voluntariado: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (_, args) => guardarSeleccionado(args.id_usuario, args.id_voluntariado),
    },
    borrarSeleccionado: {
      type: GraphQLBoolean,
      args: { id: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: (_, { id }) => borrarSeleccionado(id),
    },
  },
});

export const schema = new GraphQLSchema({
  query: RootQuery,
  mutation: RootMutation,
});