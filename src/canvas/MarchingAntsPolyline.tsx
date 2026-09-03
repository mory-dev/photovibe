import { MARCHING_ANTS } from "./marching-ants";

interface MarchingAntsPolylineProps {
  points: string;
}

export function MarchingAntsPolyline({ points }: MarchingAntsPolylineProps) {
  if (!points) return null;
  return (
    <>
      <polyline
        fill="none"
        stroke={MARCHING_ANTS.back}
        strokeWidth="1"
        strokeDasharray={MARCHING_ANTS.dash}
        className="pv-ants"
        points={points}
      />
      <polyline
        fill="none"
        stroke={MARCHING_ANTS.front}
        strokeWidth="1"
        strokeDasharray={MARCHING_ANTS.dash}
        strokeDashoffset={MARCHING_ANTS.frontOffset}
        className="pv-ants"
        points={points}
      />
    </>
  );
}
