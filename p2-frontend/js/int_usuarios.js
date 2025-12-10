// js/users.js
import { inicializarDatos, altaUsuario, listarUsuarios, borrarUsuario, getActiveUser, logoutUsuario } from "./almacenaje.js";
const $ = (s, ctx = document) => ctx.querySelector(s);

function showMsg(text, type = "info") {
  const box = $("#msg");
  if (!box) return;
  box.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${text}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;
}

function setNavbarUser(name) {
  let badge = $("#userBadge") || document.querySelector(".navbar-text");
  if (!badge) {
    const container = $("#nav") || document.querySelector(".navbar .container, .navbar");
    badge = document.createElement("span");
    badge.className = "navbar-text small text-muted";
    badge.id = "userBadge";
    container?.appendChild(badge);
  }
  badge.textContent = name || "-no login-";
}

function drawTable() {
  const tbody = $("#tablaUsers tbody");
  const arr = listarUsuarios();

  if (!arr.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-muted">No hay usuarios.</td></tr>`;
    return;
  }

  tbody.innerHTML = arr
    .map(
      (u) => `
    <tr>
      <td>${u.nombre || ""}</td>
      <td>${u.email}</td>
      <td class="text-end">
        <button class="btn btn-outline-danger btn-sm" data-action="del" data-email="${u.email}">Borrar</button>
      </td>
    </tr>`
    )
    .join("");
}

function wireTableActions() {
  const tbody = $("#tablaUsers tbody");
  tbody.addEventListener("click", (ev) => {
    const btn = ev.target.closest('button[data-action="del"]');
    if (!btn) return;
    const id = btn.getAttribute("data-email");
    const ok = confirm("¿Seguro que quieres borrar este usuario?");
    if (!ok) return;

    const activeUser = getActiveUser();
    const isActiveUser = activeUser && activeUser.email === id;

    borrarUsuario(id);

    if(isActiveUser){
      logoutUsuario();
      setNavbarUser(null);
    }

    drawTable();
    showMsg("Usuario eliminado", "success");
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  //await inicializarDatos();

  // Usuario activo → navbar
  const active = getActiveUser();
  setNavbarUser(active?.nombre);

  // Pintar tabla
  drawTable();
  wireTableActions();

  // Alta de usuarios
  const form = $("#formUser");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const nombre = form.nombre.value.trim();
      const email = form.email.value.trim();
      const password = form.password.value;
      const rol = form.rol ? form.rol.value : "user";

      if (!nombre || !email || !password) {
        showMsg("Rellena todos los campos", "warning");
        return;
      }

      const usuario = { nombre, email, password, rol };

      try {
        const ok = altaUsuario(usuario);
        if (!ok) throw new Error("El email ya existe");
        showMsg("Usuario creado correctamente", "success");
        form.reset();
        document.getElementById("nombre")?.focus();
        drawTable();
      } catch (err) {
        showMsg(err.message || "Error al crear el usuario", "danger");
      }
    });
  }
});
