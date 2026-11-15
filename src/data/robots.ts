import type { RobotData, RobotId, StoneFact } from '../types';
import { tr } from '../i18n';

export const ROBOTS: Record<RobotId, RobotData> = {
  lrv: {
    id: 'lrv',
    name: 'LRV · Apollo 15',
    body: 'moon',
    mission: tr('Apollo 15 · Hadley-Apennine · July-August 1971', 'Apollo 15 · Hadley-Apennine · julio-agosto 1971'),
    accent: '#e5e7eb',
    route: [
      [520, 290],
      [480, 330],
      [430, 370],
      [372, 405],
      [395, 450],
      [430, 478],
      [500, 400],
      [540, 330],
      [600, 370],
      [650, 420],
      [690, 458],
      [610, 440],
      [560, 350],
      [490, 300],
      [420, 270],
      [355, 245],
      [330, 205],
      [370, 175],
      [440, 220],
      [505, 280],
    ],
    levels: [
      {
        routeIndex: 3,
        title: 'Elbow',
        card: {
          title: tr('The first car on the Moon', 'El primer coche en la Luna'),
          text: tr('On July 31, 1971, David Scott and James Irwin deployed the LRV, which traveled folded up on one side of the lunar module Falcon. On their first outing they drove to Elbow, a bend in the Hadley Rille valley, even though the front steering did not work and only the rear wheels turned.', 'El 31 de julio de 1971, David Scott y James Irwin desplegaron el LRV, que viajaba plegado en un costado del módulo lunar Falcon. En su primera salida condujeron hasta Elbow, una curva del valle Hadley Rille, aunque la dirección delantera no funcionaba y solo giraban las ruedas traseras.'),
        },
      },
      {
        routeIndex: 10,
        title: 'Spur',
        card: {
          title: tr('The Genesis Rock', 'La Roca Génesis'),
          text: tr('On the second outing they climbed the slope of Mount Hadley Delta to Spur crater. There they found the "Genesis Rock", an anorthosite about 4 billion years old that helps us understand how the lunar crust formed.', 'En la segunda salida subieron por la ladera del monte Hadley Delta hasta el cráter Spur. Allí encontraron la "Roca Génesis", una anortosita de unos 4.000 millones de años que ayuda a entender cómo se formó la corteza lunar.'),
        },
      },
      {
        routeIndex: 15,
        title: 'Hadley Rille',
        card: {
          title: tr('At the edge of the great channel', 'Al borde del gran canal'),
          text: tr('On the third outing they reached the edge of Hadley Rille, a winding channel about 1.5 km wide carved by ancient lava. They photographed its walls and collected basalt samples from the ancient lava seas.', 'En la tercera salida llegaron al borde de Hadley Rille, un canal sinuoso de unos 1,5 km de ancho excavado por antigua lava. Fotografiaron sus paredes y tomaron muestras de basalto de los antiguos mares de lava.'),
        },
      },
      {
        routeIndex: 19,
        title: tr('Back to Falcon', 'Regreso al Falcon'),
        card: {
          title: tr('27.8 km on mesh wheels', '27,8 km sobre ruedas de malla'),
          text: tr('Over 3 outings the LRV traveled about 27.8 km at a top speed of nearly 13 km/h. Its wheels were made of zinc-coated steel mesh, each with its own electric motor, and it ran on two non-rechargeable silver-zinc batteries. The rover is still on the Moon.', 'En 3 salidas el LRV recorrió unos 27,8 km a una velocidad máxima cercana a 13 km/h. Sus ruedas eran de malla de acero galvanizado con zinc, cada una con su propio motor eléctrico, y funcionaba con dos baterías de plata-zinc no recargables. El rover sigue en la Luna.'),
        },
      },
    ],
  },

  spirit: {
    id: 'spirit',
    name: 'Spirit · MER-A',
    body: 'mars',
    mission: tr('Mars Exploration Rover A · Gusev crater · 2004-2010', 'Mars Exploration Rover A · cráter Gusev · 2004-2010'),
    accent: '#3b82f6',
    route: [
      [170, 190],
      [215, 172],
      [250, 190],
      [320, 225],
      [400, 255],
      [480, 280],
      [560, 300],
      [615, 315],
      [650, 290],
      [690, 270],
      [735, 262],
      [770, 290],
      [775, 340],
      [750, 385],
      [735, 425],
      [748, 455],
      [720, 470],
      [700, 448],
      [690, 465],
    ],
    levels: [
      {
        routeIndex: 1,
        title: tr('Bonneville Crater', 'Cráter Bonneville'),
        card: {
          title: tr('A lake that was not there', 'Un lago que no estaba'),
          text: tr('Spirit landed in Gusev crater on January 4, 2004, bouncing inside airbags. Scientists were looking for traces of an ancient lake, but the plain was covered in volcanic basalt, so the rover set off toward the distant hills.', 'Spirit aterrizó en el cráter Gusev el 4 de enero de 2004, rebotando dentro de bolsas de aire. Los científicos buscaban rastros de un antiguo lago, pero la llanura estaba cubierta de basalto volcánico, así que el rover partió hacia las colinas lejanas.'),
        },
      },
      {
        routeIndex: 10,
        title: 'Husband Hill',
        card: {
          title: tr('Climbing a mountain', 'Escalando una montaña'),
          text: tr('Its mission was planned for 90 sols (Martian days), but it kept going for years. In 2005 it reached the top of Husband Hill, in the Columbia Hills, and found rocks altered by water there. "Dust devils" cleaned its solar panels.', 'Su misión estaba planeada para 90 soles (días marcianos), pero siguió activo años. En 2005 llegó a la cima de Husband Hill, en las Columbia Hills, y allí encontró rocas alteradas por agua. Los "remolinos de polvo" limpiaban sus paneles solares.'),
        },
      },
      {
        routeIndex: 15,
        title: 'Home Plate',
        card: {
          title: tr('Silica and hot water', 'Sílice y agua caliente'),
          text: tr('In 2006 its front right wheel got stuck and it started driving backward, dragging it. That furrow revealed soil of almost pure silica near Home Plate! It points to hot springs or hot steam in Mars\' past.', 'En 2006 se atascó su rueda delantera derecha y empezó a conducir marcha atrás, arrastrándola. ¡Ese surco reveló un suelo casi de sílice pura cerca de Home Plate! Indica fuentes termales o vapor de agua caliente en el pasado de Marte.'),
        },
      },
      {
        routeIndex: 18,
        title: 'Troy',
        card: {
          title: tr('Trapped at Troy', 'Atrapado en Troy'),
          text: tr('In 2009 its wheels sank into soft sand at a place called Troy and it could not get out. It kept studying as a stationary station until its last contact in March 2010, after traveling about 7.73 km.', 'En 2009 sus ruedas se hundieron en arena blanda en un lugar llamado Troy y ya no pudo salir. Siguió estudiando como estación fija hasta su último contacto en marzo de 2010, tras recorrer unos 7,73 km.'),
        },
      },
    ],
  },

  opportunity: {
    id: 'opportunity',
    name: 'Opportunity · MER-B',
    body: 'mars',
    mission: 'Mars Exploration Rover B · Meridiani Planum · 2004-2018',
    accent: '#f59e0b',
    route: [
      [150, 165],
      [170, 169],
      [232, 179],
      [245, 210],
      [252, 251],
      [262, 292],
      [272, 333],
      [290, 358],
      [340, 345],
      [410, 333],
      [480, 323],
      [550, 315],
      [620, 310],
      [668, 302],
      [680, 333],
      [686, 370],
      [690, 411],
      [695, 448],
      [702, 481],
      [712, 518],
    ],
    levels: [
      {
        routeIndex: 1,
        title: tr('Eagle Crater', 'Cráter Eagle'),
        card: {
          title: tr('A hole in one', 'Un hoyo en uno'),
          text: tr('Opportunity landed on January 25, 2004 in Meridiani Planum and rolled right into the small Eagle crater. There it discovered the "blueberries", small hematite spheres that form in water: proof that this place was once wet.', 'Opportunity aterrizó el 25 de enero de 2004 en Meridiani Planum y rodó justo dentro del pequeño cráter Eagle. Allí descubrió las "blueberries", pequeñas esferas de hematita que se forman con agua: la prueba de que este lugar estuvo húmedo.'),
        },
      },
      {
        routeIndex: 3,
        title: tr('Endurance Crater', 'Cráter Endurance'),
        card: {
          title: tr('Rock layers like a book', 'Capas de roca como libro'),
          text: tr('In Endurance crater, about 130 m across, it drove down the wall to read layers of sedimentary rock. Each layer keeps the story of an ancient Mars with acidic, salty water soaking the ground.', 'En el cráter Endurance, de unos 130 m, bajó por la pared para leer capas de roca sedimentaria. Cada capa guarda la historia de un Marte antiguo con agua ácida y salada que empapaba el suelo.'),
        },
      },
      {
        routeIndex: 7,
        title: tr('Victoria Crater', 'Cráter Victoria'),
        card: {
          title: tr('Two years at Victoria', 'Dos años en Victoria'),
          text: tr('After a long trip south it reached Victoria crater, about 750 m wide, in 2006. It drove around it photographing its capes and bays, and survived a huge dust storm in 2007 before going inside to study it.', 'Tras un largo viaje al sur llegó en 2006 al cráter Victoria, de unos 750 m de ancho. Lo rodeó fotografiando sus cabos y bahías, y sobrevivió a una gran tormenta de polvo en 2007 antes de entrar a estudiarlo.'),
        },
      },
      {
        routeIndex: 19,
        title: 'Endeavour',
        card: {
          title: tr('The Martian marathon', 'El maratón marciano'),
          text: tr('In 2011 it reached the huge Endeavour crater and found veins of gypsum left by water. Planned for 90 sols, it worked for more than 14 years and traveled 45.16 km, a record beyond Earth, until a global dust storm shut it down in 2018.', 'En 2011 alcanzó el enorme cráter Endeavour y encontró vetas de yeso depositadas por agua. Planeado para 90 soles, trabajó más de 14 años y recorrió 45,16 km, récord fuera de la Tierra, hasta que una tormenta de polvo global lo apagó en 2018.'),
        },
      },
    ],
  },
};

export const ROBOT_ORDER: RobotId[] = ['lrv', 'spirit', 'opportunity'];

export const STONES: StoneFact[] = [
  { text: tr('They found the Genesis Rock at Spur crater', 'Encontraron la Roca Génesis en el cráter Spur'), robot: 'lrv' },
  { text: tr('It traveled folded on the side of the lunar module Falcon', 'Viajó plegado en el costado del módulo lunar Falcon'), robot: 'lrv' },
  { text: tr('Its stuck wheel uncovered silica soil at Home Plate', 'Su rueda atascada destapó suelo de sílice en Home Plate'), robot: 'spirit' },
  { text: tr('It got trapped in the sand at Troy in 2009', 'Quedó atrapado en la arena de Troy en 2009'), robot: 'spirit' },
  { text: tr('It discovered the hematite "blueberries" in Eagle crater', 'Descubrió las "blueberries" de hematita en el cráter Eagle'), robot: 'opportunity' },
  { text: tr('It traveled 45.16 km: a record beyond Earth', 'Recorrió 45,16 km: récord fuera de la Tierra'), robot: 'opportunity' },
];
