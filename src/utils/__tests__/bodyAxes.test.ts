import { Cartesian3, Math as CesiumMath, Quaternion } from 'cesium';
import { BODY_AXES, computeBodyAxisTip, pixelsToMeters } from '../bodyAxes';

const EPSILON = 1e-9;

const expectCartesian = (actual: Cartesian3, expected: Cartesian3) => {
  expect(Cartesian3.equalsEpsilon(actual, expected, EPSILON)).toBe(true);
};

describe('computeBodyAxisTip', () => {
  const x_ECEF = new Cartesian3(7000e3, -1000e3, 500e3);
  const length = 1000.0;

  it('adds the body axes unchanged with an identity orientation', () => {
    for (const axis of BODY_AXES) {
      const tip = computeBodyAxisTip(x_ECEF, Quaternion.IDENTITY, axis.direction, length);

      expectCartesian(
        tip,
        Cartesian3.add(x_ECEF, Cartesian3.multiplyByScalar(axis.direction, length, new Cartesian3()), new Cartesian3())
      );
    }
  });

  it('rotates the body axes with the orientation (90 deg about Z)', () => {
    const q_B_ECEF = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_TWO);
    const offset = (direction: Cartesian3) =>
      Cartesian3.subtract(computeBodyAxisTip(x_ECEF, q_B_ECEF, direction, length), x_ECEF, new Cartesian3());

    expectCartesian(offset(Cartesian3.UNIT_X), new Cartesian3(0.0, length, 0.0));
    expectCartesian(offset(Cartesian3.UNIT_Y), new Cartesian3(-length, 0.0, 0.0));
    expectCartesian(offset(Cartesian3.UNIT_Z), new Cartesian3(0.0, 0.0, length));
  });

  it('keeps the axes orthogonal and of the requested length for any orientation', () => {
    const q_B_ECEF = Quaternion.normalize(new Quaternion(0.1, -0.4, 0.3, 0.8), new Quaternion());
    const offsets = BODY_AXES.map((axis) =>
      Cartesian3.subtract(computeBodyAxisTip(x_ECEF, q_B_ECEF, axis.direction, length), x_ECEF, new Cartesian3())
    );

    offsets.forEach((offset) => expect(Cartesian3.magnitude(offset)).toBeCloseTo(length, 6));
    expect(Cartesian3.dot(offsets[0], offsets[1])).toBeCloseTo(0.0, 6);
    expect(Cartesian3.dot(offsets[1], offsets[2])).toBeCloseTo(0.0, 6);
    expectCartesian(
      Cartesian3.cross(offsets[0], offsets[1], new Cartesian3()),
      Cartesian3.multiplyByScalar(offsets[2], length, new Cartesian3())
    );
  });

  it('writes into the result argument when provided', () => {
    const result = new Cartesian3();
    const tip = computeBodyAxisTip(x_ECEF, Quaternion.IDENTITY, Cartesian3.UNIT_X, length, result);

    expect(tip).toBe(result);
  });
});

describe('pixelsToMeters', () => {
  it('scales the pixel length by the pixel size', () => {
    expect(pixelsToMeters(100, 2.5)).toBe(250);
  });

  it.each([0.0, -1.0, NaN, Infinity])('returns undefined for an unusable pixel size (%p)', (metersPerPixel) => {
    expect(pixelsToMeters(100, metersPerPixel)).toBeUndefined();
  });
});
