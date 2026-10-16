// « Y aller » : types partagés entre le serveur (API /api/y-aller/*) et l'écran.

export type LatLng = { lat: number; lng: number };
export type Mode = "auto" | "bus" | "velo" | "marche";

export type Parking = LatLng & {
  id: string;
  name: string;
  source: "ville" | "osm"; // stationnement municipal (fichier de la Ville) ou OpenStreetMap
  kind: "ville" | "public" | "clients" | "inconnu" | "prive"; // prive : réservé (on ne peut pas s'y garer)
  type: "interieur" | "etage" | "souterrain" | "surface" | "rue";
  capacity: number | null;
  estimated: boolean; // nombre de places estimé d'après la surface
  fee: boolean | null; // payant ? (null = inconnu)
  charge: string | null;
  maxstay: string | null;
  operator: string | null;
  address: string | null;
  website: string | null;
};

export type BikeStation = LatLng & { id: string; name: string; bikes: number | null; docks: number | null; capacity: number | null; live: boolean };
export type BikeRack = LatLng & { id: string; capacity: number | null; covered: boolean };
export type BusStop = LatLng & { id: string; code: string; name: string; lines: string[] };
export type Charger = LatLng & { id: string; name: string; operator: string | null; capacity: number | null };

export type Layers = {
  parkings: Parking[];
  bikeStations: BikeStation[];
  bikeRacks: BikeRack[];
  busStops: BusStop[];
  chargers: Charger[];
  stats: { villeLots: number; villePlaces: number; otherLots: number; otherPlaces: number; bikeStations: number; bikesNow: number | null; busLines: number };
  sources: string[];
};

export type Place = LatLng & { label: string; detail: string | null; kind: "evenement" | "lieu" | "adresse" | "stationnement" };

export type Leg = { mode: Mode | "attente"; coords: [number, number][]; distance: number; duration: number; color?: string; dashed?: boolean };

export type NearParking = Parking & { walkMin: number; distance: number };
export type NearBike = BikeStation & { walkMin: number };

export type BusOption = {
  line: string;
  color: string;
  textColor: string;
  headsign: string;
  from: { name: string; code: string; lat: number; lng: number; walkMin: number };
  to: { name: string; code: string; lat: number; lng: number; walkMin: number };
  stops: number;
  rideMin: number;
  departures: string[]; // ISO : prochains passages à l'arrêt de départ
  arrival: string; // ISO : arrivée estimée à destination
  totalMin: number;
  legs: Leg[];
};

export type Trip = {
  mode: Mode;
  ok: boolean;
  approx: boolean; // vrai si le service de trajets n'a pas répondu (ligne droite estimée)
  duration: number; // secondes, porte à porte
  distance: number; // mètres
  legs: Leg[];
  parking?: NearParking | null; // en auto : où se garer
  parkings?: NearParking[]; // en auto : autres choix
  bus?: BusOption[]; // en bus : options (la première est tracée)
  bikesFrom?: NearBike[]; // en vélo : stations àVélo près du départ
  bikesTo?: NearBike[]; // en vélo : stations près de l'arrivée
  racks?: (BikeRack & { walkMin: number })[]; // en vélo : supports près de l'arrivée
  message?: string;
  externalUrl: string; // itinéraire détaillé dans Google Maps
};

export type GoEvent = LatLng & {
  id: string;
  title: string;
  place: string;
  startsAt: string | null;
  endsAt: string | null;
  status: "live" | "upcoming";
  source: "app" | "ville";
  type: string | null;
  href: string | null; // page de l'activité dans l'app
  url: string | null; // site de l'organisme (événements de la Ville)
  cost: string | null;
  description: string | null;
};
