// src/graphql/schema.js

import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLBoolean, GraphQLInt, GraphQLNonNull } from "graphql";
import * as service from "../services/almacenajeService.js";

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
    nombre_usuario: { type: GraphQLString },
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
      resolve: async (_p, _a, ctx) => {
        const sUser = ctx?.session?.user;
        if (sUser?.rol !== "admin") throw new Error("Acceso denegado: Se requiere rol de Admin");
        return await listarUsuarios();
      },
    },

    usuarioPorEmail: {
      type: UsuarioType,
      args: {
        email: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_, { email }, ctx) => {
        const sUser = ctx?.req?.session?.user;
        if (!sUser) throw new Error("No autenticado");

        if (sUser.rol !== "admin" && sUser.email !== email) {
          throw new Error("No tienes permiso para buscar otros emails");
        }
        return await buscarUsuarioPorEmail(email);
      },
    },

    usuarioPorId: {
      type: UsuarioType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: async (_, { id }, ctx) => {
        const sUser = ctx?.req?.session?.user;
        if (!sUser) throw new Error("No autenticado");
        
        if (sUser.rol !== "admin" && sUser.id !== id) {
          throw new Error("No tienes permiso para ver otros perfiles");
        }
        return await buscarUsuarioPorId(id);
      },
    },

    // ----- VOLUNTARIADOS -----
    voluntariados: {
      type: new GraphQLList(VoluntariadoType),
      resolve: async (_p, _a, ctx) => {
        const sUser = ctx?.session?.user;
        if (!sUser) throw new Error("No autenticado");

        /*if (sUser.rol === "admin") {
          return await listarVoluntariados(); // Devuelve todo
        } else {
          // Filtrar por el ID del usuario de la sesión
          return await voluntariadosPorUsuario(sUser.id); 
        }
      },*/
        return await listarVoluntariados();
      },
    },

    voluntariadosPorUsuario: {
      type: new GraphQLList(VoluntariadoType),
      args: {
        id_usuario: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: async (_, { id_usuario }, ctx) => {
        const sUser = ctx?.session?.user;
        if (!sUser) throw new Error("No autenticado");

        if (sUser.rol !== "admin" && sUser.id !== id_usuario) {
          throw new Error("Solo puedes ver tus propios voluntariados");
        }
        return await voluntariadosPorUsuario(id_usuario);
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
        const sUser = ctx?.session?.user;
        if (!sUser) throw new Error("No autenticado");

        return await listarSeleccionados();
      },
    },

    seleccionadosPorUsuario: {
      type: new GraphQLList(SeleccionadoType),
      args: {
        id_usuario: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: (_, { id_usuario }) => seleccionadosPorUsuario(id_usuario),
    },

    me: {
      type: UsuarioType,
      resolve: (parent, args, ctx) => {
        try {
          // 1. Verificamos si existe el objeto 'user' en la sesión
          const sUser = ctx?.session?.user;
        
          if (!sUser) {
            console.log("No hay sesión activa para el objeto 'user', devolviendo null");
            return null;
          }
        
          // 2. Devolvemos el objeto 'user' DIRECTAMENTE
          // GraphQL mapeará automáticamente sUser.id -> UsuarioType.id, etc.
          return sUser;

        } catch (error) {
          console.error("Error crítico en el resolver 'me':", error);
          throw new Error("Error interno al recuperar la sesión.");
        }
      }
    },
  }
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
      resolve: async (_, args, ctx) => {
        const sUser = ctx?.session?.user;
        if (sUser?.rol !== "admin") throw new Error("Solo los administradores pueden crear usuarios");
        return await service.altaUsuario(args);
      }
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
      resolve: async (_, args, ctx) => {
        const sUser = ctx?.session?.user;
        if (!sUser) throw new Error("No autenticado");

        if (sUser.rol !== "admin" && sUser.email !== args.emailOriginal) {
          throw new Error("No tienes permiso para modificar otros usuarios");
        }

        const { emailOriginal, ...datosNuevos } = args;

        return await service.modificarUsuario(emailOriginal, datosNuevos);
      }
    },

    borrarUsuario: {
      type: GraphQLBoolean,
      args: {
        email: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_, { email }, ctx) => {
        const sUser = ctx?.session?.user;
        if (sUser?.rol !== "admin") throw new Error("Solo los administradores pueden borrar usuarios");
        return await service.borrarUsuario(email);
      }
    },

    // ----- LOGIN -----

    login: {
      type: UsuarioType,
      args: {
        email: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) }
      },
      resolve: async (parent, { email, password }, ctx) => {
        const usuario = await service.loginUsuario(email, password);
        
        if (!usuario) {
          throw new Error("Email o contraseña incorrectos");
        }

        ctx.session.user = {
          id: usuario.id,
          rol: usuario.rol,
          nombre: usuario.nombre,
          email: usuario.email
        };

        return usuario;
      }
    },

    // ----- LOGOUT -----
    
    logout: {
      type: GraphQLBoolean,
      resolve: async (parent, args, ctx) => {
        return new Promise((resolve, reject) => {

          if (!ctx.session) {
            resolve(false);
          }
        
          // Destruimos la sesión en el servidor
          ctx.session.destroy((err) => {
            if (err) {
              console.error("Error al destruir la sesión:", err);
              reject(new Error("No se pudo cerrar la sesión"));
            }
            resolve(true);
          });
        });
      }
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
      resolve: async (_, args, ctx) => {
        const sUser = ctx?.session?.user;
        if (!sUser) throw new Error("Debes estar logueado para crear voluntariados");

        const datosNuevoVol = {
          ...args,
          id_usuario: sUser.id,
          nombre_usuario: sUser.nombre 
        };
      
        const guardado = await service.altaVoluntariado(datosNuevoVol);
        const io = ctx.req.app.get('io'); 
        if (io) {
          const rawData = guardado.toObject ? guardado.toObject() : guardado;
      
          const volParaSocket = {
            ...rawData,
            id: (rawData.id || rawData._id || guardado._id).toString()
          };
        
          io.emit('voluntariado-creado', volParaSocket);
          console.log("Evento emitido con éxito:", volParaSocket.id);
        }

    return guardado;
      }
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
      resolve: async (_, args, ctx) => {
        const sUser = ctx?.session?.user;
        if (!sUser) throw new Error("No autenticado");

        const voluntariado = await service.voluntariadosPorUsuario(args.id_usuario);

        if (sUser.rol !== "admin" && voluntariado.id_usuario !== sUser.id) {
          throw new Error("Solo puedes modificar tus propios voluntariados");
        }

        const { id, ...datosParaActualizar } = args;

        return await service.modificarVoluntariado(id, datosParaActualizar);
      }
    },

    borrarVoluntariado: {
      type: GraphQLBoolean,
      args: {
        id: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: async (_, { id }, ctx) => {
        const sUser = ctx?.session?.user;
        if (!sUser) throw new Error("No autenticado");

        let permisoConcedido = false;
      
        if (sUser.rol === "admin") {
          permisoConcedido = true;
        } else {
          const misVoluntariados = await service.voluntariadosPorUsuario(sUser.id);
          permisoConcedido = misVoluntariados.some(v => v.id === id);
        }
      
        if (!permisoConcedido) {
          throw new Error("Solo puedes borrar tus propios voluntariados o ser administrador");
        }
      
        const borradoExitoso = await service.borrarVoluntariado(id);
      
        if (borradoExitoso) {
          const io = ctx.req?.app?.get('io');
          if (io) {
            io.emit('voluntariado-eliminado', id);
            console.log(`Voluntariado ${id} eliminado globalmente y notificado`);
          }
        }
      
        return borradoExitoso;
      }
    },

    // ----- SELECCIONADOS -----

    crearSeleccionado: {
      type: SeleccionadoType,
      args: { id_voluntariado: { type: new GraphQLNonNull(GraphQLInt) } },
      resolve: async (_, { id_voluntariado }, ctx) => {
        const sUser = ctx?.session?.user;
        if (!sUser) throw new Error("No autenticado");
      
        const nuevaSeleccion = await service.guardarSeleccionado({
          id_usuario: sUser.id,
          id_voluntariado: id_voluntariado
        });
        const io = ctx.req.app.get('io'); 
    
        if (io) {
          io.emit('voluntariado-seleccionado', {
            selId: nuevaSeleccion.id,
            volId: id_voluntariado,
            userId: sUser.id
          });
          console.log(`Voluntariado ${id_voluntariado} seleccionado por ${sUser.nombre}`);
        }
      
        return nuevaSeleccion;
      }
    },

    borrarSeleccionado: {
      type: GraphQLBoolean, 
      args: { id: { type: new GraphQLNonNull(GraphQLInt) } },
      resolve: async (_, { id }, ctx) => {
        const sUser = ctx?.session?.user;
        if (!sUser) throw new Error("No autenticado");

        const seleccionado = await service.buscarSeleccionadoPorId(id);
        if (!seleccionado) throw new Error("La selección no existe");

        const volId = seleccionado.id_voluntariado;
        const ownerId = seleccionado.id_usuario; 

        const borradoExitoso = await service.borrarSeleccionado(id);

        if (borradoExitoso) {
          const io = ctx.req.app.get('io');
          if (io) {
            // USAMOS EL NOMBRE QUE ACABAMOS DE CREAR
            const voluntariado = await service.obtenerVoluntariadoPorId(volId);
          
            io.emit('voluntariado-deseleccionado', {
              selId: id,
              volId: volId,
              voluntariado: voluntariado,
              userId: ownerId // Enviamos quién lo soltó para el filtro por usuario
            });
          }
        }
        return borradoExitoso;
      }
    } 
  } 
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
