import React, { useEffect, useRef } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useActiveTourTarget, useTourStore } from './useTourStore';

// Marks a piece of UI the walkthrough can spotlight. Measures itself only
// while it's the current step's target -- twice, since a tab switch animates
// in and the first frame can still be mid-transition.
export function TourTarget({ id, style, children }: { id: string; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const ref = useRef<View>(null);
  const activeTarget = useActiveTourTarget();
  const setRect = useTourStore((s) => s.setRect);

  useEffect(() => {
    if (activeTarget !== id) return;
    let cancelled = false;
    const measure = () =>
      ref.current?.measureInWindow((x, y, width, height) => {
        if (!cancelled && width > 0 && height > 0) setRect({ x, y, width, height });
      });
    const timers = [setTimeout(measure, 80), setTimeout(measure, 450)];
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [activeTarget, id, setRect]);

  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}
