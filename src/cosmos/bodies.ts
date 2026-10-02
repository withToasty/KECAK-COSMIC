// COSMIC MODE data: real orbital / rotation periods of bodies, grouped into
// listening "systems". Periods are sidereal averages in seconds. This is a
// static table, not an ephemeris: nothing here knows where a body is *now*.
// See docs/cosmic-model.md for sources and what is / is not verified.

export type SourceType = 'planet' | 'moon' | 'satellite'

export type CosmicBody = {
  id: string
  name: string
  nameJa: string
  sourceType: SourceType
  /** Sidereal period in seconds (orbit, or rotation for the Earth-rotation entry). */
  realPeriodSeconds: number
  /** Short label for a seat. */
  shortLabel: string
  note: string
  /** `exact`: a stable catalogue value. `approx`: varies in practice (e.g. altitude). */
  precision: 'exact' | 'approx'
}

const DAY = 86400

export const COSMIC_BODIES: readonly CosmicBody[] = [
  // --- Earth system -------------------------------------------------------
  {
    id: 'iss',
    name: 'ISS',
    nameJa: '国際宇宙ステーション',
    sourceType: 'satellite',
    realPeriodSeconds: 92.9 * 60,
    shortLabel: 'ISS',
    note: '約92.9分で地球を1周。高度が変わるので周期は少しずつ変わる',
    precision: 'approx',
  },
  {
    id: 'gps',
    name: 'GPS satellite',
    nameJa: 'GPS衛星',
    sourceType: 'satellite',
    realPeriodSeconds: (11 * 60 + 58) * 60,
    shortLabel: 'GPS',
    note: '約11時間58分。恒星日のちょうど半分',
    precision: 'approx',
  },
  {
    id: 'earth-rotation',
    name: 'Earth (rotation)',
    nameJa: '地球の自転',
    sourceType: 'planet',
    realPeriodSeconds: 86164.0905,
    shortLabel: 'ROT',
    note: '恒星日(23時間56分4秒)。静止衛星の周期と同じ',
    precision: 'exact',
  },
  {
    id: 'moon',
    name: 'Moon',
    nameJa: '月',
    sourceType: 'moon',
    realPeriodSeconds: 27.321661 * DAY,
    shortLabel: 'MOON',
    note: '恒星月 27.32日(満ち欠けの周期の29.53日とは別)',
    precision: 'exact',
  },
  // --- Planets -------------------------------------------------------------
  { id: 'mercury', name: 'Mercury', nameJa: '水星', sourceType: 'planet', realPeriodSeconds: 87.969 * DAY, shortLabel: 'MER', note: '公転周期 87.97日', precision: 'exact' },
  { id: 'venus', name: 'Venus', nameJa: '金星', sourceType: 'planet', realPeriodSeconds: 224.701 * DAY, shortLabel: 'VEN', note: '公転周期 224.70日', precision: 'exact' },
  { id: 'earth', name: 'Earth', nameJa: '地球', sourceType: 'planet', realPeriodSeconds: 365.256 * DAY, shortLabel: 'EAR', note: '公転周期(恒星年)365.26日', precision: 'exact' },
  { id: 'mars', name: 'Mars', nameJa: '火星', sourceType: 'planet', realPeriodSeconds: 686.98 * DAY, shortLabel: 'MAR', note: '公転周期 686.98日', precision: 'exact' },
  { id: 'jupiter', name: 'Jupiter', nameJa: '木星', sourceType: 'planet', realPeriodSeconds: 4332.59 * DAY, shortLabel: 'JUP', note: '公転周期 4332.6日(約11.86年)', precision: 'exact' },
  { id: 'saturn', name: 'Saturn', nameJa: '土星', sourceType: 'planet', realPeriodSeconds: 10759.22 * DAY, shortLabel: 'SAT', note: '公転周期 10759日(約29.46年)', precision: 'exact' },
  { id: 'uranus', name: 'Uranus', nameJa: '天王星', sourceType: 'planet', realPeriodSeconds: 30688.5 * DAY, shortLabel: 'URA', note: '公転周期 30688日(約84.0年)', precision: 'exact' },
  { id: 'neptune', name: 'Neptune', nameJa: '海王星', sourceType: 'planet', realPeriodSeconds: 60182 * DAY, shortLabel: 'NEP', note: '公転周期 60182日(約164.8年)', precision: 'exact' },
  // --- Galilean moons ------------------------------------------------------
  { id: 'io', name: 'Io', nameJa: 'イオ', sourceType: 'moon', realPeriodSeconds: 1.769138 * DAY, shortLabel: 'IO', note: '公転周期 1.769日', precision: 'exact' },
  { id: 'europa', name: 'Europa', nameJa: 'エウロパ', sourceType: 'moon', realPeriodSeconds: 3.551181 * DAY, shortLabel: 'EUR', note: '公転周期 3.551日(イオのほぼ2倍)', precision: 'exact' },
  { id: 'ganymede', name: 'Ganymede', nameJa: 'ガニメデ', sourceType: 'moon', realPeriodSeconds: 7.154553 * DAY, shortLabel: 'GAN', note: '公転周期 7.155日(イオのほぼ4倍)', precision: 'exact' },
  { id: 'callisto', name: 'Callisto', nameJa: 'カリスト', sourceType: 'moon', realPeriodSeconds: 16.689017 * DAY, shortLabel: 'CAL', note: '公転周期 16.69日。ほかの3つの共鳴には入っていない', precision: 'exact' },
]

export const findBody = (id: string): CosmicBody | undefined =>
  COSMIC_BODIES.find((b) => b.id === id)

export type SystemId = 'earth' | 'inner' | 'outer' | 'jupiter'

export type CosmicSystem = {
  id: SystemId
  label: string
  description: string
  bodies: readonly string[]
  /** How many beats the fastest body takes for one revolution, by default. */
  fastestBeats: number
}

export const COSMIC_SYSTEMS: readonly CosmicSystem[] = [
  {
    id: 'earth',
    label: '地球まわり',
    description: 'ISS、GPS衛星、地球の自転、月。90分から27日まで',
    bodies: ['iss', 'gps', 'earth-rotation', 'moon'],
    fastestBeats: 2,
  },
  {
    id: 'inner',
    label: '内惑星',
    description: '水星、金星、地球、火星。88日から687日まで',
    bodies: ['mercury', 'venus', 'earth', 'mars'],
    fastestBeats: 2,
  },
  {
    id: 'outer',
    label: '外惑星',
    description: '木星、土星、天王星、海王星。12年から165年まで',
    bodies: ['jupiter', 'saturn', 'uranus', 'neptune'],
    fastestBeats: 4,
  },
  {
    id: 'jupiter',
    label: '木星の衛星',
    description: 'イオ、エウロパ、ガニメデはほぼ 1:2:4 の共鳴。カリストだけ外れている',
    bodies: ['io', 'europa', 'ganymede', 'callisto'],
    fastestBeats: 2,
  },
]

export const findSystem = (id: SystemId): CosmicSystem =>
  COSMIC_SYSTEMS.find((s) => s.id === id)!
