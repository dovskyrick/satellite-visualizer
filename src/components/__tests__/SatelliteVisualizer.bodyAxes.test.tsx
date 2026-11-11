import React from 'react';
import { render, screen } from '@testing-library/react';

// Resium is mocked to avoid WebGL/DOM dependencies; the Viewer renders its children.
jest.mock('resium', () => ({
  Viewer: ({ children }: any) => <>{children}</>,
  Clock: () => null,
  Entity: () => null,
  PointGraphics: () => null,
  ModelGraphics: () => null,
  PathGraphics: () => null,
  LabelGraphics: () => null,
}));

// Avoid downloading Earth orientation data: identity ECEF to ICRF rotation.
jest.mock('cesium', () => {
  const cesium = jest.requireActual('cesium');
  return {
    ...cesium,
    Transforms: {
      ...cesium.Transforms,
      preloadIcrfFixed: () => Promise.resolve(),
      computeFixedToIcrfMatrix: () => cesium.Matrix3.clone(cesium.Matrix3.IDENTITY),
    },
  };
});

jest.mock('../BodyAxes', () => ({
  BodyAxes: ({ length }: any) => <div data-testid="body-axes" data-length={length} />,
}));

import { SatelliteVisualizer } from '../SatelliteVisualizer';
import { AssetMode, CoordinatesType } from '../../types';

const t0 = Date.parse('2024-01-01T00:00:00Z');
const t1 = Date.parse('2024-01-01T00:01:00Z');

const field = (name: string, values: number[]) => ({ name, values, config: {}, type: 'number' });

const data = {
  series: [
    {
      fields: [
        field('time', [t0, t1]),
        field('longitude', [0.0, 1.0]),
        field('latitude', [0.0, 0.0]),
        field('altitude', [500e3, 500e3]),
        field('qx', [0.0, 0.0]),
        field('qy', [0.0, 0.0]),
        field('qz', [0.0, 0.0]),
        field('qs', [1.0, 1.0]),
      ],
      length: 2,
    },
  ],
} as any;

const makeProps = (showBodyAxes: boolean) =>
  ({
    options: {
      locations: [],
      assetMode: AssetMode.Point,
      pointSize: 10,
      pointColor: 'red',
      trajectoryShow: false,
      coordinatesType: CoordinatesType.Geodetic,
      showBodyAxes,
      bodyAxesLength: 42,
    },
    data,
    timeRange: { from: { toDate: () => new Date(t0) }, to: { toDate: () => new Date(t1) } },
    replaceVariables: jest.fn((str: string) => str),
    eventBus: { getStream: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) },
  } as any);

describe('SatelliteVisualizer: body axes option', () => {
  it('shows the body axes when enabled, with the configured length', async () => {
    render(<SatelliteVisualizer {...makeProps(true)} />);

    const bodyAxes = await screen.findByTestId('body-axes');
    expect(bodyAxes).toHaveAttribute('data-length', '42');
  });

  it('hides the body axes by default', async () => {
    render(<SatelliteVisualizer {...makeProps(false)} />);

    // Wait for the data to be parsed before asserting absence.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.queryByTestId('body-axes')).not.toBeInTheDocument();
  });
});
