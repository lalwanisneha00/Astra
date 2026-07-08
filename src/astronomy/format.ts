/** Splits a decimal quantity into sexagesimal (whole, minutes, seconds),
 * carrying rounded-up seconds/minutes into the next unit correctly. */
function toSexagesimal(totalUnits: number): [whole: number, minutes: number, seconds: number] {
  let whole = Math.floor(totalUnits)
  const fractional = (totalUnits - whole) * 60
  let minutes = Math.floor(fractional)
  let seconds = Math.round((fractional - minutes) * 60)

  if (seconds === 60) {
    seconds = 0
    minutes += 1
  }
  if (minutes === 60) {
    minutes = 0
    whole += 1
  }

  return [whole, minutes, seconds]
}

/** Formats right ascension (degrees) in the conventional hours/minutes/seconds form. */
export function formatRightAscension(raDegrees: number): string {
  const [h, m, s] = toSexagesimal(raDegrees / 15)
  return `${h}h ${m}m ${s}s`
}

/** Formats declination (degrees) in the conventional signed degrees/arcmin/arcsec form. */
export function formatDeclination(decDegrees: number): string {
  const sign = decDegrees < 0 ? '-' : '+'
  const [d, m, s] = toSexagesimal(Math.abs(decDegrees))
  return `${sign}${d}° ${m}′ ${s}″`
}
