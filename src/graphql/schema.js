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
    login(email: String!, password: String!): LoginResult
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

  type LoginResult {
    email: String
    nombre: String
    rol: String
    token: String
  }
`);

export const root = {
  voluntariados: async (_args, context) => {
    console.log('Resolver: voluntariados called');
    try {
      // Return all voluntariados (show same cards to all users)
      const user = context?.user || null;
      console.log('Context user:', user ? user.id + '/' + user.rol : 'anonymous');
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
  categorias: async (_args, context) => {
    console.log('Resolver: categorias called');
    try {
      const docs = await Categoria.find().lean();
      return docs.map(c => ({ id: c.id, nombre: c.nombre }));
    } catch (err) {
      console.error('Error in categorias resolver:', err);
      return [];
    }
  },
  usuarios: async (_args, context) => {
    console.log('Resolver: usuarios called');
    try {
      const user = context?.user || null;
      if (!user) return [];
      // Any authenticated user may list users; deletion remains restricted to admin
      const docs = await Usuario.find().lean();
      return docs;
    } catch (err) {
      console.error('Error in usuarios resolver:', err);
      return [];
    }
  },
  altaUsuario: async ({ nombre, email, password, rol }, context) => {
    console.log('Resolver: altaUsuario called');
    try {
      const user = context?.user || null;
      if (!user || user.rol !== 'admin') throw new Error('Acceso denegado');
      const last = await Usuario.findOne().sort({ id: -1 });
      const nextId = last ? last.id + 1 : 1;
      // Ensure password is hashed before saving
      const bcryptMod = await import('bcryptjs');
      const bcrypt = bcryptMod && bcryptMod.default ? bcryptMod.default : bcryptMod;
      const hashed = password ? await bcrypt.hash(String(password), 10) : '';
      const usuario = new Usuario({ id: nextId, nombre, email, password: hashed, rol });
      await usuario.save();
      return usuario;
    } catch (err) {
      console.error('Error in altaUsuario resolver:', err);
      return null;
    }
  },
  borrarUsuario: async ({ id }, context) => {
    console.log('Resolver: borrarUsuario called');
    try {
      const user = context?.user || null;
      if (!user || user.rol !== 'admin') throw new Error('Acceso denegado');
      const res = await Usuario.deleteOne({ id: Number(id) });
      return res.deletedCount === 1;
    } catch (err) {
      console.error('Error in borrarUsuario resolver:', err);
      return false;
    }
  },
  altaVoluntariado: async ({ type, titulo, resumen, modalidad, categoria, fecha, id_usuario }, context) => {
    console.log('Resolver: altaVoluntariado called');
    try {
      const user = context?.user || null;
      if (!user) throw new Error('No autenticado');
      if (user.rol !== 'admin' && user.id !== id_usuario) throw new Error('No autorizado para crear voluntariados para otro usuario');
      const last = await Voluntariado.findOne().sort({ id: -1 });
      const nextId = last ? last.id + 1 : 1;
      const voluntariado = new Voluntariado({ id: nextId, type, titulo, resumen, modalidad, categoria, fecha, id_usuario });
      await voluntariado.save();
      try {
        const req = context?.req;
        const io = req?.app?.locals?.io;
        if (io) io.emit('voluntariado:created', { id: voluntariado.id, titulo: voluntariado.titulo });
      } catch (e) {
        console.warn('Emit failed', e);
      }
      return voluntariado;
    } catch (err) {
      console.error('Error in altaVoluntariado resolver:', err);
      return null;
    }
  },
  borrarVoluntariado: async ({ id }, context) => {
    console.log('Resolver: borrarVoluntariado called');
    try {
      const user = context?.user || null;
      if (!user) throw new Error('No autenticado');
      // Only admin users may delete voluntariados
      if (user.rol !== 'admin') throw new Error('No autorizado');
      const vol = await Voluntariado.findOne({ id: Number(id) }).lean();
      if (!vol) return false;
      const res = await Voluntariado.deleteOne({ id: Number(id) });
      return res.deletedCount === 1;
    } catch (err) {
      console.error('Error in borrarVoluntariado resolver:', err);
      return false;
    }
  }
};

// Add login resolver which receives (args, context)
root.login = async ({ email, password }, context) => {
  try {
    const req = context?.req;
    const usuario = await Usuario.findOne({ email }).lean();
    if (!usuario) throw new Error('Email o contraseña incorrectos');
    const bcryptMod = await import('bcryptjs');
    const bcrypt = bcryptMod && bcryptMod.default ? bcryptMod.default : bcryptMod;
    const match = await bcrypt.compare(String(password), String(usuario.password));
    if (!match) throw new Error('Email o contraseña incorrectos');

    // set session if request available (include email)
    if (req && req.session) {
      req.session.user = { id: usuario.id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre };
      // regenerate session id to prevent fixation
      await new Promise((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
      });
    }

    const token = req && req.sessionID ? String(req.sessionID) : `token_${Date.now()}`;
    return { email: usuario.email, nombre: usuario.nombre, rol: usuario.rol, token };
  } catch (err) {
    console.error('Error in login resolver:', err);
    throw err;
  }
};
