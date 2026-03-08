import type { WidgetConfig } from '@shared/types';
import type { DashboardGridItemState } from '../composables/useDashboardGrid';

export class LayoutMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LayoutMappingError';
  }
}

function compareWidgetsByPosition(a: WidgetConfig, b: WidgetConfig): number {
  if (a.position.y !== b.position.y) {
    return a.position.y - b.position.y;
  }

  return a.position.x - b.position.x;
}

function buildWidgetMap(widgets: readonly WidgetConfig[]): Map<string, WidgetConfig> {
  const widgetMap = new Map<string, WidgetConfig>();

  for (const widget of widgets) {
    if (widgetMap.has(widget.id)) {
      throw new LayoutMappingError(
        `[layout-mapper] Duplicate widget id found in existing layout: "${widget.id}".`,
      );
    }

    widgetMap.set(widget.id, widget);
  }

  return widgetMap;
}

function assertNoDuplicateGridItemIds(items: readonly DashboardGridItemState[]): void {
  const seenIds = new Set<string>();

  for (const item of items) {
    if (seenIds.has(item.id)) {
      throw new LayoutMappingError(
        `[layout-mapper] Duplicate widget id found in grid state: "${item.id}".`,
      );
    }

    seenIds.add(item.id);
  }
}

export function mapGridItemsToWidgetConfigs(
  currentItems: readonly DashboardGridItemState[],
  existingWidgets: readonly WidgetConfig[],
): WidgetConfig[] {
  if (currentItems.length !== existingWidgets.length) {
    throw new LayoutMappingError(
      `[layout-mapper] Grid state and existing layout have different lengths ` +
        `(grid: ${currentItems.length}, layout: ${existingWidgets.length}).`,
    );
  }

  assertNoDuplicateGridItemIds(currentItems);

  const widgetMap = buildWidgetMap(existingWidgets);
  const mappedWidgets: WidgetConfig[] = [];

  for (const item of currentItems) {
    const existingWidget = widgetMap.get(item.id);

    if (!existingWidget) {
      throw new LayoutMappingError(
        `[layout-mapper] Grid item "${item.id}" has no matching widget in existing layout.`,
      );
    }

    mappedWidgets.push({
      id: existingWidget.id,
      type: existingWidget.type,
      title: existingWidget.title,
      position: {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      },
    });
  }

  for (const widget of existingWidgets) {
    const hasMatch = currentItems.some((item) => item.id === widget.id);

    if (!hasMatch) {
      throw new LayoutMappingError(
        `[layout-mapper] Existing widget "${widget.id}" is missing from current grid state.`,
      );
    }
  }

  return mappedWidgets.sort(compareWidgetsByPosition);
}
