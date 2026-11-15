import type { RobotId } from '../types';
import { tr } from '../i18n';

export interface PieceInfo {
  name: string;
  fact: string;
}

const MER: Record<string, PieceInfo> = {
  body: {
    name: tr('Electronics box', 'Caja electrónica'),
    fact: tr('It holds the computer and the batteries. It has heaters because nights on Mars drop to about -100 °C.', 'Guarda la computadora y las baterías. Tiene calentadores porque las noches de Marte bajan a unos -100 °C.'),
  },
  wheelsLeft: {
    name: tr('Wheels', 'Ruedas'),
    fact: tr('Six wheels with "rocker-bogie" suspension: it lets the rover drive over rocks without tipping over.', 'Seis ruedas con suspensión "balancín-bogie": le permite pasar sobre rocas sin volcarse.'),
  },
  wheelsRight: {
    name: tr('Wheels', 'Ruedas'),
    fact: tr('Six wheels with "rocker-bogie" suspension: it lets the rover drive over rocks without tipping over.', 'Seis ruedas con suspensión "balancín-bogie": le permite pasar sobre rocas sin volcarse.'),
  },
  solarDeck: {
    name: tr('Solar panels', 'Paneles solares'),
    fact: tr('They give it power from sunlight. Sometimes Martian whirlwinds blew the dust off them!', 'Le dan energía con la luz del Sol. ¡A veces los remolinos de viento marciano les quitaban el polvo!'),
  },
  mast: {
    name: tr('Camera mast', 'Mástil con cámaras'),
    fact: tr('Its cameras are at the height of a person\'s eyes, so we see Mars as if we were there.', 'Sus cámaras están a la altura de los ojos de una persona, así vemos Marte como si estuviéramos allí.'),
  },
};

export const PIECE_INFO: Record<RobotId, Record<string, PieceInfo>> = {
  lrv: {
    chassis: {
      name: tr('Chassis and controls', 'Chasis y mandos'),
      fact: tr('The aluminum chassis traveled folded inside the lunar module. It was steered with a T-shaped hand controller.', 'El chasis de aluminio viajó plegado dentro del módulo lunar. Se manejaba con una palanca en forma de T.'),
    },
    wheelsLeft: {
      name: tr('Wheels', 'Ruedas'),
      fact: tr('Steel wire mesh wheels: they did not need air, and there is no air on the Moon!', 'Ruedas de malla de alambre de acero: no necesitaban aire, ¡y en la Luna no hay aire!'),
    },
    wheelsRight: {
      name: tr('Wheels', 'Ruedas'),
      fact: tr('Steel wire mesh wheels: they did not need air, and there is no air on the Moon!', 'Ruedas de malla de alambre de acero: no necesitaban aire, ¡y en la Luna no hay aire!'),
    },
    seats: {
      name: tr('Seats', 'Asientos'),
      fact: tr('Two folding seats with seat belts for astronauts David Scott and James Irwin.', 'Dos asientos plegables con cinturones para los astronautas David Scott y James Irwin.'),
    },
    comms: {
      name: tr('Antenna', 'Antena'),
      fact: tr('Its umbrella-shaped antenna sent color video from the Moon to Earth.', 'Su antena en forma de paraguas enviaba video en color desde la Luna hasta la Tierra.'),
    },
  },
  spirit: MER,
  opportunity: MER,
};

export const TWIN: Record<string, string> = {
  wheelsLeft: 'wheelsRight',
  wheelsRight: 'wheelsLeft',
};
