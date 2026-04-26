import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

export type IconName =
  | 'home'
  | 'star'
  | 'chart'
  | 'cog'
  | 'plus'
  | 'trash'
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-left'
  | 'chevron-right'
  | 'search'
  | 'barcode'
  | 'pencil'
  | 'heart'
  | 'target'
  | 'check'
  | 'close'
  | 'info';

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
};

export function Icon({ name, size = 22, color = colors.textSec, filled = false }: IconProps) {
  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 12L12 4l9 8"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'star':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={filled ? color : 'none'}
            fillOpacity={filled ? 0.2 : 0}
            stroke={color}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'chart':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x={3} y={13} width={4} height={8} rx={1.5} fill={color} opacity={0.85} />
          <Rect x={10} y={8} width={4} height={13} rx={1.5} fill={color} opacity={0.85} />
          <Rect x={17} y={3} width={4} height={18} rx={1.5} fill={color} opacity={0.85} />
        </Svg>
      );
    case 'cog':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
          <Path
            d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
            stroke={color}
            strokeWidth={1.8}
          />
        </Svg>
      );
    case 'plus':
      return (
        <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <Line x1={8} y1={2} x2={8} y2={14} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
          <Line x1={2} y1={8} x2={14} y2={8} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
        </Svg>
      );
    case 'trash':
      return (
        <Svg width={size} height={size} viewBox="0 0 15 15" fill="none">
          <Path
            d="M1.5 3.5h12M5 3.5V2a.5.5 0 01.5-.5h4a.5.5 0 01.5.5v1.5M3 3.5l.8 9a.5.5 0 00.5.5h6.4a.5.5 0 00.5-.5l.8-9"
            stroke={color}
            strokeWidth={1.2}
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'chevron-down':
      return (
        <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
          <Path
            d="M3 5l4 4 4-4"
            stroke={color}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'chevron-up':
      return (
        <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
          <Path
            d="M3 9l4-4 4 4"
            stroke={color}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'chevron-left':
      return (
        <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
          <Path
            d="M9 3l-4 4 4 4"
            stroke={color}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'chevron-right':
      return (
        <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
          <Path
            d="M5 3l4 4-4 4"
            stroke={color}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'search':
      return (
        <Svg width={size} height={size} viewBox="0 0 17 17" fill="none">
          <Circle cx={7.5} cy={7.5} r={5.5} stroke={color} strokeWidth={1.5} />
          <Path d="M12 12L15.5 15.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
      );
    case 'barcode':
      return (
        <Svg width={size} height={size} viewBox="0 0 18 18" fill={color}>
          <Rect x={1} y={2} width={2} height={14} rx={0.5} />
          <Rect x={4.5} y={2} width={1} height={14} rx={0.5} />
          <Rect x={6.5} y={2} width={2} height={14} rx={0.5} />
          <Rect x={9.5} y={2} width={1} height={14} rx={0.5} />
          <Rect x={11.5} y={2} width={2.5} height={14} rx={0.5} />
          <Rect x={15} y={2} width={2} height={14} rx={0.5} />
        </Svg>
      );
    case 'pencil':
      return (
        <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <Path d="M11 2l3 3-8 8H3v-3l8-8z" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
        </Svg>
      );
    case 'heart':
      return (
        <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
          <Path
            d="M7 12S1.5 8.5 1.5 4.5a3 3 0 015.5-1.6A3 3 0 0112.5 4.5C12.5 8.5 7 12 7 12z"
            stroke={color}
            strokeWidth={1.3}
            fill={color}
            fillOpacity={0.2}
          />
        </Svg>
      );
    case 'target':
      return (
        <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <Circle cx={8} cy={8} r={6.5} stroke={color} strokeWidth={1.3} />
          <Circle cx={8} cy={8} r={3.5} stroke={color} strokeWidth={1.3} />
          <Circle cx={8} cy={8} r={1} fill={color} />
        </Svg>
      );
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <Path
            d="M3 8.5l3.5 3.5L13 5"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'close':
      return (
        <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <Path
            d="M4 4l8 8M12 4l-8 8"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'info':
      return (
        <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <Circle cx={8} cy={8} r={6.5} stroke={color} strokeWidth={1.4} />
          <Circle cx={8} cy={5} r={0.9} fill={color} />
          <Path
            d="M8 7.5v4"
            stroke={color}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        </Svg>
      );
    default: {
      const _exhaustive: never = name;
      return _exhaustive;
    }
  }
}
