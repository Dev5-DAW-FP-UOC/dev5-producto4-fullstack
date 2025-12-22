import { init, loguearUsuario, obtenerUsuarioActivo } from './almacenaje.js';

const $ = (sel) => document.querySelector(sel);

function setNavbarUser(name) {
    const badge = $("#userBadge");
    if (badge) {
        badge.textContent = name || "-no login-";
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await init();

    const active = obtenerUsuarioActivo();
    setNavbarUser(active?.nombre);

    const form = $("#loginForm");
    const msg = $("#msg");

    if (form) {
        $("#email")?.focus();

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const email = form.email.value.trim();
            const password = form.password.value.trim();

            if (!email || !password) {
                msg.innerHTML = `<div class="alert alert-danger">Introduce email y contraseña.</div>`;
                return;
            }

            try {
                const usuario = await loguearUsuario(email, password);

                if (!usuario) {
                    msg.innerHTML = `<div class="alert alert-danger">Credenciales no válidas.</div>`;
                    return;
                }

                window.location.href = './dashboard.html';

            } catch (error) {
                console.error(error);
                msg.innerHTML = `<div class="alert alert-danger">Error de conexión con el servidor.</div>`;
            }
        });
    }
});