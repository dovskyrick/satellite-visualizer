import React, { useEffect, useMemo, useRef } from 'react';
import { Entity, LabelGraphics, PolylineGraphics, useCesium } from 'resium';
import {
  ArcType,
  BoundingSphere,
  CallbackPositionProperty,
  CallbackProperty,
  Cartesian2,
  Cartesian3,
  Color,
  JulianDate,
  LabelStyle,
  PolylineArrowMaterialProperty,
  SampledPositionProperty,
  SampledProperty,
  TimeIntervalCollection,
} from 'cesium';

import { BODY_AXES, computeBodyAxisTip, pixelsToMeters } from '../utils/bodyAxes';

const AXIS_COLOR = Color.LIGHTGRAY;
const AXIS_WIDTH = 8;

interface Props {
  position: SampledPositionProperty;
  orientation: SampledProperty;
  availability: TimeIntervalCollection;
  length: number; // pixels
}

export const BodyAxes: React.FC<Props> = ({ position, orientation, availability, length }) => {
  const { viewer } = useCesium();

  // Axis length in metres, refreshed after each render so the axes keep a constant on-screen size.
  const lengthInMetersRef = useRef<number>(0);

  useEffect(() => {
    if (!viewer) {
      return;
    }

    const scene = viewer.scene;

    const removeListener = scene.postRender.addEventListener(() => {
      const x_ECEF = position.getValue(viewer.clock.currentTime);

      if (!x_ECEF) {
        return;
      }

      const metersPerPixel = scene.camera.getPixelSize(
        new BoundingSphere(x_ECEF, 0.0),
        scene.drawingBufferWidth,
        scene.drawingBufferHeight
      );

      lengthInMetersRef.current = pixelsToMeters(length, metersPerPixel) ?? lengthInMetersRef.current;
    });

    return () => {
      if (!scene.isDestroyed()) {
        removeListener();
      }
    };
  }, [viewer, position, length]);

  const axes = useMemo(
    () =>
      BODY_AXES.map((axis) => {
        const computeTip = (time: JulianDate): Cartesian3 | undefined => {
          const x_ECEF = position.getValue(time);
          const q_B_ECEF = orientation.getValue(time);

          if (!x_ECEF || !q_B_ECEF) {
            return undefined;
          }

          return computeBodyAxisTip(x_ECEF, q_B_ECEF, axis.direction, lengthInMetersRef.current);
        };

        return {
          label: axis.label,
          tip: new CallbackPositionProperty((time) => (time ? computeTip(time) : undefined), false),
          line: new CallbackProperty((time) => {
            const x_ECEF = time ? position.getValue(time) : undefined;
            const tip = time ? computeTip(time) : undefined;

            return x_ECEF && tip ? [x_ECEF, tip] : [];
          }, false),
        };
      }),
    [position, orientation]
  );

  const material = useMemo(() => new PolylineArrowMaterialProperty(AXIS_COLOR), []);

  return (
    <>
      {axes.map((axis) => (
        <Entity key={axis.label} name={`Body axis ${axis.label}`} availability={availability} position={axis.tip}>
          <PolylineGraphics positions={axis.line} width={AXIS_WIDTH} material={material} arcType={ArcType.NONE} />
          <LabelGraphics
            text={axis.label}
            font="14px sans-serif"
            fillColor={AXIS_COLOR}
            outlineColor={Color.BLACK}
            outlineWidth={2}
            style={LabelStyle.FILL_AND_OUTLINE}
            pixelOffset={new Cartesian2(8.0, -8.0)}
          />
        </Entity>
      ))}
    </>
  );
};
