/**
 * Jars are described by name, volume and mouth together because several
 * standard jars share a name and volume and differ only by mouth — the
 * regular and wide-mouth pint, and the regular and wide-mouth quart.
 */
export function describeJarType(jarType) {
  if (!jarType) return ''
  return `${jarType.name} (${jarType.ounces} oz) · ${jarType.mouth} mouth`
}
