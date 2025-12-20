// public/js/graphqlClient.js

/**
 * Cliente mínimo para llamar al endpoint GraphQL del backend.
 * - Usa cookies de sesión (credentials: "include") para mantener login en servidor.
 * - Lanza Error si GraphQL devuelve errors[] o si la respuesta HTTP no es OK.
 */

/**
 * Ejecuta una operación GraphQL.
 *
 * @param {string} query - Query o mutation GraphQL.
 * @param {object} [variables={}] - Variables para la operación.
 * @returns {Promise<any>} data devuelto por GraphQL.
 */
export async function gql(query, variables = {}) {
  const res = await fetch("/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // CLAVE: envía/recibe cookie sid (sesión)
    body: JSON.stringify({ query, variables }),
  });

  // Si el servidor devuelve error HTTP (500, 404, etc.)
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? " - " + text : ""}`);
  }

  const json = await res.json();

  // Errores GraphQL
  if (json.errors && json.errors.length > 0) {
    // Mostramos el primer error (suele ser el más relevante)
    throw new Error(json.errors[0].message || "Error GraphQL");
  }

  return json.data;
}

/**
 * Helper: devuelve el usuario en sesión (me) o null.
 * (Útil para saber si hay sesión activa al cargar una página)
 */
export async function me() {
  const data = await gql("query { me { id nombre email rol } }");
  return data.me;
}
