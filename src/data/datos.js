// js/datos.js

// Datos iniciales copiados/adaptados del producto 2

export const CATEGORIAS = ["Todas", "Idiomas", "Deportes", "Profesiones"];

export const USUARIOS_INICIALES = [
  {
    id: 1,
    nombre: "Admin Demo",
    email: "admin@volunet.com",
    password: "123456",
    rol: "admin",
  },
  {
    id: 2,
    nombre: "Ana Pérez",
    email: "ana@volunet.com",
    password: "123456",
    rol: "user",
  },
  {
    id: 3,
    nombre: "Javier Morales",
    email: "javier@volunet.com",
    password: "123456",
    rol: "user",
  },
];

export const VOLUNTARIADOS_INICIALES = [
  // PETICIONES
  {
    id: 1,
    type: "peticion",
    titulo: "Voluntario de Conversación en Inglés",
    id_usuario: 1,
    modalidad: "Online",
    categoria: "Idiomas",
    resumen: "Busco a alguien que quiera dedicar 1 hora a la semana para practicar conversación en inglés (nivel B1). Quiero mejorar la fluidez para entrevistas de trabajo.",
    fecha: "2025-11-25",
  },
  {
    id: 2,
    type: "peticion",
    titulo: "Ayuda con Diseño Gráfico Básico",
    id_usuario: 2,
    modalidad: "Presencial",
    categoria: "Profesiones",
    resumen: "Necesito apoyo para crear un logo y una plantilla de folleto para una ONG local. Se requiere manejo básico de software de diseño.",
    fecha: "2025-12-10",
  },

  // OFERTAS
  {
    id: 3,
    type: "oferta",
    titulo: "Tutorías de Español para Extranjeros",
    id_usuario: 3,
    modalidad: "Online",
    categoria: "Idiomas",
    resumen: "Ayudo a practicar y mejorar español conversacional o gramática. Experiencia previa. Disponible online o presencial.",
    fecha: "2025-11-01",
  },
  {
    id: 4,
    type: "oferta",
    titulo: "Entrenador de Voleibol Femenino",
    id_usuario: 2,
    modalidad: "Presencial",
    categoria: "Deportes",
    resumen: "Entrenador voluntario para equipo amateur o grupo. 5 años como jugador y 2 como monitor.",
    fecha: "2025-11-10",
  },
];
