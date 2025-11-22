// js/login.js
//import { login, getActiveUser } from './storage.js';
import { loguearUsuario, guardarUsuarioActivo, getActiveUser, logoutUsuario } from "./almacenaje.js";

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

document.addEventListener("DOMContentLoaded", () => {
  // Pintar usuario activo si existe
  const active = getActiveUser();
  setNavbarUser(active?.nombre);

  const form = $("#loginForm");
  if (!form) return;

  $("#email")?.focus();

  document.getElementById("email")?.focus();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
      showMsg("Completa email y contraseña", "warning");
      return;
    }
    const user = loguearUsuario(email, password);

    if (!user) {
      showMsg("Email o contraseña incorrectos", "danger");
      return;
    }

    guardarUsuarioActivo(user.email);

    setNavbarUser(user.nombre);

    showMsg("Inicio de sesión exitoso", "success");
    alert("Inicio de sesión exitoso");
    form.reset();
  });
});
