import { buildSchema } from "graphql";
import Usuario from "../models/Usuarios.js";
import Voluntariado from "../models/Voluntariados.js";
import Categoria from "../models/Categorias.js";
import { altaUsuario as serviceAltaUsuario, borrarUsuario as serviceBorrarUsuario, borrarUsuarioPorId, altaVoluntariado as serviceAltaVoluntariado, borrarVoluntariado as serviceBorrarVoluntariado } from "../services/almacenajeService.js";

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
      // Devuelve autor completo
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
      // Dev: devolver siempre la lista de usuarios para facilitar la visualización
      // (en producción se debería restringir a usuarios autenticados/admin).
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
      // Use service layer to create user (handles hashing and id assignment)
      const creado = await serviceAltaUsuario({ nombre, email, password, rol });
      return creado;
    } catch (err) {
      console.error('Error in altaUsuario resolver:', err);
      return null;
    }
  },
  borrarUsuario: async ({ id }, context) => {
    console.log('Resolver: borrarUsuario called');
    try {
      // Use service layer to delete user by id
      const ok = await borrarUsuarioPorId(id);
      return ok;
    } catch (err) {
      console.error('Error in borrarUsuario resolver:', err);
      return false;
    }
  },
  altaVoluntariado: async ({ type, titulo, resumen, modalidad, categoria, fecha, id_usuario }, context) => {
    console.log('Resolver: altaVoluntariado called');
    try {
      const user = context?.user || null;
      const devAllow = process.env.ALLOW_PUBLIC_USERS === '1';
      // Allow creation if: logged-in & (admin || owner), or devAllow.
      // If no session but client provided `id_usuario`, allow creation when that user exists (dev-friendly).
      if (!devAllow) {
        if (!user) {
          // try to allow when id_usuario corresponds to an existing user (fallback for dev)
          const owner = await Usuario.findOne({ id: Number(id_usuario) }).lean();
          if (!owner) throw new Error('No autenticado');
        } else {
          if (user.rol !== 'admin' && user.id !== id_usuario) throw new Error('No autorizado para crear voluntariados para otro usuario');
        }
      }
      // Delegate to service to assign id and persist
      const creado = await serviceAltaVoluntariado({ type, titulo, resumen, modalidad, categoria, fecha, id_usuario });
      try {
        const req = context?.req;
        const io = req?.app?.locals?.io;
        if (io) io.emit('voluntariado:created', { id: creado.id, titulo: creado.titulo });
      } catch (e) {
        console.warn('Emit failed', e);
      }
      return creado;
    } catch (err) {
      console.error('Error in altaVoluntariado resolver:', err);
      return null;
    }
  },
  borrarVoluntariado: async ({ id }, context) => {
    console.log('Resolver: borrarVoluntariado called');
    try {
      const user = context?.user || null;
      const devAllow = process.env.ALLOW_PUBLIC_USERS === '1';
      // If not devAllow, require authentication; but fallback to permissive deletion
      if (!devAllow && !user) {
        console.warn('Deleting voluntariado without authenticated user (fallback dev mode)');
        const ok = await serviceBorrarVoluntariado(Number(id));
        return ok;
      }
      // Admins can delete any; owners can delete their own
      if (!devAllow && user.rol !== 'admin') {
        const vol = await Voluntariado.findOne({ id: Number(id) }).lean();
        if (!vol) return false;
        if (vol.id_usuario !== user.id) throw new Error('No autorizado');
      }
      const ok = await serviceBorrarVoluntariado(Number(id));
      return ok;
    } catch (err) {
      console.error('Error in borrarVoluntariado resolver:', err);
      return false;
    }
  }
};

// Añade el resolver de login
root.login = async ({ email, password }, context) => {
  try {
    const req = context?.req;
    const usuario = await Usuario.findOne({ email }).lean();
    if (!usuario) throw new Error('Email o contraseña incorrectos');
    const bcryptMod = await import('bcryptjs');
    const bcrypt = bcryptMod && bcryptMod.default ? bcryptMod.default : bcryptMod;
    const match = await bcrypt.compare(String(password), String(usuario.password));
    if (!match) throw new Error('Email o contraseña incorrectos');

    // establece la sesión si la solicitud está disponible (incluye email)
    if (req && req.session) {
      req.session.user = { id: usuario.id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre };
      // regenera el id de sesión para prevenir fijación
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
