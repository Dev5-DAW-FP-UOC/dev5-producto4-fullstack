// js/datos.js
export const datos = {
  session: { currentUser: null },

  usuarios: [
    {nombre: "Admin Demo", email: "admin@volunet.com", password: "123456", rol: "admin" },
    {nombre: "Ana Pérez", email: "ana@volunet.com", password: "123456", rol: "user" },
  ],

  categorias: ["Todas", "Idiomas", "Deportes", "Profesiones"],

  seleccion: ["Todos", "Seleccionados"],

  voluntariados: [
    // PETICIONES
    {
      id: 2001,
      type: "peticion",
      titulo: "Voluntario de Conversación en Inglés",
      autor: "María López",
      modalidad: "Online",
      categoria: "Idiomas",
      resumen: "Busco a alguien que quiera dedicar 1 hora a la semana para practicar conversación en inglés (nivel B1). Quiero mejorar la fluidez para entrevistas de trabajo.",
      fecha: "2025-11-25",
    },
    {
      id: 2002,
      type: "peticion",
      titulo: "Ayuda con Diseño Gráfico Básico",
      autor: "Sofía Martínez",
      modalidad: "Presencial",
      categoria: "Profesiones",
      resumen: "Necesito apoyo para crear un logo y una plantilla de folleto para una ONG local. Se requiere manejo básico de software de diseño.",
      fecha: "2025-12-10",
    },

    // OFERTAS
    {
      id: 2006,
      type: "oferta",
      titulo: "Tutorías de Español para Extranjeros",
      autor: "Javier Morales",
      modalidad: "Online",
      categoria: "Idiomas",
      resumen: "Ayudo a practicar y mejorar español conversacional o gramática. Experiencia previa. Disponible online o presencial.",
      fecha: "2025-11-01",
    },
    {
      id: 2007,
      type: "oferta",
      titulo: "Entrenador de Voleibol Femenino",
      autor: "Marta Sánchez",
      modalidad: "Presencial",
      categoria: "Deportes",
      resumen: "Entrenador voluntario para equipo amateur o grupo. 5 años como jugador y 2 como monitor.",
      fecha: "2025-11-10",
    },
  ],
};
