import { CATEGORIAS, USUARIOS_INICIALES, VOLUNTARIADOS_INICIALES } from "../data/datos.js";
import { Usuario, Voluntariado, Categoria, Seleccionado } from "../models/models.js";

/* ========================================================================== */
/* HELPERS                                                                   */
/* ========================================================================== */

// Usamos .lean() aquí también para que sea una consulta ultra rápida
async function getSiguienteId(Modelo) {
  const last = await Modelo.findOne().sort({ id: -1 }).select("id").lean();
  return last ? last.id + 1 : 1;
}

// Helper para añadir el nombre del usuario a los voluntariados (Enriquecimiento)
async function attachNombreUsuario(vols) {
  if (!Array.isArray(vols) || vols.length === 0) return [];
  const users = await Usuario.find({}, "id nombre").lean();
  const map = new Map(users.map(u => [u.id, u.nombre]));

  return vols.map(v => ({
    ...v,
    nombre_usuario: map.get(v.id_usuario) || "Desconocido",
  }));
}

/* ========================================================================== */
/* INICIALIZACIÓN (SEED)                                                     */
/* ========================================================================== */

export async function initMongoData() {
  if ((await Usuario.countDocuments()) === 0) {
    await Usuario.insertMany(USUARIOS_INICIALES);
    console.log("[Mongoose] Usuarios iniciales insertados");
  }

  if ((await Voluntariado.countDocuments()) === 0) {
    await Voluntariado.insertMany(VOLUNTARIADOS_INICIALES);
    console.log("[Mongoose] Voluntariados iniciales insertados");
  }

  if ((await Categoria.countDocuments()) === 0) {
    const cats = CATEGORIAS.filter((c) => c !== "Todas").map((nombre, idx) => ({
      id: idx + 1,
      nombre,
    }));
    await Categoria.insertMany(cats);
    console.log("[Mongoose] Categorías iniciales insertadas");
  }
}

/* ========================================================================== */
/* USUARIOS - CRUD + LOGIN                                                   */
/* ========================================================================== */

export async function altaUsuario(datos) {
  const existe = await Usuario.findOne({ email: datos.email }).lean();
  if (existe) throw new Error("El email ya existe.");

  const nuevoId = await getSiguienteId(Usuario);
  const usuario = await Usuario.create({ ...datos, id: nuevoId });
  return usuario.toObject(); // .create devuelve un documento, lo pasamos a objeto plano
}

export async function listarUsuarios() {
  return await Usuario.find().lean();
}

export async function buscarUsuarioPorId(id) {
  return await Usuario.findOne({ id }).lean();
}

export async function buscarUsuarioPorEmail(email) {
  return await Usuario.findOne({ email }).lean();
}

export async function modificarUsuario(emailOriginal, usuarioActualizado) {
  if (usuarioActualizado.email && usuarioActualizado.email !== emailOriginal) {
    const existe = await Usuario.findOne({ email: usuarioActualizado.email }).lean();
    if (existe) throw new Error("El nuevo email ya está en uso");
  }

  const usuarioModificado = await Usuario.findOneAndUpdate(
    { email: emailOriginal },
    { $set: usuarioActualizado },
    { new: true }
  ).lean();

  return !!usuarioModificado;
}

export async function borrarUsuario(email) {
  const res = await Usuario.deleteOne({ email });
  return res.deletedCount === 1;
}

export async function loginUsuario(email, password) {
  return await Usuario.findOne({ email, password }).lean();
}

/* ========================================================================== */
/* VOLUNTARIADOS - CRUD + CONSULTAS                                          */
/* ========================================================================== */

export async function listarVoluntariados() {
  const vols = await Voluntariado.find().lean();
  return attachNombreUsuario(vols);
}

export async function altaVoluntariado(datos) {
  const nuevoId = await getSiguienteId(Voluntariado);
  const nuevo = await Voluntariado.create({ ...datos, id: nuevoId });
  return nuevo.toObject();
}

export async function modificarVoluntariado(id, voluntariadoActualizado) {
  const res = await Voluntariado.updateOne({ id }, { $set: voluntariadoActualizado });
  return res.matchedCount === 1;
}

export async function borrarVoluntariado(id) {
  const res = await Voluntariado.deleteOne({ id });
  return res.deletedCount === 1;
}

export async function voluntariadosPorUsuario(id_usuario) {
  const vols = await Voluntariado.find({ id_usuario }).lean();
  return attachNombreUsuario(vols);
}

export async function obtenerVoluntariadoPorId(id) {
  return await Voluntariado.findOne({ id: Number(id) }).lean();
}

/* ========================================================================== */
/* CATEGORÍAS                                                                */
/* ========================================================================== */

export async function getCategorias() {
  const docs = await Categoria.find().sort({ id: 1 }).lean();
  return docs.map(c => c.nombre);
}

/* ========================================================================== */
/* SELECCIONADOS                                                             */
/* ========================================================================== */

export async function guardarSeleccionado({id_usuario, id_voluntariado}) {
  // Verificaciones previas
  const uExiste = await Usuario.findOne({ id: id_usuario }).lean();
  const vExiste = await Voluntariado.findOne({ id: id_voluntariado }).lean();
  if (!uExiste || !vExiste) throw new Error("Usuario o Voluntariado no encontrado.");

  const yaSeleccionado = await Seleccionado.findOne({ id_usuario, id_voluntariado }).lean();
  if (yaSeleccionado) throw new Error("Ya está seleccionado.");

  const nuevoId = await getSiguienteId(Seleccionado);
  const doc = await Seleccionado.create({ id: nuevoId, id_usuario, id_voluntariado });
  return doc.toObject();
}

export async function listarSeleccionados() {
  return await Seleccionado.find().lean();
}

export async function seleccionadosPorUsuario(id_usuario) {
  return await Seleccionado.find({ id_usuario }).lean();
}

export async function buscarSeleccionadoPorId(id) {
  return await Seleccionado.findOne({ id: Number(id) }).lean();
}

export async function borrarSeleccionado(id) {
  const result = await Seleccionado.deleteOne({ id: Number(id) });
  return result.deletedCount > 0;
}