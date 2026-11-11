import { Cartesian3, Matrix3, Quaternion } from 'cesium';

export interface BodyAxis {
  label: string;
  direction: Cartesian3;
}

export const BODY_AXES: BodyAxis[] = [
  { label: 'X', direction: Cartesian3.UNIT_X },
  { label: 'Y', direction: Cartesian3.UNIT_Y },
  { label: 'Z', direction: Cartesian3.UNIT_Z },
];

/**
 * Computes the tip of a body axis drawn from the satellite position.
 *
 * @param x_ECEF - The satellite position (`m`).
 * @param q_B_ECEF - The satellite orientation, as applied to the satellite entity.
 * @param direction - The unit axis in the body frame.
 * @param length - The axis length (`m`).
 */
export function computeBodyAxisTip(
  x_ECEF: Cartesian3,
  q_B_ECEF: Quaternion,
  direction: Cartesian3,
  length: number,
  result: Cartesian3 = new Cartesian3()
): Cartesian3 {
  const rotation = Matrix3.fromQuaternion(q_B_ECEF, new Matrix3());
  const axis_ECEF = Matrix3.multiplyByVector(rotation, direction, new Cartesian3());

  return Cartesian3.add(x_ECEF, Cartesian3.multiplyByScalar(axis_ECEF, length, axis_ECEF), result);
}

/**
 * Converts a length in pixels to a length in metres, given the size of one pixel (`m`) at the satellite distance.
 * Returns undefined when the pixel size is not usable (e.g. before the first render).
 */
export function pixelsToMeters(pixels: number, metersPerPixel: number): number | undefined {
  if (!Number.isFinite(metersPerPixel) || metersPerPixel <= 0) {
    return undefined;
  }

  return pixels * metersPerPixel;
}
