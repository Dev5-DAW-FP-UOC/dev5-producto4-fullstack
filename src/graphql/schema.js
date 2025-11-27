// src/graphql/schema.js

import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLBoolean, GraphQLInt, GraphQLNonNull } from "graphql";

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
      resolve: () => listarUsuarios(),
    },

    usuarioPorEmail: {
      type: UsuarioType,
      args: {
        email: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (_, { email }) => buscarUsuarioPorEmail(email),
    },

    usuarioPorId: {
      type: UsuarioType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: (_, { id }) => buscarUsuarioPorId(id),
    },

    // ----- VOLUNTARIADOS -----
    voluntariados: {
      type: new GraphQLList(VoluntariadoType),
      resolve: () => listarVoluntariados(),
    },

    voluntariadosPorUsuario: {
      type: new GraphQLList(VoluntariadoType),
      args: {
        id_usuario: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: (_, { id_usuario }) => voluntariadosPorUsuario(id_usuario),
    },

    // ----- CATEGORÍAS -----
    categorias: {
      type: new GraphQLList(GraphQLString),
      resolve: () => getCategorias(),
    },

    // ----- SELECIONADOS -----
    seleccionados: {
      type: new GraphQLList(SeleccionadoType),
      resolve: () => listarSeleccionados(),
    },

    seleccionadosPorUsuario: {
      type: new GraphQLList(SeleccionadoType),
      args: {
        id_usuario: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: (_, { id_usuario }) => seleccionadosPorUsuario(id_usuario),
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
      resolve: (_, args) => altaUsuario(args),
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
      resolve: (_, { emailOriginal, ...datosActualizados }) => modificarUsuario(emailOriginal, datosActualizados),
    },

    borrarUsuario: {
      type: GraphQLBoolean,
      args: {
        email: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (_, { email }) => borrarUsuario(email),
    },

    // ----- LOGIN -----

    login: {
      type: UsuarioType,
      args: {
        email: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (_, { email, password }) => {
        const usuario = loginUsuario(email, password);
        if (!usuario) {
          throw new Error("Email o contraseña incorrectos");
        }
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
        modalidad: { type: new GraphQLNonNull(GraphQLString) },
        categoria: { type: new GraphQLNonNull(GraphQLString) },
        resumen: { type: new GraphQLNonNull(GraphQLString) },
        fecha: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (_, args) => altaVoluntariado(args),
    },

    modificarVoluntariado: {
      type: GraphQLBoolean,
      args: {
        id: { type: new GraphQLNonNull(GraphQLInt) },
        type: { type: GraphQLString },
        titulo: { type: GraphQLString },
        id_usuario: { type: GraphQLInt },
        modalidad: { type: GraphQLString },
        categoria: { type: GraphQLString },
        resumen: { type: GraphQLString },
        fecha: { type: GraphQLString },
      },
      resolve: (_, { id, ...datosActualizados }) => modificarVoluntariado(id, datosActualizados),
    },

    borrarVoluntariado: {
      type: GraphQLBoolean,
      args: {
        id: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: (_, { id }) => borrarVoluntariado(id),
    },

    // ----- SELECCIONADOS -----

    crearSeleccionado: {
      type: SeleccionadoType,
      args: {
        id_usuario: { type: new GraphQLNonNull(GraphQLInt) },
        id_voluntariado: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: (_, { id_usuario, id_voluntariado }) => guardarSeleccionado(id_usuario, id_voluntariado),
    },

    borrarSeleccionado: {
      type: GraphQLBoolean,
      args: {
        id: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: (_, { id }) => borrarSeleccionado(id),
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
