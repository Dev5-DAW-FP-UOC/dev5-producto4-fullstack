// js/login.js
import { gqlFetch } from "./api/graphqlClient.js";

const $ = (s, ctx = document) => ctx.querySelector(s);

function showMsg(text, type = "info") {
  const box = $("#msg");
  if (!box) return;
  box.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${text}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
}

function setNavbarUser(name) {
  const badge = $("#userBadge");
  if (badge) badge.textContent = name || "-no login-";
}

function applyNavbarState(me) {
  const badge = document.getElementById("userBadge");
  const dropdown = document.getElementById("userMenuBtn")?.closest(".dropdown");

  const linkDashboard = document
    .querySelector('a[href="./dashboard.html"]')
    ?.closest("li");
  const linkVoluntariados = document
    .querySelector('a[href="./voluntariados.html"]')
    ?.closest("li");
  const linkUsuarios = document
    .querySelector('a[href="./usuarios.html"]')
    ?.closest("li");
  const linkLogin = document
    .querySelector('a[href="./login.html"]')
    ?.closest("li");

  const show = (el) => el && (el.style.display = "");
  const hide = (el) => el && (el.style.display = "none");

  if (!me) {
    // ❌ NO hay sesión
    if (badge) badge.textContent = "-no login-";
    hide(dropdown);

    hide(linkDashboard);
    hide(linkVoluntariados);
    hide(linkUsuarios);
    show(linkLogin);

    return;
  }

  // ✅ Hay sesión
  if (badge) badge.textContent = me.nombre || me.email || "Usuario";
  show(dropdown);

  show(linkDashboard);
  show(linkVoluntariados);
  hide(linkLogin);

  // 👮 Usuarios solo admin
  if (me.rol === "admin") show(linkUsuarios);
  else hide(linkUsuarios);
}

document.addEventListener("DOMContentLoaded", () => {
  const form = $("#loginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
      showMsg("Completa email y contraseña", "warning");
      return;
    }

    try {
      const data = await gqlFetch(
        `
        mutation ($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            id
            nombre
            email
            rol
          }
        }
        `,
        { email, password }
      );

      setNavbarUser(data.login.nombre);
      showMsg("Inicio de sesión exitoso", "success");

      // redirigir al dashboard
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 500);
    } catch (err) {
      showMsg(err.message, "danger");
    }
  });
});
