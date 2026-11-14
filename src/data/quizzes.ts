import type { RobotId } from '../types';

/** Pregunta de opción múltiple de un nivel. `correct` es el índice en `options`. */
export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  /** pista que se muestra tras un error */
  hint: string;
}

/**
 * Una pregunta por nivel (4 por robot, mismo orden que `levels` en robots.ts).
 * Todas se responden leyendo la tarjeta del nivel.
 */
export const QUIZZES: Record<RobotId, [QuizQuestion, QuizQuestion, QuizQuestion, QuizQuestion]> = {
  lrv: [
    {
      question: '¿Qué falló en el LRV durante su primera salida?',
      options: ['La dirección delantera', 'Las baterías', 'La cámara', 'Una rueda trasera'],
      correct: 0,
      hint: 'Solo giraban las ruedas traseras.',
    },
    {
      question: '¿Qué es la "Roca Génesis"?',
      options: ['Una anortosita de unos 4.000 millones de años', 'Un meteorito de hierro', 'Un trozo de hielo lunar', 'Un basalto de Marte'],
      correct: 0,
      hint: 'Ayuda a entender cómo se formó la corteza lunar.',
    },
    {
      question: '¿Qué excavó el canal Hadley Rille?',
      options: ['Antigua lava', 'Un río de agua', 'El viento solar', 'El impacto de un asteroide'],
      correct: 0,
      hint: 'Piensa en los antiguos "mares" lunares.',
    },
    {
      question: '¿De qué estaban hechas las ruedas del LRV?',
      options: ['Malla de acero galvanizado', 'Caucho inflable', 'Madera reforzada', 'Plástico sólido'],
      correct: 0,
      hint: 'Eran de metal y tenían forma de red.',
    },
  ],
  lunokhod2: [
    {
      question: '¿Cómo se conducía Lunojod 2?',
      options: ['Desde la Tierra, mirando sus cámaras', 'Con un astronauta a bordo', 'Solo, con inteligencia artificial', 'Por control remoto desde la órbita'],
      correct: 0,
      hint: 'Había unos segundos de retraso por la distancia.',
    },
    {
      question: '¿Qué lo mantenía caliente durante la noche lunar?',
      options: ['Un calentador de polonio-210', 'Sus paneles solares', 'Una batería de litio', 'Una manta térmica'],
      correct: 0,
      hint: 'Era una fuente radiactiva.',
    },
    {
      question: '¿Qué instrumento suyo todavía se usa hoy?',
      options: ['Un retrorreflector láser', 'Su cámara panorámica', 'Su brazo robótico', 'Su antena de radio'],
      correct: 0,
      hint: 'Sirve para medir la distancia Tierra-Luna.',
    },
    {
      question: '¿Por qué dejó de funcionar Lunojod 2?',
      options: ['Se cubrió de polvo y se sobrecalentó', 'Se quedó sin combustible', 'Cayó en una grieta', 'Lo apagaron a propósito'],
      correct: 0,
      hint: 'Rozó el borde de un cráter en mayo de 1973.',
    },
  ],
  spirit: [
    {
      question: '¿Qué encontró Spirit en la llanura del cráter Gusev?',
      options: ['Basalto volcánico', 'Restos de un lago', 'Hielo de agua', 'Arena de sílice'],
      correct: 0,
      hint: 'No era lo que los científicos esperaban.',
    },
    {
      question: '¿Para cuántos soles estaba planeada la misión de Spirit?',
      options: ['90 soles', '30 soles', '365 soles', '1.000 soles'],
      correct: 0,
      hint: 'Un "sol" es un día marciano; siguió activo años después.',
    },
    {
      question: '¿Cómo se descubrió el suelo de sílice cerca de Home Plate?',
      options: ['Con el surco de una rueda atascada', 'Con un taladro', 'Con un láser', 'Por una tormenta de polvo'],
      correct: 0,
      hint: 'Spirit conducía marcha atrás arrastrando una rueda.',
    },
    {
      question: '¿Qué le pasó a Spirit en Troy?',
      options: ['Se hundió en arena blanda', 'Chocó con una roca', 'Perdió su antena', 'Se volcó en una pendiente'],
      correct: 0,
      hint: 'Desde entonces trabajó como estación fija.',
    },
  ],
  opportunity: [
    {
      question: '¿Qué son las "blueberries" de Opportunity?',
      options: ['Esferas de hematita formadas con agua', 'Rocas volcánicas azules', 'Cristales de hielo', 'Restos de meteoritos'],
      correct: 0,
      hint: 'Fueron la prueba de que el lugar estuvo húmedo.',
    },
    {
      question: '¿Qué estudió Opportunity en las paredes del cráter Endurance?',
      options: ['Capas de roca sedimentaria', 'Cuevas de lava', 'Glaciares', 'Volcanes activos'],
      correct: 0,
      hint: 'Se leen "como un libro".',
    },
    {
      question: '¿Qué sobrevivió Opportunity en el cráter Victoria en 2007?',
      options: ['Una gran tormenta de polvo', 'Un terremoto', 'Un impacto de meteorito', 'Una inundación'],
      correct: 0,
      hint: 'Fue un fenómeno del clima marciano.',
    },
    {
      question: '¿Cuántos kilómetros recorrió Opportunity en total?',
      options: ['45,16 km', '7,73 km', '27,8 km', '39 km'],
      correct: 0,
      hint: 'Es el récord fuera de la Tierra.',
    },
  ],
};