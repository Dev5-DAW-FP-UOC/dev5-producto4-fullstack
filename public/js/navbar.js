// public/js/navbar.js
import { getActiveUser, logoutUsuario } from "./almacenaje.js";

const $ = (s, ctx = document) => ctx.querySelector(s);

function setBadge(name) {
  const badge = $("#userBadge");
  if (badge) badge.textContent = name || "-no login-";
}

function setLinkLoginToLogout(isLogged) {
  const link = document.querySelector('a[href="./login.html"], a[href="/login.html"], a[href="login.html"]');
  if (!link) return;

  if (!isLogged) {
    link.textContent = "Login";
    link.href = "./login.html";
    link.dataset.action = "";
    return;
  }

  // Logged -> convertir en Logout
  link.textContent = "Logout";
  link.href = "#";
  link.dataset.action = "logout";
}

function setUsuariosVisible(isAdmin) {
  // link usuarios (si existe)
  const usuariosLink = document.querySelector('a[href="./usuarios.html"], a[href="/usuarios.html"], a[href="usuarios.html"]');
  if (!usuariosLink) return;

  // Ocultamos el <li> si lo encontramos, si no, ocultamos el link
  const li = usuariosLink.closest("li");
  if (li) li.style.display = isAdmin ? "" : "none";
  else usuariosLink.style.display = isAdmin ? "" : "none";
}

async function wireLogout() {
  document.addEventListener("click", async (e) => {
    const a = e.target.closest('a[data-action="logout"]');
    if (!a) return;

    e.preventDefault();
    try {
      await logoutUsuario();
    } catch (err) {
      console.warn("[navbar] logout error:", err);
    }
    window.location.href = "./login.html";
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const active = await getActiveUser();

  setBadge(active?.nombre);
  setUsuariosVisible(active?.rol === "admin");
  setLinkLoginToLogout(!!active);

  await wireLogout();
});
