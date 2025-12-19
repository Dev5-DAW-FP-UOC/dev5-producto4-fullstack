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
