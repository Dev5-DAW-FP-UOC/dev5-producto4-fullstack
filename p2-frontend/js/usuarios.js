import { init, getUsuarios, addUsuario, deleteUsuario } from './almacenaje.js';
import { checkLogin, updateNavbar } from './auth.js';

const $ = (sel) => document.querySelector(sel);

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inicialización básica
    await init();
    
    // 2. Seguridad: Comprobar login
    const user = checkLogin();
    if (!user) return;
    
    updateNavbar();

    // 3. Seguridad: Comprobar Rol
    // Si no es admin, le avisamos y ocultamos la tabla o redirigimos
    if (user.rol !== 'admin') {
        const container = $('main');
        container.innerHTML = `
            <div class="alert alert-danger mt-5 text-center">
                <h4>⛔ Acceso Denegado</h4>
                <p>Solo los administradores pueden gestionar usuarios.</p>
                <a href="./dashboard.html" class="btn btn-secondary">Volver al Dashboard</a>
            </div>
        `;
        return;
    }

    // 4. Si es admin, cargamos la tabla
    await renderTable();

    // 5. Configurar el formulario de alta
    const form = $('#formUser');
    if (form) {
        form.addEventListener('submit', handleAddUser);
    }
});

async function renderTable() {
    const tbody = $('#tablaUsers tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" class="text-center">Cargando...</td></tr>';

    try {
        const usuarios = await getUsuarios();
        
        if (!usuarios || usuarios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No hay usuarios registrados.</td></tr>';
            return;
        }

        tbody.innerHTML = usuarios.map(u => `
            <tr>
                <td>
                    <div class="fw-bold">${u.nombre}</div>
                    <div class="small text-muted">${u.rol}</div>
                </td>
                <td>${u.email}</td>
                <td class="text-end">
                    ${u.rol !== 'admin' ? `
                    <button class="btn btn-sm btn-outline-danger btn-delete" data-email="${u.email}">
                        Eliminar
                    </button>` : '<span class="badge bg-secondary">Admin</span>'}
                </td>
            </tr>
        `).join('');

        // Añadir eventos de borrado
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', handleDelete);
        });

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger">Error al cargar usuarios: ${error.message}</td></tr>`;
    }
}

async function handleAddUser(e) {
    e.preventDefault();
    const form = e.target;
    
    const nuevoUsuario = {
        nombre: form.nombre.value.trim(),
        email: form.email.value.trim(),
        password: form.password.value.trim()
    };

    if (!nuevoUsuario.nombre || !nuevoUsuario.email || !nuevoUsuario.password) {
        alert("Todos los campos son obligatorios");
        return;
    }

    const creado = await addUsuario(nuevoUsuario);
    
    if (creado) {
        form.reset();
        await renderTable(); // Recargar tabla
    } else {
        alert("Error al crear usuario. Revisa si el email ya existe.");
    }
}

async function handleDelete(e) {
    const email = e.target.dataset.email;
    if (!confirm(`¿Seguro que quieres eliminar al usuario ${email}?`)) return;

    const borrado = await deleteUsuario(email);
    if (borrado) {
        await renderTable();
    } else {
        alert("No se pudo eliminar el usuario.");
    }
}