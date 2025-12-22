import { init, addVoluntariado, deleteVoluntariado, listarVoluntariados, obtenerUsuarioActivo } from './almacenaje.js';
import { checkLogin, updateNavbar } from './auth.js';

const $ = (sel) => document.querySelector(sel);

function setNavbarUser(name) {
    const badge = $("#userBadge");
    if (badge) {
        badge.textContent = name || "-no login-";
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await init();
    
    const user = checkLogin();
    if (!user) return;
    
    updateNavbar();
    setNavbarUser(user.nombre || user.email);

    // [MODIFICADO] Auto-rellenamos el email pero TE DEJAMOS EDITARLO
    const emailInput = $('#email');
    if (emailInput && user.email) {
        emailInput.value = user.email;
        // Hemos quitado el readOnly para que puedas cambiarlo si quieres
    }

    // Cargar lista inicial
    await renderList();

    // Configurar formulario de alta
    const form = $('#formVol');
    if (form) {
        form.addEventListener('submit', handleAdd);
    }
});

async function renderList() {
    const listContainer = $('#list');
    if (!listContainer) return;

    listContainer.innerHTML = '<p class="text-center text-muted">Cargando...</p>';

    const voluntariados = await listarVoluntariados();
    
    if (!voluntariados || voluntariados.length === 0) {
        listContainer.innerHTML = '<p class="text-center text-muted">No hay voluntariados registrados.</p>';
        return;
    }

    const user = obtenerUsuarioActivo();
    const isAdmin = user && user.rol === 'admin';

    listContainer.innerHTML = voluntariados.map(v => {
        const badgeClass = v.tipo === 'oferta' ? 'text-bg-success' : 'text-bg-primary';
        
        const deleteBtn = isAdmin 
            ? `<button class="btn btn-outline-danger btn-sm btn-delete" data-id="${v.id}">Borrar</button>` 
            : '';

        return `
            <div class="card shadow-sm mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                             <h5 class="card-title mb-0 d-inline me-2">${v.titulo}</h5>
                             <span class="badge ${badgeClass}">${v.tipo}</span>
                        </div>
                        ${deleteBtn}
                    </div>
                    <h6 class="card-subtitle mb-2 text-muted">${v.categoria}</h6>
                    <p class="card-text">${v.descripcion}</p>
                    <div class="mt-3 small text-muted border-top pt-2">
                        Por: <strong>${v.email}</strong> · Fecha: ${v.fecha}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (isAdmin) {
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', handleDelete);
        });
    }
}

async function handleAdd(e) {
    e.preventDefault();
    const form = e.target;
    
    const nuevoVoluntariado = {
        titulo: form.titulo.value.trim(),
        categoria: form.categoria.value,
        tipo: form.tipo.value,
        fecha: form.fecha.value,
        email: form.email.value.trim(),
        descripcion: form.descripcion.value.trim()
    };

    if (!nuevoVoluntariado.titulo || !nuevoVoluntariado.descripcion || !nuevoVoluntariado.fecha) {
        alert("Por favor, rellena todos los campos obligatorios.");
        return;
    }

    const creado = await addVoluntariado(nuevoVoluntariado);
    
    if (creado) {
        form.reset();
        // Volvemos a poner tu email por comodidad
        const user = obtenerUsuarioActivo();
        if (user && $('#email')) $('#email').value = user.email;

        // No mostramos alert para que la experiencia sea más fluida con WebSockets
        // alert("Voluntariado creado con éxito");
        await renderList();
    } else {
        alert("Error al crear el voluntariado.");
    }
}

async function handleDelete(e) {
    const id = e.target.dataset.id;
    if (!confirm("¿Seguro que quieres borrar este voluntariado?")) return;

    const borrado = await deleteVoluntariado(id);
    if (borrado) {
        await renderList();
    } else {
        alert("No se pudo borrar el voluntariado.");
    }
}