import React from 'react';
import { render } from '@testing-library/react';
import {
  Cartesian3,
  JulianDate,
  Quaternion,
  SampledPositionProperty,
  SampledProperty,
  TimeInterval,
  TimeIntervalCollection,
} from 'cesium';

// Resium is mocked to avoid WebGL/DOM dependencies: entities and graphics record their props.
const mockEntities: any[] = [];
const mockPolylines: any[] = [];
const mockLabels: any[] = [];
const mockUseCesium = jest.fn();

jest.mock('resium', () => ({
  Entity: ({ children, ...props }: any) => {
    mockEntities.push(props);
    return <>{children}</>;
  },
  PolylineGraphics: (props: any) => {
    mockPolylines.push(props);
    return null;
  },
  LabelGraphics: (props: any) => {
    mockLabels.push(props);
    return null;
  },
  useCesium: () => mockUseCesium(),
}));

import { BodyAxes } from '../BodyAxes';

const start = JulianDate.fromIso8601('2024-01-01T00:00:00Z');
const stop = JulianDate.fromIso8601('2024-01-01T00:01:00Z');
const x_ECEF = new Cartesian3(7000e3, 0.0, 0.0);
const METERS_PER_PIXEL = 2.0;
const LENGTH = 100; // pixels

const makeProps = () => {
  const position = new SampledPositionProperty();
  position.addSample(start, x_ECEF);
  position.addSample(stop, x_ECEF);

  const orientation = new SampledProperty(Quaternion);
  orientation.addSample(start, Quaternion.IDENTITY);
  orientation.addSample(stop, Quaternion.IDENTITY);

  return {
    position,
    orientation,
    availability: new TimeIntervalCollection([new TimeInterval({ start, stop })]),
    length: LENGTH,
  };
};

const makeViewer = () => {
  const listeners: Array<() => void> = [];
  const removeListener = jest.fn();
  const viewer = {
    clock: { currentTime: start },
    scene: {
      postRender: {
        addEventListener: (listener: () => void) => {
          listeners.push(listener);
          return removeListener;
        },
      },
      camera: { getPixelSize: () => METERS_PER_PIXEL },
      drawingBufferWidth: 800,
      drawingBufferHeight: 600,
      isDestroyed: () => false,
    },
  };
  return { viewer, listeners, removeListener };
};

describe('BodyAxes', () => {
  beforeEach(() => {
    mockEntities.length = 0;
    mockPolylines.length = 0;
    mockLabels.length = 0;
  });

  it('renders one labelled arrow per body axis', () => {
    mockUseCesium.mockReturnValue({ viewer: makeViewer().viewer });

    render(<BodyAxes {...makeProps()} />);

    expect(mockEntities).toHaveLength(3);
    expect(mockPolylines).toHaveLength(3);
    expect(mockLabels.map((label) => label.text)).toEqual(['X', 'Y', 'Z']);
  });

  it('sizes the arrows from the on-screen pixel length after a render', () => {
    const { viewer, listeners } = makeViewer();
    mockUseCesium.mockReturnValue({ viewer });

    render(<BodyAxes {...makeProps()} />);
    listeners.forEach((listener) => listener());

    const expectedLength = LENGTH * METERS_PER_PIXEL;
    const directions = [Cartesian3.UNIT_X, Cartesian3.UNIT_Y, Cartesian3.UNIT_Z];

    mockPolylines.slice(0, 3).forEach((polyline, index) => {
      const [from, to] = polyline.positions.getValue(start);
      const expectedTip = Cartesian3.add(
        x_ECEF,
        Cartesian3.multiplyByScalar(directions[index], expectedLength, new Cartesian3()),
        new Cartesian3()
      );

      expect(Cartesian3.equalsEpsilon(from, x_ECEF, 1e-6)).toBe(true);
      expect(Cartesian3.equalsEpsilon(to, expectedTip, 1e-6)).toBe(true);
    });
  });

  it('draws nothing outside the data time range', () => {
    mockUseCesium.mockReturnValue({ viewer: makeViewer().viewer });

    render(<BodyAxes {...makeProps()} />);

    const later = JulianDate.addHours(stop, 1.0, new JulianDate());
    expect(mockPolylines[0].positions.getValue(later)).toEqual([]);
  });

  it('removes its render listener when unmounted', () => {
    const { viewer, removeListener } = makeViewer();
    mockUseCesium.mockReturnValue({ viewer });

    const { unmount } = render(<BodyAxes {...makeProps()} />);
    unmount();

    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it('does not crash before the viewer is available', () => {
    mockUseCesium.mockReturnValue({ viewer: undefined });

    expect(() => render(<BodyAxes {...makeProps()} />)).not.toThrow();
  });
});
