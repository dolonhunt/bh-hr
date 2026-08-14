declare module "react-sparklines" {
  import * as React from "react";

  export interface SparklinesProps {
    data: number[];
    limit?: number;
    width?: number;
    height?: number;
    margin?: number;
    max?: number;
    min?: number;
    style?: React.CSSProperties;
    svgWidth?: number;
    svgHeight?: number;
    preserveAspectRatio?: string;
  }

  export const Sparklines: React.FC<SparklinesProps & { children?: React.ReactNode }>;

  export interface SparklinesLineProps {
    color?: string;
    style?: React.CSSProperties;
    points?: number[];
    margin?: number;
  }

  export const SparklinesLine: React.FC<SparklinesLineProps>;

  export interface SparklinesSpotsProps {
    size?: number;
    style?: React.CSSProperties;
    color?: string;
  }

  export const SparklinesSpots: React.FC<SparklinesSpotsProps>;
}
