import type { RobotData, RobotId, StoneFact } from '../types';

/**
 * Datos educativos de los cuatro robots. Las rutas están en el viewBox 0..1000 x 0..600
 * y coinciden con el arte de `src/ui/mapArt.ts` (aterrizaje = primer punto).
 */
export const ROBOTS: Record<RobotId, RobotData> = {
  lrv: {
    id: 'lrv',
    name: 'LRV · Apollo 15',
    body: 'moon',
    mission: 'Apollo 15 · Hadley-Apennine · julio-agosto 1971',
    accent: '#e5e7eb',
    // Módulo lunar Falcon (520,290) → EVA1 al sur (Elbow, St. George) → EVA2 al frente
    // de los Apeninos (Spur) → EVA3 al oeste, borde de Hadley Rille.
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
          title: 'El primer coche en la Luna',
          text: 'El 31 de julio de 1971, David Scott y James Irwin desplegaron el LRV, que viajaba plegado en un costado del módulo lunar Falcon. En su primera salida condujeron hasta Elbow, una curva del valle Hadley Rille, aunque la dirección delantera no funcionaba y solo giraban las ruedas traseras.',
        },
      },
      {
        routeIndex: 10,
        title: 'Spur',
        card: {
          title: 'La Roca Génesis',
          text: 'En la segunda salida subieron por la ladera del monte Hadley Delta hasta el cráter Spur. Allí encontraron la "Roca Génesis", una anortosita de unos 4.000 millones de años que ayuda a entender cómo se formó la corteza lunar.',
        },
      },
      {
        routeIndex: 15,
        title: 'Hadley Rille',
        card: {
          title: 'Al borde del gran canal',
          text: 'En la tercera salida llegaron al borde de Hadley Rille, un canal sinuoso de unos 1,5 km de ancho excavado por antigua lava. Fotografiaron sus paredes y tomaron muestras de basalto de los antiguos mares de lava.',
        },
      },
      {
        routeIndex: 19,
        title: 'Regreso al Falcon',
        card: {
          title: '27,8 km sobre ruedas de malla',
          text: 'En 3 salidas el LRV recorrió unos 27,8 km a una velocidad máxima cercana a 13 km/h. Sus ruedas eran de malla de acero galvanizado con zinc, cada una con su propio motor eléctrico, y funcionaba con dos baterías de plata-zinc no recargables. El rover sigue en la Luna.',
        },
      },
    ],
  },

  lunokhod2: {
    id: 'lunokhod2',
    name: 'Lunojod 2',
    body: 'moon',
    mission: 'Luna 21 · URSS · cráter Le Monnier · enero-mayo 1973',
    accent: '#ef4444',
    // Aterrizaje dentro de Le Monnier → al sur hacia las colinas del borde (Taurus)
    // → regreso → al este hasta la falla Fossa Recta y a lo largo de ella.
    route: [
      [300, 330],
      [345, 362],
      [395, 405],
      [440, 450],
      [490, 482],
      [545, 470],
      [560, 420],
      [530, 370],
      [560, 320],
      [620, 300],
      [690, 300],
      [748, 322],
      [770, 368],
      [790, 330],
      [800, 280],
      [805, 230],
      [812, 180],
      [818, 140],
    ],
    levels: [
      {
        routeIndex: 1,
        title: 'Rampa de Luna 21',
        card: {
          title: 'Un robot conducido desde la Tierra',
          text: 'Lunojod 2 llegó a bordo de la sonda soviética Luna 21 el 15 de enero de 1973 y bajó por una rampa al interior del cráter Le Monnier. Un equipo en la Tierra lo conducía mirando sus cámaras, con unos segundos de retraso por la distancia.',
        },
      },
      {
        routeIndex: 5,
        title: 'Colinas del sur',
        card: {
          title: 'Energía del Sol y del polonio',
          text: 'De día abría su tapa circular, cubierta de células solares, para cargar las baterías. En la noche lunar, de unos 14 días terrestres, la cerraba y se mantenía caliente gracias a un calentador de polonio-210 radiactivo.',
        },
      },
      {
        routeIndex: 12,
        title: 'Fossa Recta',
        card: {
          title: 'Explorando una falla',
          text: 'Lunojod 2 recorrió la Fossa Recta, una larga grieta tectónica cerca del borde de Le Monnier. Midió el suelo, tomó miles de fotos y panorámicas, y llevaba un retrorreflector láser que todavía se usa para medir la distancia Tierra-Luna.',
        },
      },
      {
        routeIndex: 17,
        title: 'Último trayecto',
        card: {
          title: 'Récord de distancia',
          text: 'En unos 4 meses recorrió cerca de 39 km, récord de distancia de un vehículo fuera de la Tierra hasta que Opportunity lo superó en 2014. En mayo de 1973 se cubrió de polvo lunar al rozar un cráter, se sobrecalentó y dejó de funcionar.',
        },
      },
    ],
  },

  spirit: {
    id: 'spirit',
    name: 'Spirit · MER-A',
    body: 'mars',
    mission: 'Mars Exploration Rover A · cráter Gusev · 2004-2010',
    accent: '#3b82f6',
    // Aterrizaje en la llanura de Gusev → cráter Bonneville → sureste hasta Columbia
    // Hills → cima de Husband Hill → bajada a Home Plate → atrapado en Troy.
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
        title: 'Cráter Bonneville',
        card: {
          title: 'Un lago que no estaba',
          text: 'Spirit aterrizó en el cráter Gusev el 4 de enero de 2004, rebotando dentro de bolsas de aire. Los científicos buscaban rastros de un antiguo lago, pero la llanura estaba cubierta de basalto volcánico, así que el rover partió hacia las colinas lejanas.',
        },
      },
      {
        routeIndex: 10,
        title: 'Husband Hill',
        card: {
          title: 'Escalando una montaña',
          text: 'Su misión estaba planeada para 90 soles (días marcianos), pero siguió activo años. En 2005 llegó a la cima de Husband Hill, en las Columbia Hills, y allí encontró rocas alteradas por agua. Los "remolinos de polvo" limpiaban sus paneles solares.',
        },
      },
      {
        routeIndex: 15,
        title: 'Home Plate',
        card: {
          title: 'Sílice y agua caliente',
          text: 'En 2006 se atascó su rueda delantera derecha y empezó a conducir marcha atrás, arrastrándola. ¡Ese surco reveló un suelo casi de sílice pura cerca de Home Plate! Indica fuentes termales o vapor de agua caliente en el pasado de Marte.',
        },
      },
      {
        routeIndex: 18,
        title: 'Troy',
        card: {
          title: 'Atrapado en Troy',
          text: 'En 2009 sus ruedas se hundieron en arena blanda en un lugar llamado Troy y ya no pudo salir. Siguió estudiando como estación fija hasta su último contacto en marzo de 2010, tras recorrer unos 7,73 km.',
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
    // Cráter Eagle → Endurance → largo viaje al sur hasta Victoria → sureste hasta el
    // borde de Endeavour (Cabo York) → a lo largo del borde hasta Perseverance Valley.
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
        title: 'Cráter Eagle',
        card: {
          title: 'Un hoyo en uno',
          text: 'Opportunity aterrizó el 25 de enero de 2004 en Meridiani Planum y rodó justo dentro del pequeño cráter Eagle. Allí descubrió las "blueberries", pequeñas esferas de hematita que se forman con agua: la prueba de que este lugar estuvo húmedo.',
        },
      },
      {
        routeIndex: 3,
        title: 'Cráter Endurance',
        card: {
          title: 'Capas de roca como libro',
          text: 'En el cráter Endurance, de unos 130 m, bajó por la pared para leer capas de roca sedimentaria. Cada capa guarda la historia de un Marte antiguo con agua ácida y salada que empapaba el suelo.',
        },
      },
      {
        routeIndex: 7,
        title: 'Cráter Victoria',
        card: {
          title: 'Dos años en Victoria',
          text: 'Tras un largo viaje al sur llegó en 2006 al cráter Victoria, de unos 750 m de ancho. Lo rodeó fotografiando sus cabos y bahías, y sobrevivió a una gran tormenta de polvo en 2007 antes de entrar a estudiarlo.',
        },
      },
      {
        routeIndex: 19,
        title: 'Endeavour',
        card: {
          title: 'El maratón marciano',
          text: 'En 2011 alcanzó el enorme cráter Endeavour y encontró vetas de yeso depositadas por agua. Planeado para 90 soles, trabajó más de 14 años y recorrió 45,16 km, récord fuera de la Tierra, hasta que una tormenta de polvo global lo apagó en 2018.',
        },
      },
    ],
  },
};

export const ROBOT_ORDER: RobotId[] = ['lrv', 'lunokhod2', 'spirit', 'opportunity'];

export const STONES: StoneFact[] = [
  { text: 'Encontraron la Roca Génesis en el cráter Spur', robot: 'lrv' },
  { text: 'Viajó plegado en el costado del módulo lunar Falcon', robot: 'lrv' },
  { text: 'Bajó de la sonda Luna 21 al cráter Le Monnier', robot: 'lunokhod2' },
  { text: 'Se calentaba de noche con polonio-210', robot: 'lunokhod2' },
  { text: 'Su rueda atascada destapó suelo de sílice en Home Plate', robot: 'spirit' },
  { text: 'Quedó atrapado en la arena de Troy en 2009', robot: 'spirit' },
  { text: 'Descubrió las "blueberries" de hematita en el cráter Eagle', robot: 'opportunity' },
  { text: 'Recorrió 45,16 km: récord fuera de la Tierra', robot: 'opportunity' },
];
