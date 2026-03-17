import { describe, expect, it } from 'vitest';
import { LayoutMappingError, mapGridItemsToWidgetConfigs } from '../layout-mapper';
import type { WidgetConfig } from '@shared/types';
import type { DashboardGridItemState } from '../../composables/useDashboardGrid';

function makeWidget(overrides: Partial<WidgetConfig> = {}): WidgetConfig {
  return {
    id: 'widget-1',
    type: 'kpi-cards',
    title: 'Widget',
    position: { x: 0, y: 0, w: 4, h: 2 },
    ...overrides,
  };
}

function makeGridItem(overrides: Partial<DashboardGridItemState> = {}): DashboardGridItemState {
  return {
    id: 'widget-1',
    x: 0,
    y: 0,
    w: 4,
    h: 2,
    ...overrides,
  };
}

describe('layout-mapper', () => {
  it('maps grid items to widget configs', () => {
    const result = mapGridItemsToWidgetConfigs(
      [makeGridItem({ x: 2, y: 3, w: 6, h: 4 })],
      [makeWidget()],
    );

    expect(result).toEqual([
      makeWidget({
        position: { x: 2, y: 3, w: 6, h: 4 },
      }),
    ]);
  });

  it('sorts mapped widgets by position', () => {
    const result = mapGridItemsToWidgetConfigs(
      [makeGridItem({ id: 'b', x: 5, y: 2 }), makeGridItem({ id: 'a', x: 1, y: 0 })],
      [makeWidget({ id: 'a', title: 'A' }), makeWidget({ id: 'b', title: 'B' })],
    );

    expect(result.map((widget) => widget.id)).toEqual(['a', 'b']);
  });

  it('throws when grid state and layout lengths differ', () => {
    expect(() =>
      mapGridItemsToWidgetConfigs([makeGridItem()], [makeWidget(), makeWidget({ id: 'widget-2' })]),
    ).toThrow(LayoutMappingError);
  });

  it('throws on duplicate currentItems ids', () => {
    expect(() =>
      mapGridItemsToWidgetConfigs(
        [makeGridItem({ id: 'dup' }), makeGridItem({ id: 'dup', x: 1 })],
        [makeWidget({ id: 'dup' }), makeWidget({ id: 'other' })],
      ),
    ).toThrow(LayoutMappingError);
  });

  it('throws on duplicate existingWidgets ids', () => {
    expect(() =>
      mapGridItemsToWidgetConfigs(
        [makeGridItem({ id: 'dup' }), makeGridItem({ id: 'other' })],
        [makeWidget({ id: 'dup' }), makeWidget({ id: 'dup', title: 'Duplicate' })],
      ),
    ).toThrow(LayoutMappingError);
  });

  it('throws when grid item has no matching widget', () => {
    expect(() =>
      mapGridItemsToWidgetConfigs(
        [makeGridItem({ id: 'missing' })],
        [makeWidget({ id: 'existing' })],
      ),
    ).toThrow(LayoutMappingError);
  });

  it('throws when existing widget is missing from grid state', () => {
    expect(() =>
      mapGridItemsToWidgetConfigs(
        [makeGridItem({ id: 'a' })],
        [makeWidget({ id: 'a' }), makeWidget({ id: 'b' })],
      ),
    ).toThrow(LayoutMappingError);
  });
});
