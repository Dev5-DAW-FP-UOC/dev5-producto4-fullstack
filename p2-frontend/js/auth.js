import { obtenerUsuarioActivo, handleLogout } from './almacenaje.js';

const $ = (sel) => document.querySelector(sel);

// Función auxiliar para pintar el usuario en el navbar
// Se usa en todas las páginas para mostrar quién está logueado
function setNavbarUser(name) {
    const badge = $("#userBadge");
    // Si no existe el badge (ej. en login.html), no hacemos nada
    if (!badge) return;
    badge.textContent = name || "-no login-";
}

/**
 * Comprueba si hay un usuario logueado.
 * Si no lo hay, redirige al login.
 * @returns {Object|null} El usuario activo o null.
 */
export function checkLogin() {
    const usuario = obtenerUsuarioActivo();
    
    // Si estamos en una página protegida y no hay usuario, fuera.
    // (Nota: Esto asume que login.html no llama a checkLogin, lo cual es correcto)
    if (!usuario) {
        // Guardamos la intención para (opcionalmente) volver después
        window.location.href = './login.html';
        return null;
    }
    return usuario;
}

/**
 * Actualiza la barra de navegación:
 * 1. Pone el nombre del usuario.
 * 2. Cambia el botón "Login" por "Cerrar Sesión".
 */
export function updateNavbar() {
    const usuario = obtenerUsuarioActivo();
    
    // 1. Actualizar el nombre
    setNavbarUser(usuario?.nombre);

    // 2. Gestionar botón Login/Logout
    // Buscamos el enlace que lleva a login.html
    const navLinks = document.querySelectorAll('#nav .nav-link');
    const loginLink = Array.from(navLinks).find(link => link.getAttribute('href').includes('login.html'));

    if (usuario && loginLink) {
        loginLink.textContent = 'Cerrar Sesión';
        loginLink.href = '#';
        
        // Evitamos acumular event listeners si se llama varias veces
        const newLink = loginLink.cloneNode(true);
        loginLink.parentNode.replaceChild(newLink, loginLink);
        
        newLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleLogout();
            window.location.href = './login.html';
        });
    }
}