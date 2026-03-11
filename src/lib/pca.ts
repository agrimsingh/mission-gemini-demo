export type ProjectablePoint<T> = T & {
  embedding: number[];
};

export type ProjectedPoint<T> = T & {
  x: number;
  y: number;
};

function dotProduct(left: number[], right: number[]): number {
  let sum = 0;

  for (let index = 0; index < left.length; index += 1) {
    sum += left[index]! * right[index]!;
  }

  return sum;
}

function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(dotProduct(vector, vector));
  const safeMagnitude = magnitude || 1;
  const normalized = new Array<number>(vector.length);

  for (let index = 0; index < vector.length; index += 1) {
    normalized[index] = vector[index]! / safeMagnitude;
  }

  return normalized;
}

function buildCenteredMatrix(points: Array<ProjectablePoint<unknown>>): number[][] {
  const dimensions = points[0]?.embedding.length ?? 0;
  const mean = new Array<number>(dimensions).fill(0);

  for (const point of points) {
    for (let dimensionIndex = 0; dimensionIndex < dimensions; dimensionIndex += 1) {
      mean[dimensionIndex] += point.embedding[dimensionIndex] ?? 0;
    }
  }

  for (let dimensionIndex = 0; dimensionIndex < dimensions; dimensionIndex += 1) {
    mean[dimensionIndex] /= points.length;
  }

  return points.map((point) => {
    const centered = new Array<number>(dimensions).fill(0);

    for (let dimensionIndex = 0; dimensionIndex < dimensions; dimensionIndex += 1) {
      centered[dimensionIndex] =
        (point.embedding[dimensionIndex] ?? 0) - mean[dimensionIndex]!;
    }

    return centered;
  });
}

function covarianceMultiply(
  centeredRows: number[][],
  vector: number[],
): number[] {
  const dimensions = vector.length;
  const result = new Array<number>(dimensions).fill(0);

  for (const row of centeredRows) {
    const scalar = dotProduct(row, vector);

    for (let dimensionIndex = 0; dimensionIndex < dimensions; dimensionIndex += 1) {
      result[dimensionIndex] += row[dimensionIndex]! * scalar;
    }
  }

  return result;
}

function projectRows(
  centeredRows: number[][],
  component: number[],
): number[] {
  return centeredRows.map((row) => dotProduct(row, component));
}

function computePrincipalComponent(
  centeredRows: number[][],
  previousComponents: number[][],
): number[] {
  const dimensions = centeredRows[0]?.length ?? 0;
  let vector = new Array<number>(dimensions).fill(0);

  if (centeredRows[0]) {
    vector = [...centeredRows[0]];
  } else {
    return vector;
  }

  for (let dimensionIndex = 0; dimensionIndex < dimensions; dimensionIndex += 1) {
    vector[dimensionIndex] += (dimensionIndex % 7) * 0.0001;
  }

  vector = normalizeVector(vector);

  for (let iteration = 0; iteration < 24; iteration += 1) {
    let next = covarianceMultiply(centeredRows, vector);

    for (const previous of previousComponents) {
      const projection = dotProduct(next, previous);

      for (let dimensionIndex = 0; dimensionIndex < dimensions; dimensionIndex += 1) {
        next[dimensionIndex] -= projection * previous[dimensionIndex]!;
      }
    }

    vector = normalizeVector(next);
  }

  return vector;
}

function normalizeCoordinates(values: number[]): number[] {
  if (values.length === 0) {
    return [];
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  if (minValue === maxValue) {
    return values.map(() => 0.5);
  }

  return values.map((value) => (value - minValue) / (maxValue - minValue));
}

export function projectEmbeddingsToPlane<T>(
  points: Array<ProjectablePoint<T>>,
): Array<ProjectedPoint<T>> {
  if (points.length === 0) {
    return [];
  }

  if (points.length === 1) {
    return points.map((point) => ({
      ...point,
      x: 0.5,
      y: 0.5,
    }));
  }

  const centeredRows = buildCenteredMatrix(points);
  const componentX = computePrincipalComponent(centeredRows, []);
  const componentY = computePrincipalComponent(centeredRows, [componentX]);
  const projectedX = normalizeCoordinates(projectRows(centeredRows, componentX));
  const projectedY = normalizeCoordinates(projectRows(centeredRows, componentY));

  return points.map((point, index) => ({
    ...point,
    x: projectedX[index] ?? 0.5,
    y: projectedY[index] ?? 0.5,
  }));
}
