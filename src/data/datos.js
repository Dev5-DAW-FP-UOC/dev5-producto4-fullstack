export const USUARIOS_INICIALES = [
  { nombre: "Admin Demo", email: "admin@volunet.com", password: "123456", rol: "admin" }, // ID simulado: 1
  { nombre: "Ana Pérez", email: "ana@volunet.com", password: "123456", rol: "user" },     // ID simulado: 2
  { nombre: "Javier Estudiante", email: "javier@volunet.com", password: "123456", rol: "user" } // ID simulado: 3
];

export const CATEGORIAS = ["Todas", "Idiomas", "Deportes", "Profesiones"];

export const VOLUNTARIADOS_INICIALES = [
  // PETICIONES
  {
    tipo: "peticion",
    titulo: "Voluntario de Conversación en Inglés",
    email: "admin@volunet.com", // id_usuario: 1
    categoria: "Idiomas",
    descripcion: "[Modalidad: Online] Busco a alguien que quiera dedicar 1 hora a la semana para practicar conversación en inglés (nivel B1). Quiero mejorar la fluidez para entrevistas de trabajo.",
    fecha: "2025-11-25"
  },
  {
    tipo: "peticion",
    titulo: "Ayuda con Diseño Gráfico Básico",
    email: "ana@volunet.com", // id_usuario: 2
    categoria: "Profesiones",
    descripcion: "[Modalidad: Presencial] Necesito apoyo para crear un logo y una plantilla de folleto para una ONG local. Se requiere manejo básico de software de diseño.",
    fecha: "2025-12-10"
  },

  // OFERTAS
  {
    tipo: "oferta",
    titulo: "Tutorías de Español para Extranjeros",
    email: "javier@volunet.com", // id_usuario: 3
    categoria: "Idiomas",
    descripcion: "[Modalidad: Online] Ayudo a practicar y mejorar español conversacional o gramática. Experiencia previa. Disponible online o presencial.",
    fecha: "2025-11-01"
  },
  {
    tipo: "oferta",
    titulo: "Entrenador de Voleibol Femenino",
    email: "ana@volunet.com", // id_usuario: 2
    categoria: "Deportes",
    descripcion: "[Modalidad: Presencial] Entrenador voluntario para equipo amateur o grupo. 5 años como jugador y 2 como monitor.",
    fecha: "2025-11-10"
  }
];
