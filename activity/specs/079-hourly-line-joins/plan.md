# Plan

Keep the clipped `skewY` cells for the area fill, removing their sloped top borders. Overlay each hourly interval with a rotated, constant-thickness rectangular stroke placed between the same two data points. Round the segment ends and cover each interior point with a circular join so changes in slope cannot produce a miter spike or a gap. Keep all elements in `AreaSeries`, which the caller already memoizes across hover updates.
