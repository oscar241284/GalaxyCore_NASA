import type { RobotId } from '../types';
import { tr } from '../i18n';

export type World = 'moon' | 'mars';
export type Status = 'operativo' | 'parcial' | 'inactivo';

export interface RecoveryQ {
  q: string;
  options: string[];
  correct: number;
  why: string;
}

export interface Explorer {
  id: string;
  world: World;
  name: string;
  tagline: string;
  agency: string;
  guest?: boolean;
  year: number;
  arrival: string;
  site: string;
  lat: number;
  lon: number;
  status: Status;
  statusNote: string;
  color: string;
  moments: { born: string; trip: string; mission: string; last: string; legacy: string };
  file: { label: string; value: string }[];
  discoveries: string[];
  robot?: RobotId;
  recovery: RecoveryQ[];
}

export const STATUS_INFO: Record<Status, { label: string; color: string }> = {
  operativo: { label: tr('Still working', 'Sigue funcionando'), color: '#22c55e' },
  parcial: { label: tr('One part still in use', 'Una parte sigue en uso'), color: '#f59e0b' },
  inactivo: { label: tr('Out of service', 'Fuera de servicio'), color: '#94a3b8' },
};

export const MOMENTS: { key: keyof Explorer['moments']; title: string; q: string }[] = [
  { key: 'born', title: tr('Birth', 'Nacimiento'), q: tr('Why was I built?', '¿Por qué me construyeron?') },
  { key: 'trip', title: tr('Journey', 'Viaje'), q: tr('How did I get there?', '¿Cómo llegué?') },
  { key: 'mission', title: tr('Mission', 'Misión'), q: tr('What did I do and discover?', '¿Qué hice y qué descubrí?') },
  { key: 'last', title: tr('Last day', 'Último día'), q: tr('How did my mission end?', '¿Cómo terminó mi misión?') },
  { key: 'legacy', title: tr('Legacy', 'Legado'), q: tr('What did humanity learn?', '¿Qué aprendió la humanidad?') },
];

export const EXPLORERS: Explorer[] = [
  {
    id: 'eagle',
    world: 'moon',
    name: tr('Eagle Module', 'Módulo Eagle'),
    tagline: tr('Apollo 11 · the first crewed Moon landing', 'Apolo 11 · el primer alunizaje tripulado'),
    agency: 'NASA',
    year: 1969,
    arrival: tr('July 20, 1969', '20 de julio de 1969'),
    site: tr('Sea of Tranquility (Tranquility Base)', 'Mar de la Tranquilidad (Base Tranquilidad)'),
    lat: 0.67,
    lon: 23.47,
    status: 'parcial',
    statusNote: tr('My lower part (the descent stage) stayed on the Moon. The laser mirror they left next to me is still used today.', 'Mi parte de abajo (la etapa de descenso) se quedó en la Luna. El espejo láser que dejaron a mi lado se sigue usando hoy.'),
    color: '#e5e7eb',
    moments: {
      born: tr('I was built to do something no one had ever done: carry two people from orbit down to the surface of the Moon… and bring them back.', 'Me construyeron para hacer algo que nadie había hecho: llevar a dos personas desde la órbita hasta el suelo de la Luna… y traerlas de vuelta.'),
      trip: tr('I traveled inside the Saturn V rocket with Neil Armstrong, Buzz Aldrin and Michael Collins. I separated from the Columbia spacecraft and went down with little fuel and alarms on the computer.', 'Viajé dentro del cohete Saturno V con Neil Armstrong, Buzz Aldrin y Michael Collins. Me separé de la nave Columbia y bajé con poco combustible y alarmas en la computadora.'),
      mission: tr('«The Eagle has landed». Neil and Buzz walked for about two and a half hours: they took photos, collected rocks and left instruments, like a mirror for lasers.', '«El Águila ha aterrizado». Neil y Buzz caminaron unas dos horas y media: tomaron fotos, recogieron rocas y dejaron instrumentos, como un espejo para láseres.'),
      last: tr('My upper part lifted off with the astronauts. My lower part served as a launch pad and stayed on the Moon forever.', 'Mi parte de arriba despegó con los astronautas. Mi parte de abajo sirvió de plataforma de lanzamiento y se quedó para siempre en la Luna.'),
      legacy: tr('I proved that people can reach another world. The rocks they took to Earth taught us what the Moon is made of.', 'Demostré que las personas podemos llegar a otro mundo. Las rocas que llevaron a la Tierra nos enseñaron de qué está hecha la Luna.'),
    },
    file: [
      { label: tr('Mission', 'Misión'), value: tr('Apollo 11', 'Apolo 11') },
      { label: tr('Arrival', 'Llegada'), value: tr('July 20, 1969', '20 de julio de 1969') },
      { label: tr('Site', 'Lugar'), value: tr('Sea of Tranquility', 'Mar de la Tranquilidad') },
      { label: tr('Crew on the Moon', 'Tripulación en la Luna'), value: tr('Neil Armstrong and Buzz Aldrin', 'Neil Armstrong y Buzz Aldrin') },
      { label: tr('Rocks brought back', 'Rocas traídas'), value: tr('about 21.5 kg', 'unos 21,5 kg') },
    ],
    discoveries: [tr('The first Moon rocks brought back by people.', 'Las primeras rocas lunares traídas por personas.'), tr('That it was possible to land, walk and take off from the Moon.', 'Que se podía aterrizar, caminar y despegar desde la Luna.'), tr('The Apollo 11 laser mirror still lets us measure the distance to the Moon.', 'El espejo láser del Apolo 11 todavía permite medir la distancia a la Luna.')],
    recovery: [
      { q: tr('Who am I? I was the first vehicle to carry people to the surface of the Moon.', '¿Quién soy? Fui el primer vehículo en llevar personas a la superficie de la Luna.'), options: [tr('Eagle Module', 'Módulo Eagle'), tr('Lunar Rover (LRV)', 'Rover Lunar (LRV)'), 'Sojourner'], correct: 0, why: tr('Apollo 11\'s Eagle landed on July 20, 1969.', 'El Eagle del Apolo 11 aterrizó el 20 de julio de 1969.') },
      { q: tr('What did they leave next to me that is still used?', '¿Qué dejaron a mi lado que todavía se usa?'), options: [tr('A mirror for lasers', 'Un espejo para láseres'), tr('A lunar car', 'Un auto lunar'), tr('A TV antenna', 'Una antena de TV')], correct: 0, why: tr('Lasers are fired at it from Earth to measure the distance to the Moon.', 'Desde la Tierra le disparan láseres para medir la distancia a la Luna.') },
      { q: tr('Why did my lower part stay on the Moon?', '¿Por qué mi parte de abajo se quedó en la Luna?'), options: [tr('It served as a launch pad for the upper part', 'Sirvió de plataforma para que despegara la parte de arriba'), tr('It broke when landing', 'Se rompió al aterrizar'), tr('They forgot about it', 'Se olvidaron de ella')], correct: 0, why: tr('The ascent stage lifted off using the descent stage as a base.', 'La etapa de ascenso despegó usando la de descenso como base.') },
    ],
  },
  {
    id: 'alsep',
    world: 'moon',
    name: tr('ALSEP Station', 'Estación ALSEP'),
    tagline: tr('Apollo 12 · the lab that listened to the Moon', 'Apolo 12 · el laboratorio que escuchó a la Luna'),
    agency: 'NASA',
    year: 1969,
    arrival: tr('November 19, 1969', '19 de noviembre de 1969'),
    site: tr('Ocean of Storms', 'Océano de las Tormentas'),
    lat: -3.01,
    lon: -23.42,
    status: 'inactivo',
    statusNote: tr('I was switched off from Earth on September 30, 1977, along with the other ALSEP stations.', 'Me apagaron desde la Tierra el 30 de septiembre de 1977, junto con las otras estaciones ALSEP.'),
    color: '#a5b4fc',
    moments: {
      born: tr('I am a group of science instruments. I was created to keep measuring the Moon after the astronauts had left.', 'Soy un grupo de instrumentos científicos. Me crearon para seguir midiendo la Luna cuando los astronautas ya se hubieran ido.'),
      trip: tr('I arrived with Apollo 12. Astronauts Pete Conrad and Alan Bean set me up carefully, connecting each device to my central station and my power source.', 'Llegué con el Apolo 12. Los astronautas Pete Conrad y Alan Bean me instalaron con cuidado, conectando cada aparato a mi central y a mi fuente de energía.'),
      mission: tr('With my seismometer I felt moonquakes and impacts. When they crashed part of the spacecraft onto the Moon, I felt it vibrate for almost an hour, like a bell!', 'Con mi sismómetro sentí temblores lunares e impactos. Cuando hicieron caer una parte de la nave sobre la Luna, ¡la sentí vibrar casi una hora, como una campana!'),
      last: tr('I worked for almost 8 years. In 1977 NASA decided to switch off all the ALSEP stations to save money, and I went silent.', 'Trabajé casi 8 años. En 1977 la NASA decidió apagar todas las estaciones ALSEP para ahorrar dinero, y quedé en silencio.'),
      legacy: tr('Thanks to my data and my sisters\' data, we know the Moon has quakes and what it is like inside.', 'Gracias a mis datos y a los de mis hermanas, sabemos que la Luna tiene temblores y cómo es por dentro.'),
    },
    file: [
      { label: tr('Mission', 'Misión'), value: tr('Apollo 12 (there were ALSEPs on Apollo 12, 14, 15, 16 and 17)', 'Apolo 12 (hubo ALSEP en Apolo 12, 14, 15, 16 y 17)') },
      { label: tr('Arrival', 'Llegada'), value: tr('November 19, 1969', '19 de noviembre de 1969') },
      { label: tr('Site', 'Lugar'), value: tr('Ocean of Storms', 'Océano de las Tormentas') },
      { label: tr('Star instrument', 'Instrumento estrella'), value: tr('Seismometer', 'Sismómetro') },
      { label: tr('Shut down', 'Apagado'), value: tr('September 30, 1977', '30 de septiembre de 1977') },
    ],
    discoveries: [tr('The Moon has «moonquakes».', 'La Luna tiene «lunamotos» (temblores lunares).'), tr('Its interior is very different from Earth\'s.', 'Su interior es muy diferente al de la Tierra.'), tr('It showed how to work with automatic science stations on another world.', 'Mostró cómo trabajar con estaciones científicas automáticas en otro mundo.')],
    recovery: [
      { q: tr('Who am I? I was a set of instruments that kept measuring the Moon without astronauts.', '¿Quién soy? Fui un conjunto de instrumentos que siguió midiendo la Luna sin astronautas.'), options: [tr('ALSEP Station', 'Estación ALSEP'), tr('Eagle Module', 'Módulo Eagle'), 'InSight'], correct: 0, why: tr('ALSEP stands for «Apollo Lunar Surface Experiments Package».', 'ALSEP significa «paquete de experimentos de superficie lunar del Apolo».') },
      { q: tr('What did I feel with my seismometer?', '¿Qué sentí con mi sismómetro?'), options: [tr('Quakes and impacts on the Moon', 'Temblores e impactos en la Luna'), tr('Lunar winds', 'Vientos lunares'), tr('Rain showers', 'Lluvias de agua')], correct: 0, why: tr('It detected moonquakes and impacts: the Moon rang like a bell!', 'Detectó lunamotos e impactos: ¡la Luna vibró como una campana!') },
      { q: tr('Why did my mission end?', '¿Por qué terminó mi misión?'), options: [tr('NASA switched me off in 1977 to save money', 'La NASA me apagó en 1977 para ahorrar'), tr('A meteorite hit me', 'Me cayó un meteorito'), tr('They took me back to Earth', 'Me llevaron de vuelta a la Tierra')], correct: 0, why: tr('On September 30, 1977 all the ALSEPs were switched off.', 'El 30 de septiembre de 1977 se apagaron todas las ALSEP.') },
    ],
  },
  {
    id: 'lrv',
    world: 'moon',
    name: tr('Lunar Rover (LRV)', 'Rover Lunar (LRV)'),
    tagline: tr('Apollo 15 · the first car on the Moon', 'Apolo 15 · el primer auto en la Luna'),
    agency: 'NASA',
    year: 1971,
    arrival: tr('July 30, 1971', '30 de julio de 1971'),
    site: tr('Hadley-Apennine', 'Hadley-Apeninos'),
    lat: 26.13,
    lon: 3.63,
    status: 'inactivo',
    statusNote: tr('I was left parked near the launch site. My batteries are dead.', 'Me quedé estacionado cerca del lugar de despegue. Ya no tengo baterías.'),
    color: '#d1d5db',
    robot: 'lrv',
    moments: {
      born: tr('Walking on the Moon was very tiring. I was built so the astronauts could go farther and carry more tools.', 'Caminar en la Luna cansaba mucho. Me construyeron para que los astronautas pudieran ir más lejos y llevar más herramientas.'),
      trip: tr('I traveled folded like a book on one side of the lunar module Falcon. When we arrived, the astronauts pulled some straps and I unfolded.', 'Viajé plegado como un libro en un costado del módulo lunar Falcon. Al llegar, los astronautas tiraron de unas cintas y me desplegué.'),
      mission: tr('Dave Scott and Jim Irwin drove me about 28 km over three trips, all the way to the edge of a canyon called Hadley Rille. My camera sent video to Earth.', 'Dave Scott y Jim Irwin me manejaron por unos 28 km en tres paseos, hasta el borde de un cañón llamado Hadley Rille. Mi cámara enviaba video a la Tierra.'),
      last: tr('When the mission ended, they left me parked so my camera could film the astronauts\' liftoff. Then I stayed still forever.', 'Cuando terminó la misión, me dejaron estacionado para que mi cámara filmara el despegue de los astronautas. Luego me quedé quieto para siempre.'),
      legacy: tr('I proved that with a vehicle you can explore much more. Today new lunar rovers are designed with what we learned from me in mind.', 'Demostré que con un vehículo se puede explorar mucho más. Hoy se diseñan nuevos rovers lunares pensando en lo que aprendimos conmigo.'),
    },
    file: [
      { label: tr('Mission', 'Misión'), value: tr('Apollo 15', 'Apolo 15') },
      { label: tr('Arrival', 'Llegada'), value: tr('July 30, 1971', '30 de julio de 1971') },
      { label: tr('Site', 'Lugar'), value: tr('Hadley-Apennine', 'Hadley-Apeninos') },
      { label: tr('Distance', 'Distancia'), value: tr('about 28 km', 'unos 28 km') },
      { label: tr('Power', 'Energía'), value: tr('Batteries (non-rechargeable)', 'Baterías (no recargables)') },
    ],
    discoveries: [tr('The astronauts reached faraway places and brought back more samples.', 'Los astronautas llegaron a lugares lejanos y trajeron más muestras.'), tr('The «Genesis Rock», a very old Moon rock, was found there.', 'Allí se encontró la «Roca del Génesis», una roca muy antigua de la Luna.'), tr('Its camera let people on Earth watch the exploration live.', 'Su cámara permitió ver la exploración en vivo desde la Tierra.')],
    recovery: [
      { q: tr('Who am I? I arrived folded up and the astronauts drove me on the Moon.', '¿Quién soy? Llegué plegado y los astronautas me manejaron en la Luna.'), options: [tr('Lunar Rover (LRV)', 'Rover Lunar (LRV)'), tr('ALSEP Station', 'Estación ALSEP'), 'Spirit'], correct: 0, why: tr('The LRV traveled folded on the Apollo 15 lunar module.', 'El LRV viajó plegado en el módulo lunar del Apolo 15.') },
      { q: tr('About how far did I travel?', '¿Cuánto recorrí aproximadamente?'), options: [tr('About 28 km', 'Unos 28 km'), tr('About 2 meters', 'Unos 2 metros'), tr('About 4,000 km', 'Unos 4.000 km')], correct: 0, why: tr('In three trips it traveled about 28 km.', 'En tres paseos recorrió unos 28 km.') },
      { q: tr('Why did I stay on the Moon?', '¿Por qué me quedé en la Luna?'), options: [tr('It could not be brought back: it was heavy and they had to lift off light', 'No se podía traer de vuelta: pesaba mucho y había que despegar ligeros'), tr('I hid in a crater', 'Me escondí en un cráter'), tr('I got a flat tire', 'Se me pinchó una rueda')], correct: 0, why: tr('Only the upper part of the module lifted off, with the astronauts and the samples.', 'Solo despegaba la parte de arriba del módulo, con los astronautas y las muestras.') },
    ],
  },
  {
    id: 'sojourner',
    world: 'mars',
    name: 'Sojourner',
    tagline: tr('Mars Pathfinder · the first rover on Mars', 'Mars Pathfinder · el primer rover en Marte'),
    agency: 'NASA',
    year: 1997,
    arrival: tr('July 4, 1997', '4 de julio de 1997'),
    site: 'Ares Vallis',
    lat: 19.13,
    lon: -33.22,
    status: 'inactivo',
    statusNote: tr('Communication with my base lander was lost on September 27, 1997.', 'La comunicación con mi nave base se perdió el 27 de septiembre de 1997.'),
    color: '#fde68a',
    moments: {
      born: tr('I am small, about the size of a microwave oven. I was built to test whether a robot on wheels could explore Mars.', 'Soy pequeño, del tamaño de un horno de microondas. Me construyeron para probar si un robot con ruedas podía explorar Marte.'),
      trip: tr('I traveled with the Mars Pathfinder spacecraft. I landed bouncing inside airbags and rolled down a ramp to the surface.', 'Viajé con la nave Mars Pathfinder. Aterricé rebotando dentro de bolsas de aire y bajé por una rampa a la superficie.'),
      mission: tr('I studied rocks with funny names, like «Barnacle Bill» and «Yogi». I traveled about 100 meters around my base lander.', 'Estudié rocas con nombres divertidos, como «Barnacle Bill» y «Yogi». Recorrí unos 100 metros alrededor de mi nave base.'),
      last: tr('My mission was supposed to last 7 days… and I worked for almost 3 months! One day my base lander stopped communicating and I could no longer send messages to Earth.', 'Mi misión iba a durar 7 días… ¡y trabajé casi 3 meses! Un día mi nave base dejó de comunicarse y ya no pude enviar mensajes a la Tierra.'),
      legacy: tr('I was small, but I paved the way. Thanks to me, NASA later sent Spirit, Opportunity, Curiosity and Perseverance.', 'Fui pequeño, pero abrí el camino. Gracias a mí, la NASA envió después a Spirit, Opportunity, Curiosity y Perseverance.'),
    },
    file: [
      { label: tr('Mission', 'Misión'), value: 'Mars Pathfinder' },
      { label: tr('Arrival', 'Llegada'), value: tr('July 4, 1997', '4 de julio de 1997') },
      { label: tr('Site', 'Lugar'), value: 'Ares Vallis' },
      { label: tr('Size', 'Tamaño'), value: tr('like a microwave oven', 'como un horno de microondas') },
      { label: tr('Distance traveled', 'Recorrido'), value: tr('about 100 meters', 'unos 100 metros') },
    ],
    discoveries: [tr('First wheeled rover on Mars.', 'Primer rover con ruedas en Marte.'), tr('Rocks suggesting there were ancient floods in that area.', 'Rocas que sugieren que en esa zona hubo inundaciones antiguas.'), tr('It proved landing with airbags works.', 'Demostró el aterrizaje con bolsas de aire.')],
    recovery: [
      { q: tr('Who am I? The first rover on Mars, the size of a microwave.', '¿Quién soy? El primer rover en Marte, del tamaño de un microondas.'), options: ['Sojourner', 'Spirit', 'InSight'], correct: 0, why: tr('Sojourner arrived in 1997 with Mars Pathfinder.', 'Sojourner llegó en 1997 con Mars Pathfinder.') },
      { q: tr('How long was my mission supposed to last?', '¿Cuánto iba a durar mi misión?'), options: [tr('7 days', '7 días'), tr('15 years', '15 años'), tr('1 hour', '1 hora')], correct: 0, why: tr('It was planned for 7 days and lasted almost 3 months.', 'Estaba planeada para 7 días y duró casi 3 meses.') },
      { q: tr('Why did my mission end?', '¿Por qué terminó mi misión?'), options: [tr('Communication with my base lander was lost', 'Se perdió la comunicación con mi nave base'), tr('I fell into a volcano', 'Me caí en un volcán'), tr('They took me to another planet', 'Me llevaron a otro planeta')], correct: 0, why: tr('Sojourner talked to Earth through the base lander.', 'Sojourner hablaba con la Tierra a través de la nave base.') },
    ],
  },
  {
    id: 'spirit',
    world: 'mars',
    name: 'Spirit',
    tagline: tr('MER-A · the water detective', 'MER-A · el detective del agua'),
    agency: 'NASA',
    year: 2004,
    arrival: tr('January 4, 2004', '4 de enero de 2004'),
    site: tr('Gusev Crater', 'Cráter Gusev'),
    lat: -14.57,
    lon: 175.47,
    status: 'inactivo',
    statusNote: tr('I got trapped in sand in 2009. My last communication was on March 22, 2010.', 'Quedé atrapado en la arena en 2009. Mi última comunicación fue el 22 de marzo de 2010.'),
    color: '#93c5fd',
    robot: 'spirit',
    moments: {
      born: tr('I was built along with my twin Opportunity to look for clues of ancient water in the rocks of Mars.', 'Me construyeron con mi gemelo Opportunity para buscar pistas de agua antigua en las rocas de Marte.'),
      trip: tr('I crossed space for 7 months. I slowed down with a heat shield, parachute and rockets, and bouncing on airbags I reached Gusev crater.', 'Atravesé el espacio por 7 meses. Frené con escudo de calor, paracaídas y cohetes, y rebotando en bolsas de aire llegué al cráter Gusev.'),
      mission: tr('I climbed the Columbia Hills. In 2006 one of my wheels jammed and they drove me in reverse. Dragging it, I uncovered white silica soil, a clue of hot water!', 'Subí a las colinas Columbia. En 2006 se trabó una de mis ruedas y me manejaron de reversa. ¡Al arrastrarla destapé suelo blanco de sílice, una pista de agua caliente!'),
      last: tr('In 2009 my wheels sank into soft sand at a place called Troy. I could not get out, and the winter cold left me without power.', 'En 2009 mis ruedas se hundieron en arena blanda, en un lugar llamado Troy. No pude salir, y el frío del invierno me dejó sin energía.'),
      legacy: tr('My mission was supposed to last 90 days and I worked for more than 6 years. I showed that Mars had water, even hot water.', 'Mi misión iba a durar 90 días y trabajé más de 6 años. Mostré que en Marte hubo agua, incluso caliente.'),
    },
    file: [
      { label: tr('Mission', 'Misión'), value: 'Mars Exploration Rover A' },
      { label: tr('Arrival', 'Llegada'), value: tr('January 4, 2004', '4 de enero de 2004') },
      { label: tr('Site', 'Lugar'), value: tr('Gusev Crater', 'Cráter Gusev') },
      { label: tr('Distance traveled', 'Recorrido'), value: tr('about 7.7 km', 'unos 7,7 km') },
      { label: tr('Plan vs. reality', 'Plan vs. realidad'), value: tr('90 days → more than 6 years', '90 días → más de 6 años') },
    ],
    discoveries: [tr('Minerals that form with water: goethite, carbonates and silica.', 'Minerales que se forman con agua: goetita, carbonatos y sílice.'), tr('Signs of ancient hot springs.', 'Indicios de antiguas fuentes de agua caliente.'), tr('Movies of dust devils taken from the surface of Mars.', 'Películas de remolinos de polvo tomadas desde el suelo de Marte.')],
    recovery: [
      { q: tr('Who am I? They drove me in reverse because one of my wheels jammed.', '¿Quién soy? Me manejaron de reversa porque se trabó una de mis ruedas.'), options: ['Spirit', 'Sojourner', 'Opportunity'], correct: 0, why: tr('From 2006 on, Spirit moved forward dragging its front right wheel.', 'Desde 2006, Spirit avanzaba arrastrando su rueda delantera derecha.') },
      { q: tr('What did I uncover by dragging my wheel?', '¿Qué destapé al arrastrar mi rueda?'), options: [tr('White silica soil', 'Suelo blanco de sílice'), tr('A frozen lake', 'Un lago congelado'), tr('A cave', 'Una cueva')], correct: 0, why: tr('Silica shows there was hot water.', 'La sílice indica que hubo agua caliente.') },
      { q: tr('Why did my mission end?', '¿Por qué terminó mi misión?'), options: [tr('I got stuck in sand and ran out of power in winter', 'Quedé atrapado en arena y me quedé sin energía en invierno'), tr('A storm blew me away', 'Una tormenta me llevó volando'), tr('They switched me off to save money', 'Me apagaron para ahorrar')], correct: 0, why: tr('It got stuck at Troy in 2009; its last signal was in 2010.', 'Quedó atrapado en Troy en 2009; su última señal fue en 2010.') },
    ],
  },
  {
    id: 'opportunity',
    world: 'mars',
    name: 'Opportunity',
    tagline: tr('MER-B · the 15-year marathon', 'MER-B · la maratón de 15 años'),
    agency: 'NASA',
    year: 2004,
    arrival: tr('January 25, 2004', '25 de enero de 2004'),
    site: 'Meridiani Planum',
    lat: -1.95,
    lon: -5.53,
    status: 'inactivo',
    statusNote: tr('My last signal arrived on June 10, 2018, during a dust storm that covered all of Mars.', 'Mi última señal llegó el 10 de junio de 2018, durante una tormenta de polvo que cubrió todo Marte.'),
    color: '#fdba74',
    robot: 'opportunity',
    moments: {
      born: tr('I am Spirit\'s twin. I was sent to the other side of Mars, where hematite, a mineral that usually forms in water, had been spotted from orbit.', 'Soy el gemelo de Spirit. Me enviaron al otro lado de Marte, donde desde la órbita se había visto hematita, un mineral que suele formarse con agua.'),
      trip: tr('Bouncing on my airbags, I rolled right into a tiny crater called Eagle: a «hole in one»!', 'Rebotando en mis bolsas de aire, rodé y quedé justo dentro de un cráter pequeñito llamado Eagle: ¡un «hoyo en uno»!'),
      mission: tr('I found layered rocks and little hematite balls. I traveled from crater to crater: Endurance, Victoria and Endeavour. In 2015 I completed the distance of a marathon.', 'Encontré rocas en capas y bolitas de hematita. Viajé de cráter en cráter: Endurance, Victoria y Endeavour. En 2015 completé la distancia de una maratón.'),
      last: tr('In 2018 a dust storm blocked the Sun and I ran out of power. NASA sent me more than 1,000 commands, but I could not answer. My mission ended on February 13, 2019.', 'En 2018 una tormenta de polvo tapó el Sol y me quedé sin energía. La NASA me envió más de 1000 órdenes, pero no pude responder. Mi misión terminó el 13 de febrero de 2019.'),
      legacy: tr('I was supposed to work for 90 days and I worked for almost 15 years, traveling 45 km. I proved that Mars had water and paved the way for new explorers.', 'Iba a trabajar 90 días y trabajé casi 15 años, recorriendo 45 km. Demostré que Marte tuvo agua y abrí el camino a nuevos exploradores.'),
    },
    file: [
      { label: tr('Mission', 'Misión'), value: 'Mars Exploration Rover B' },
      { label: tr('Arrival', 'Llegada'), value: tr('January 25, 2004', '25 de enero de 2004') },
      { label: tr('Site', 'Lugar'), value: 'Meridiani Planum' },
      { label: tr('Distance traveled', 'Recorrido'), value: tr('about 45 km', 'unos 45 km') },
      { label: tr('Plan vs. reality', 'Plan vs. realidad'), value: tr('90 days → almost 15 years', '90 días → casi 15 años') },
    ],
    discoveries: [tr('Layered rocks and hematite «blueberries»: evidence of ancient water.', 'Rocas en capas y «blueberries» de hematita: pruebas de agua antigua.'), tr('Gypsum veins, a mineral that forms with water.', 'Vetas de yeso, un mineral que se forma con agua.'), tr('Distance record on another world for many years.', 'Récord de distancia recorrida en otro mundo por muchos años.')],
    recovery: [
      { q: tr('Who am I? I landed inside a tiny crater: a «hole in one».', '¿Quién soy? Aterricé dentro de un cráter pequeñito: un «hoyo en uno».'), options: ['Opportunity', 'Spirit', 'InSight'], correct: 0, why: tr('Opportunity rolled into Eagle crater in 2004.', 'Opportunity rodó dentro del cráter Eagle en 2004.') },
      { q: tr('What distance did I complete in 2015?', '¿Qué distancia completé en 2015?'), options: [tr('A marathon (about 42 km)', 'Una maratón (unos 42 km)'), tr('100 meters', '100 metros'), tr('1,000 km', '1.000 km')], correct: 0, why: tr('In 2015 it passed the 42 km of a marathon; in the end it reached 45 km.', 'En 2015 superó los 42 km de una maratón; al final llegó a 45 km.') },
      { q: tr('Why did my mission end?', '¿Por qué terminó mi misión?'), options: [tr('A dust storm blocked the Sun and I ran out of power', 'Una tormenta de polvo tapó el Sol y me quedé sin energía'), tr('I ran out of gas', 'Se me acabó la gasolina'), tr('I crashed into Spirit', 'Choqué con Spirit')], correct: 0, why: tr('The 2018 storm left its solar panels without light.', 'La tormenta de 2018 dejó a sus paneles solares sin luz.') },
    ],
  },
  {
    id: 'insight',
    world: 'mars',
    name: 'InSight',
    tagline: tr('The one that listened to the heart of Mars', 'El que escuchó el corazón de Marte'),
    agency: 'NASA',
    year: 2018,
    arrival: tr('November 26, 2018', '26 de noviembre de 2018'),
    site: 'Elysium Planitia',
    lat: 4.5,
    lon: 135.62,
    status: 'inactivo',
    statusNote: tr('Dust covered my solar panels. NASA declared my mission over on December 21, 2022.', 'El polvo cubrió mis paneles solares. La NASA dio por terminada mi misión el 21 de diciembre de 2022.'),
    color: '#c4b5fd',
    moments: {
      born: tr('I have no wheels: I am a stationary lander. I was built to study the inside of Mars, like a doctor listening to a heartbeat.', 'No tengo ruedas: soy una estación fija. Me construyeron para estudiar el interior de Marte, como un médico que escucha el corazón.'),
      trip: tr('I traveled for about 6 months. I landed with a parachute and rockets on a very flat, safe plain, perfect for listening.', 'Viajé unos 6 meses. Aterricé con paracaídas y cohetes sobre una llanura muy plana y segura, perfecta para escuchar.'),
      mission: tr('With my arm I placed a seismometer on the ground. I felt more than 1,300 «marsquakes». My «mole» tried to dig to measure heat, but the soil would not let it.', 'Con mi brazo coloqué un sismómetro en el suelo. Sentí más de 1.300 «martemotos». Mi «topo» intentó cavar para medir el calor, pero el suelo no lo dejó.'),
      last: tr('Dust kept piling up on my solar panels and every day I had less power. In December 2022 I sent my last message.', 'El polvo se fue acumulando en mis paneles solares y cada día tenía menos energía. En diciembre de 2022 envié mi último mensaje.'),
      legacy: tr('Thanks to me we know what Mars is like inside: the size of its core, its mantle and its crust.', 'Gracias a mí sabemos cómo es Marte por dentro: el tamaño de su núcleo, su manto y su corteza.'),
    },
    file: [
      { label: tr('Mission', 'Misión'), value: 'InSight' },
      { label: tr('Arrival', 'Llegada'), value: tr('November 26, 2018', '26 de noviembre de 2018') },
      { label: tr('Site', 'Lugar'), value: 'Elysium Planitia' },
      { label: tr('Type', 'Tipo'), value: tr('Stationary lander (no wheels)', 'Estación fija (sin ruedas)') },
      { label: tr('Marsquakes detected', 'Martemotos detectados'), value: tr('more than 1,300', 'más de 1.300') },
    ],
    discoveries: [tr('Mars has quakes («marsquakes»).', 'Marte tiene temblores («martemotos»).'), tr('The size of Mars\' core.', 'El tamaño del núcleo de Marte.'), tr('The layers inside the planet: crust, mantle and core.', 'Las capas del interior del planeta: corteza, manto y núcleo.')],
    recovery: [
      { q: tr('Who am I? I had no wheels and I listened to the quakes of Mars.', '¿Quién soy? No tenía ruedas y escuché los temblores de Marte.'), options: ['InSight', 'Sojourner', tr('ALSEP Station', 'Estación ALSEP')], correct: 0, why: tr('InSight was a stationary lander with a seismometer.', 'InSight fue una estación fija con un sismómetro.') },
      { q: tr('How many marsquakes did I feel?', '¿Cuántos martemotos sentí?'), options: [tr('More than 1,300', 'Más de 1.300'), tr('None', 'Ninguno'), tr('Only 3', 'Solo 3')], correct: 0, why: tr('It detected more than 1,300 quakes on Mars.', 'Detectó más de 1.300 temblores en Marte.') },
      { q: tr('Why did my mission end?', '¿Por qué terminó mi misión?'), options: [tr('Dust covered my solar panels', 'El polvo cubrió mis paneles solares'), tr('I fell off a cliff', 'Me caí por un acantilado'), tr('I froze at the pole', 'Me congelé en el polo')], correct: 0, why: tr('With dirty panels it no longer had enough power.', 'Con los paneles sucios ya no tenía energía suficiente.') },
    ],
  },
];

const KEY = 'galaxycore:ghosts';
export function getRecovered(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}
export function markRecovered(id: string): void {
  const s = getRecovered();
  s.add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...s]));
  } catch {
  }
}
