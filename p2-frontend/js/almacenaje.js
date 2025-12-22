/**
 * Módulo de Almacenamiento - Versión FullStack (P4)
 * Sustituye la persistencia local por llamadas a la API Backend (GraphQL).
 */

// [CORREGIDO] Usamos 127.0.0.1 para coincidir con Live Server y evitar problemas de cookies
const GRAPHQL_ENDPOINT = 'http://127.0.0.1:4000/graphql';

/**
 * Helper genérico para hacer peticiones a GraphQL
 */
async function graphqlRequest(query, variables = {}) {
    try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            // Envia cookies de sesión (httpOnly) al backend
            credentials: 'include', 
            body: JSON.stringify({ query, variables })
        });

        const json = await response.json();
        
        if (json.errors) {
            console.error("❌ Errores GraphQL:", json.errors);
            throw new Error(json.errors[0].message);
        }

        return json.data;
    } catch (error) {
        console.error("❌ Error de red o API:", error);
        return null;
    }
}

// --- Inicialización ---
export async function init() {
    console.log("✅ Conectado al Backend GraphQL");
}

// --- Usuarios / Login ---

export async function loguearUsuario(email, password) {
    const mutation = `
        mutation Login($email: String!, $password: String!) {
            login(email: $email, password: $password) {
                id
                nombre
                email
                rol
            }
        }
    `;
    
    const data = await graphqlRequest(mutation, { email, password });
    
    if (data && data.login) {
        // Guardamos datos básicos en localStorage solo para la UI
        localStorage.setItem('usuario_ui', JSON.stringify(data.login));
        return data.login;
    }
    return null;
}

export function obtenerUsuarioActivo() {
    const user = localStorage.getItem('usuario_ui');
    return user ? JSON.parse(user) : null;
}

// [IMPORTANTE] Esta es la función que faltaba
export async function handleLogout() {
    const mutation = `mutation { logout }`;
    await graphqlRequest(mutation);
    localStorage.removeItem('usuario_ui');
}

// --- Voluntariados ---

export async function getVoluntariados() {
    const query = `
        query {
            voluntariados {
                id
                titulo
                tipo
                categoria
                descripcion
                email
                fecha
            }
        }
    `;
    const data = await graphqlRequest(query);
    return data ? data.voluntariados : [];
}

export async function addVoluntariado(voluntariado) {
    const mutation = `
        mutation CrearVoluntariado($titulo: String!, $tipo: String!, $categoria: String!, $descripcion: String!, $email: String!, $fecha: String!) {
            crearVoluntariado(
                titulo: $titulo, 
                tipo: $tipo, 
                categoria: $categoria, 
                descripcion: $descripcion, 
                email: $email, 
                fecha: $fecha
            ) {
                id
                titulo
            }
        }
    `;

    const variables = {
        titulo: voluntariado.titulo,
        tipo: voluntariado.tipo,
        categoria: voluntariado.categoria,
        descripcion: voluntariado.descripcion,
        email: voluntariado.email || "anonimo@volunet.com",
        fecha: voluntariado.fecha || new Date().toISOString().split('T')[0]
    };

    const data = await graphqlRequest(mutation, variables);
    return data ? data.crearVoluntariado : null;
}

export async function deleteVoluntariado(id) {
    const mutation = `
        mutation Borrar($id: String!) {
            borrarVoluntariado(id: $id)
        }
    `;
    const data = await graphqlRequest(mutation, { id: String(id) });
    return data ? data.borrarVoluntariado : false;
}

// --- GESTIÓN DE USUARIOS (Solo Admin) ---

export async function getUsuarios() {
    const query = `
        query {
            usuarios {
                id
                nombre
                email
                rol
            }
        }
    `;
    const data = await graphqlRequest(query);
    return data ? data.usuarios : [];
}

export async function addUsuario(usuario) {
    const mutation = `
        mutation CrearUsuario($nombre: String!, $email: String!, $password: String!, $rol: String!) {
            crearUsuario(nombre: $nombre, email: $email, password: $password, rol: $rol) {
                id
                nombre
                email
            }
        }
    `;
    const variables = {
        nombre: usuario.nombre,
        email: usuario.email,
        password: usuario.password || "123456", 
        rol: "user"
    };
    
    const data = await graphqlRequest(mutation, variables);
    return data ? data.crearUsuario : null;
}

export async function deleteUsuario(email) {
    const mutation = `
        mutation BorrarUsuario($email: String!) {
            borrarUsuario(email: $email)
        }
    `;
    const data = await graphqlRequest(mutation, { email });
    return data ? data.borrarUsuario : false;
}

// --- SELECCIONADOS (Favoritos / Drag & Drop) ---

export async function guardarSeleccionado(idUsuario, idVoluntariado) {
    const mutation = `
        mutation CrearSeleccionado($id_usuario: String!, $id_voluntariado: String!) {
            crearSeleccionado(id_usuario: $id_usuario, id_voluntariado: $id_voluntariado) {
                id
            }
        }
    `;
    const variables = { 
        id_usuario: String(idUsuario), 
        id_voluntariado: String(idVoluntariado) 
    };
    const data = await graphqlRequest(mutation, variables);
    return data ? data.crearSeleccionado : null;
}

export async function borrarSeleccionado(idSeleccion) {
    const mutation = `
        mutation BorrarSeleccionado($id: String!) {
            borrarSeleccionado(id: $id)
        }
    `;
    const data = await graphqlRequest(mutation, { id: String(idSeleccion) });
    return data ? data.borrarSeleccionado : false;
}

export async function listarSeleccionados(idUsuario) {
    if (!idUsuario) return [];

    const query = `
        query ListarSeleccionados($id_usuario: String!) {
            seleccionadosPorUsuario(id_usuario: $id_usuario) {
                id
                voluntariado {
                    id
                    titulo
                    tipo
                    categoria
                    descripcion
                    email
                    fecha
                }
            }
        }
    `;
    const data = await graphqlRequest(query, { id_usuario: String(idUsuario) });
    return data && data.seleccionadosPorUsuario 
        ? data.seleccionadosPorUsuario.map(s => ({ ...s.voluntariado, id_seleccion: s.id }))
        : [];
}

// --- Alias y Compatibilidad ---

export function getCategorias() {
    return ["Todas", "Idiomas", "Deportes", "Profesiones"]; 
}

export function inicializarDatos() {}
export function listarVoluntariados() { return getVoluntariados(); }
export function getActiveUser() { return obtenerUsuarioActivo(); }
export { getUsuarios as listarUsuarios };

// Exportamos los alias para evitar errores en dashboard.js
export { borrarSeleccionado as borrarSeleccionados };
export { getCategorias as getSeleccion }; 
export { guardarSeleccionado as guardarSeleccionados };