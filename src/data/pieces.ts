import type { RobotId } from '../types';

/** Nombre y dato curioso de cada pieza (se muestra al colocarla en el armado). */
export interface PieceInfo {
  name: string;
  fact: string;
}

const MER: Record<string, PieceInfo> = {
  body: {
    name: 'Caja electrónica',
    fact: 'Guarda la computadora y las baterías. Tiene calentadores porque las noches de Marte bajan a unos -100 °C.',
  },
  wheelsLeft: {
    name: 'Ruedas',
    fact: 'Seis ruedas con suspensión "balancín-bogie": le permite pasar sobre rocas sin volcarse.',
  },
  wheelsRight: {
    name: 'Ruedas',
    fact: 'Seis ruedas con suspensión "balancín-bogie": le permite pasar sobre rocas sin volcarse.',
  },
  solarDeck: {
    name: 'Paneles solares',
    fact: 'Le dan energía con la luz del Sol. ¡A veces los remolinos de viento marciano les quitaban el polvo!',
  },
  mast: {
    name: 'Mástil con cámaras',
    fact: 'Sus cámaras están a la altura de los ojos de una persona, así vemos Marte como si estuviéramos allí.',
  },
};

export const PIECE_INFO: Record<RobotId, Record<string, PieceInfo>> = {
  lrv: {
    chassis: {
      name: 'Chasis y mandos',
      fact: 'El chasis de aluminio viajó plegado dentro del módulo lunar. Se manejaba con una palanca en forma de T.',
    },
    wheelsLeft: {
      name: 'Ruedas',
      fact: 'Ruedas de malla de alambre de acero: no necesitaban aire, ¡y en la Luna no hay aire!',
    },
    wheelsRight: {
      name: 'Ruedas',
      fact: 'Ruedas de malla de alambre de acero: no necesitaban aire, ¡y en la Luna no hay aire!',
    },
    seats: {
      name: 'Asientos',
      fact: 'Dos asientos plegables con cinturones para los astronautas David Scott y James Irwin.',
    },
    comms: {
      name: 'Antena',
      fact: 'Su antena en forma de paraguas enviaba video en color desde la Luna hasta la Tierra.',
    },
  },
  lunokhod2: {
    body: {
      name: 'Cuerpo sellado',
      fact: 'Una "tina" cerrada que protegía los aparatos del frío y del calor extremos de la Luna.',
    },
    wheelsLeft: {
      name: 'Ruedas',
      fact: 'Lunojod tenía 8 ruedas y cada una tenía su propio motor eléctrico.',
    },
    wheelsRight: {
      name: 'Ruedas',
      fact: 'Lunojod tenía 8 ruedas y cada una tenía su propio motor eléctrico.',
    },
    solarLid: {
      name: 'Tapa solar',
      fact: 'De día se abría para cargar las baterías con el Sol; de noche se cerraba como una tapa para guardar el calor.',
    },
    antennas: {
      name: 'Antenas',
      fact: 'Recibían las órdenes de los conductores, que manejaban el robot desde la Tierra mirando sus cámaras.',
    },
  },
  spirit: MER,
  opportunity: MER,
};

/** Piezas gemelas (intercambiables): se pueden colocar en cualquiera de las dos siluetas. */
export const TWIN: Record<string, string> = {
  wheelsLeft: 'wheelsRight',
  wheelsRight: 'wheelsLeft',
};