# 079 — Smooth Hourly Activity line joins

## Problem

The Hourly Activity area chart paints each segment's line with a sheared top border inside a separately clipped cell. When adjacent slopes differ, their border bands meet at different heights and leave visible spikes at hour boundaries.

## Goal

Make the line meet cleanly at each hourly value while preserving the existing area fill and chart interactions.

## Requirements

- Draw a constant-width line above the area fill, with rounded joins at hourly values.
- Keep the existing colors, 168-hour range, scaling, scrolling, hover, and metric switch behavior.
- Use React Native primitives supported by the Paseo host; do not add an SVG or canvas dependency.

## Acceptance

- Peaks and bends have no protruding edge at the connection between adjacent segments.
- The line stays aligned with the filled area and remains within the plot bounds.
- `npm run typecheck` and `npm test` pass; the local plugin reloads successfully.
