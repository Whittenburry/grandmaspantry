/**
 * The standard Ball lineup. Modelled as a catalog rather than a size enum
 * crossed with a mouth enum, because crossing them invents jars that do not
 * exist — there is no wide-mouth quarter-pint jelly jar.
 */
export const SEED_JAR_TYPES = [
  { id: 'quarter-pint-jelly', name: 'Quarter-pint jelly', ounces: 4, millilitres: 125, mouth: 'Regular', isSeeded: true, sortOrder: 10 },
  { id: 'half-pint', name: 'Half-pint', ounces: 8, millilitres: 250, mouth: 'Regular', isSeeded: true, sortOrder: 20 },
  { id: 'half-pint-jelly', name: 'Half-pint jelly', ounces: 8, millilitres: 250, mouth: 'Regular', isSeeded: true, sortOrder: 30 },
  { id: 'three-quarter-pint-jelly', name: 'Three-quarter-pint jelly', ounces: 12, millilitres: 375, mouth: 'Regular', isSeeded: true, sortOrder: 40 },
  { id: 'pint-regular', name: 'Pint', ounces: 16, millilitres: 500, mouth: 'Regular', isSeeded: true, sortOrder: 50 },
  { id: 'pint-wide', name: 'Pint', ounces: 16, millilitres: 500, mouth: 'Wide', isSeeded: true, sortOrder: 60 },
  { id: 'pint-and-a-half', name: 'Pint and a half', ounces: 24, millilitres: 750, mouth: 'Regular', isSeeded: true, sortOrder: 70 },
  { id: 'quart-regular', name: 'Quart', ounces: 32, millilitres: 1000, mouth: 'Regular', isSeeded: true, sortOrder: 80 },
  { id: 'quart-wide', name: 'Quart', ounces: 32, millilitres: 1000, mouth: 'Wide', isSeeded: true, sortOrder: 90 },
  { id: 'half-gallon', name: 'Half gallon', ounces: 64, millilitres: 2000, mouth: 'Wide', isSeeded: true, sortOrder: 100 },
]
