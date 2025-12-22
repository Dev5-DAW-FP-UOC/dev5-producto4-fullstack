// js/services/api.js

const URL = "http://localhost:4000/graphql";

/**
 * Función base para todas las peticiones
 */
async function query(gql, variables = {}) {
    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ query: gql, variables })
        });

        const json = await response.json();

        if (json.errors) {
            throw new Error(json.errors[0].message);
        }

        return json.data;
    } catch (error) {
        console.error("Error en la comunicación con el servidor:", error);
        throw error;
    }
}

// --- FUNCIONES EXPORTABLES ---

export const API = {
    // Autenticación
    login: (email, password) => {
        const gql = `mutation($email: String!, $password: String!) {
            login(email: $email, password: $password) { id nombre rol email }
        }`;
        return query(gql, { email, password });
    },

    logout: () => {
        return query(`mutation { logout }`);
    },

    getMe: () => {
        return query(`query { me { id nombre rol email } }`);
    },

    // 1. Obtener todos los usuarios
    getUsers: async () => {
        const gql = `query {
            usuarios {
                id
                nombre
                email
                rol
            }
        }`;
        // Nota: Dependiendo de tu servidor, la query puede llamarse 'usuarios' o 'getUsers'
        const res = await query(gql);
        return res.usuarios; 
    },

    // 2. Crear un nuevo usuario (Alta)
    crearUsuario: async ({ nombre, email, password, rol }) => {
        const gql = `mutation($nombre: String!, $email: String!, $password: String!, $rol: String!) {
            crearUsuario(nombre: $nombre, email: $email, password: $password, rol: $rol) {
                id
                nombre
                email
            }
        }`;
        return query(gql, { nombre, email, password, rol });
    },

    // 3. Borrar un usuario por ID
    borrarUsuario: async (email) => {
        const gql = `mutation($email: String!) {
            borrarUsuario(email: $email)
        }`;
        
        return query(gql, { email }); 
    },

    // Voluntariados
    getVoluntariados: async () => {
      const gql = `query {
        voluntariados {
          id
          titulo
          resumen
          categoria
          type
          modalidad
          fecha
          id_usuario
          nombre_usuario
        }
      }`;
      const data = await query(gql);
      return data.voluntariados;
    },

    crearVoluntariado: (v) => {

    const gql = `mutation($titulo: String!, $categoria: String!, $type: String!, $resumen: String!, $fecha: String!, $id_usuario: Int!, $modalidad: String!) {
      crearVoluntariado(
        titulo: $titulo, 
        categoria: $categoria, 
        type: $type, 
        resumen: $resumen, 
        fecha: $fecha,
        id_usuario: $id_usuario,
        modalidad: $modalidad
      ) {
        id
        titulo
      }
    }`;
    return query(gql, v);
  },

    borrarVoluntariado: (id) => {
        const gql = `mutation($id: Int!) { borrarVoluntariado(id: $id) }`;
        return query(gql, { id });
    },

    // Usuarios
    getUsuarios: () => {
        return query(`query { usuarios { id nombre email rol } }`);
    },

    getSeleccionados: async () => {
      const gql = `query {
        seleccionados {
          id
          id_voluntariado
          id_usuario
        }
      }`;
      const data = await query(gql);
      return data.seleccionados || [];
    },
    
    crearSeleccionado: (id_voluntariado) => {
        const gql = `mutation($id: Int!) { crearSeleccionado(id_voluntariado: $id) { id } }`;
        return query(gql, { id: id_voluntariado });
    },

    borrarSeleccionado: (id_voluntariado) => {
        const gql = `mutation($id: Int!) { borrarSeleccionado(id: $id) }`;
        return query(gql, { id: id_voluntariado });
    }
};