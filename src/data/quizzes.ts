import type { RobotId } from '../types';
import { tr } from '../i18n';

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  hint: string;
}

export const QUIZZES: Record<RobotId, [QuizQuestion, QuizQuestion, QuizQuestion, QuizQuestion]> = {
  lrv: [
    {
      question: tr('What failed on the LRV during its first outing?', '¿Qué falló en el LRV durante su primera salida?'),
      options: [tr('The front steering', 'La dirección delantera'), tr('The batteries', 'Las baterías'), tr('The camera', 'La cámara'), tr('A rear wheel', 'Una rueda trasera')],
      correct: 0,
      hint: tr('Only the rear wheels turned.', 'Solo giraban las ruedas traseras.'),
    },
    {
      question: tr('What is the "Genesis Rock"?', '¿Qué es la "Roca Génesis"?'),
      options: [tr('An anorthosite about 4 billion years old', 'Una anortosita de unos 4.000 millones de años'), tr('An iron meteorite', 'Un meteorito de hierro'), tr('A piece of lunar ice', 'Un trozo de hielo lunar'), tr('A basalt from Mars', 'Un basalto de Marte')],
      correct: 0,
      hint: tr('It helps us understand how the lunar crust formed.', 'Ayuda a entender cómo se formó la corteza lunar.'),
    },
    {
      question: tr('What carved the Hadley Rille channel?', '¿Qué excavó el canal Hadley Rille?'),
      options: [tr('Ancient lava', 'Antigua lava'), tr('A river of water', 'Un río de agua'), tr('The solar wind', 'El viento solar'), tr('An asteroid impact', 'El impacto de un asteroide')],
      correct: 0,
      hint: tr('Think about the ancient lunar "seas".', 'Piensa en los antiguos "mares" lunares.'),
    },
    {
      question: tr('What were the LRV\'s wheels made of?', '¿De qué estaban hechas las ruedas del LRV?'),
      options: [tr('Zinc-coated steel mesh', 'Malla de acero galvanizado'), tr('Inflatable rubber', 'Caucho inflable'), tr('Reinforced wood', 'Madera reforzada'), tr('Solid plastic', 'Plástico sólido')],
      correct: 0,
      hint: tr('They were metal and shaped like a net.', 'Eran de metal y tenían forma de red.'),
    },
  ],
  spirit: [
    {
      question: tr('What did Spirit find on the plain of Gusev crater?', '¿Qué encontró Spirit en la llanura del cráter Gusev?'),
      options: [tr('Volcanic basalt', 'Basalto volcánico'), tr('Remains of a lake', 'Restos de un lago'), tr('Water ice', 'Hielo de agua'), tr('Silica sand', 'Arena de sílice')],
      correct: 0,
      hint: tr('It was not what scientists expected.', 'No era lo que los científicos esperaban.'),
    },
    {
      question: tr('How many sols was Spirit\'s mission planned for?', '¿Para cuántos soles estaba planeada la misión de Spirit?'),
      options: [tr('90 sols', '90 soles'), tr('30 sols', '30 soles'), tr('365 sols', '365 soles'), tr('1,000 sols', '1.000 soles')],
      correct: 0,
      hint: tr('A "sol" is a Martian day; it kept working for years after that.', 'Un "sol" es un día marciano; siguió activo años después.'),
    },
    {
      question: tr('How was the silica soil near Home Plate discovered?', '¿Cómo se descubrió el suelo de sílice cerca de Home Plate?'),
      options: [tr('With the furrow of a stuck wheel', 'Con el surco de una rueda atascada'), tr('With a drill', 'Con un taladro'), tr('With a laser', 'Con un láser'), tr('Because of a dust storm', 'Por una tormenta de polvo')],
      correct: 0,
      hint: tr('Spirit was driving backward, dragging a wheel.', 'Spirit conducía marcha atrás arrastrando una rueda.'),
    },
    {
      question: tr('What happened to Spirit at Troy?', '¿Qué le pasó a Spirit en Troy?'),
      options: [tr('It sank into soft sand', 'Se hundió en arena blanda'), tr('It crashed into a rock', 'Chocó con una roca'), tr('It lost its antenna', 'Perdió su antena'), tr('It tipped over on a slope', 'Se volcó en una pendiente')],
      correct: 0,
      hint: tr('From then on it worked as a stationary station.', 'Desde entonces trabajó como estación fija.'),
    },
  ],
  opportunity: [
    {
      question: tr('What are Opportunity\'s "blueberries"?', '¿Qué son las "blueberries" de Opportunity?'),
      options: [tr('Hematite spheres formed in water', 'Esferas de hematita formadas con agua'), tr('Blue volcanic rocks', 'Rocas volcánicas azules'), tr('Ice crystals', 'Cristales de hielo'), tr('Meteorite fragments', 'Restos de meteoritos')],
      correct: 0,
      hint: tr('They were proof that the place was once wet.', 'Fueron la prueba de que el lugar estuvo húmedo.'),
    },
    {
      question: tr('What did Opportunity study on the walls of Endurance crater?', '¿Qué estudió Opportunity en las paredes del cráter Endurance?'),
      options: [tr('Layers of sedimentary rock', 'Capas de roca sedimentaria'), tr('Lava caves', 'Cuevas de lava'), tr('Glaciers', 'Glaciares'), tr('Active volcanoes', 'Volcanes activos')],
      correct: 0,
      hint: tr('They are read "like a book".', 'Se leen "como un libro".'),
    },
    {
      question: tr('What did Opportunity survive at Victoria crater in 2007?', '¿Qué sobrevivió Opportunity en el cráter Victoria en 2007?'),
      options: [tr('A huge dust storm', 'Una gran tormenta de polvo'), tr('An earthquake', 'Un terremoto'), tr('A meteorite impact', 'Un impacto de meteorito'), tr('A flood', 'Una inundación')],
      correct: 0,
      hint: tr('It was a Martian weather event.', 'Fue un fenómeno del clima marciano.'),
    },
    {
      question: tr('How many kilometers did Opportunity travel in total?', '¿Cuántos kilómetros recorrió Opportunity en total?'),
      options: [tr('45.16 km', '45,16 km'), tr('7.73 km', '7,73 km'), tr('27.8 km', '27,8 km'), '39 km'],
      correct: 0,
      hint: tr('It is the record beyond Earth.', 'Es el récord fuera de la Tierra.'),
    },
  ],
};
