import { buildSchema } from "graphql";
import Usuario from "../models/Usuarios.js";
import Voluntariado from "../models/Voluntariados.js";
import Categoria from "../models/Categorias.js";

export const schema = buildSchema(`
  type Usuario {
    id: ID!
    nombre: String
    email: String
    rol: String
  }

  type Voluntariado {
    id: ID!
    type: String
    titulo: String
    resumen: String
    modalidad: String
    categoria: String
    fecha: String
    autor: Usuario
    creadoPor: String
  }

  type Categoria {
    id: Int
    nombre: String
  }

  type Query {
    voluntariados: [Voluntariado]
    categorias: [Categoria]
    usuarios: [Usuario]
  }

  type Mutation {
    altaUsuario(nombre: String!, email: String!, password: String!, rol: String!): Usuario
    borrarUsuario(id: ID!): Boolean
    altaVoluntariado(
      type: String!
      titulo: String!
      resumen: String!
      modalidad: String!
      categoria: String!
      fecha: String!
      id_usuario: Int!
    ): Voluntariado
    borrarVoluntariado(id: ID!): Boolean
  }
`);

export const root = {
  voluntariados: async () => {
    console.log('Resolver: voluntariados called');
    try {
      console.log('Before Voluntariado.find');
      const docs = await Voluntariado.find().lean();
      console.log('After Voluntariado.find, docs.length:', docs.length);
      const userIds = docs.map(v => v.id_usuario).filter(Boolean);
      console.log('User IDs to fetch:', userIds);
      const usuarios = await Usuario.find({ id: { $in: userIds } }).lean();
      console.log('After Usuario.find, usuarios.length:', usuarios.length);
      const usuarioMap = {};
      usuarios.forEach(u => { usuarioMap[u.id] = u; });
      const result = docs.map(v => {
        const autor = usuarioMap[v.id_usuario] || null;
        return {
          id: v.id,
          type: v.type || "oferta",
          titulo: v.titulo,
          resumen: v.resumen,
          modalidad: v.modalidad,
          categoria: v.categoria,
          fecha: v.fecha,
          autor: autor ? { id: autor.id, nombre: autor.nombre, email: autor.email, rol: autor.rol } : null,
          creadoPor: autor ? autor.nombre : "Anónimo"
        };
      });
      console.log('Returning voluntariados result, length:', result.length);
      return result;
    } catch (err) {
      console.error('Error in voluntariados resolver:', err);
      return [];
    }
  },
  categorias: async () => {
    console.log('Resolver: categorias called');
    try {
      const docs = await Categoria.find().lean();
      return docs.map(c => ({ id: c.id, nombre: c.nombre }));
    } catch (err) {
      console.error('Error in categorias resolver:', err);
      return [];
    }
  },
  usuarios: async () => {
    console.log('Resolver: usuarios called');
    try {
      const docs = await Usuario.find().lean();
      return docs;
    } catch (err) {
      console.error('Error in usuarios resolver:', err);
      return [];
    }
  },
  altaUsuario: async ({ nombre, email, password, rol }) => {
    console.log('Resolver: altaUsuario called');
    try {
      // Find next id
      const last = await Usuario.findOne().sort({ id: -1 });
      const nextId = last ? last.id + 1 : 1;
      const usuario = new Usuario({ id: nextId, nombre, email, password, rol });
      await usuario.save();
      return usuario;
    } catch (err) {
      console.error('Error in altaUsuario resolver:', err);
      return null;
    }
  },
  borrarUsuario: async ({ id }) => {
    console.log('Resolver: borrarUsuario called');
    try {
      const res = await Usuario.deleteOne({ id: Number(id) });
      return res.deletedCount === 1;
    } catch (err) {
      console.error('Error in borrarUsuario resolver:', err);
      return false;
    }
  },
  altaVoluntariado: async ({ type, titulo, resumen, modalidad, categoria, fecha, id_usuario }) => {
    console.log('Resolver: altaVoluntariado called');
    try {
      // Find next id
      const last = await Voluntariado.findOne().sort({ id: -1 });
      const nextId = last ? last.id + 1 : 1;
      const voluntariado = new Voluntariado({
        id: nextId,
        type,
        titulo,
        resumen,
        modalidad,
        categoria,
        fecha,
        id_usuario
      });
      await voluntariado.save();
      return voluntariado;
    } catch (err) {
      console.error('Error in altaVoluntariado resolver:', err);
      return null;
    }
  },
  borrarVoluntariado: async ({ id }) => {
    console.log('Resolver: borrarVoluntariado called');
    try {
      const res = await Voluntariado.deleteOne({ id: Number(id) });
      return res.deletedCount === 1;
    } catch (err) {
      console.error('Error in borrarVoluntariado resolver:', err);
      return false;
    }
  }
};
