// https://observablehq.com/@pamacha/chaikins-algorithm
export const chaikinSmooth = (points: [number, number][], iterations: number): [number, number][] => {
  if (iterations === 0) return points;

  const l = points.length;

  const smooth = points .map((pt, idx) => {
    return [
      [0.75 * pt[0] + 0.25 * points[(idx + 1) % l][0], 0.75 * pt[1] + 0.25 * points[(idx + 1) % l][1]],
      [0.25 * pt[0] + 0.75 * points[(idx + 1) % l][0], 0.25 * pt[1] + 0.75 * points[(idx + 1) % l][1]]
    ];
  }).flat() as [number, number][];

  return iterations === 1 ? smooth : chaikinSmooth(smooth, iterations - 1);
}