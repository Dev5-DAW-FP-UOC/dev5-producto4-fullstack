// js/login.js

import { setActiveUser, getActiveUser, logout } from "./almacenaje.js";

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

document.addEventListener("DOMContentLoaded", () => {
  (async () => {
    try {
      const m = await import('./almacenaje.js');
      await (m.ensureActiveUserFromSession && m.ensureActiveUserFromSession());
    } catch (e) {}
    // Actualiza la UI del navbar
    const active = getActiveUser();
    const badge = document.getElementById('userBadge') || document.querySelector('.navbar-text');
    if (badge) {
      badge.textContent = active?.nombre || '-no login-';
      let logoutBtn = document.getElementById('logoutBtn');
      if (!logoutBtn) {
        logoutBtn = document.createElement('button');
        logoutBtn.id = 'logoutBtn';
        logoutBtn.className = 'btn btn-sm btn-outline-secondary ms-2';
        logoutBtn.textContent = 'Logout';
        badge.insertAdjacentElement('afterend', logoutBtn);
        logoutBtn.addEventListener('click', async () => {
          try { await logout(); } catch (err) { console.error('Logout failed', err); }
          setActiveUser(null);
          badge.textContent = '-no login-';
          // redirige al login
          window.location.href = './login.html';
        });
      }
      logoutBtn.style.display = active ? 'inline-block' : 'none';
    }
  })();
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
      const response = await fetch("http://localhost:4000/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        showMsg("Email o contraseña incorrectos", "danger");
        return;
      }

      // sesión creada en servidor
      const json = await response.json();
      console.log('login response json:', json);
      setActiveUser(json.user);
      console.log('set active user:', json.user);
      console.log('localStorage activeUser:', localStorage.getItem('activeUser'));
      window.location.href = "dashboard.html";

    } catch (err) {
      showMsg("Error de conexión con el servidor", "danger");
    }
  });
});
