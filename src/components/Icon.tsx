import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

export type IconName =
  | 'home'
  | 'star'
  | 'chart'
  | 'cog'
  | 'plus'
  | 'minus'
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
  | 'info'
  | 'user'
  | 'timer'
  | 'dumbbell'
  | 'list-checks'
  | 'play'
  | 'pause'
  | 'bolt'
  | 'flame'
  | 'music';

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
    case 'minus':
      return (
        <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <Line x1={2} y1={8} x2={14} y2={8} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
        </Svg>
      );
    case 'user':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.8} />
          <Path
            d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
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
    case 'timer':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M9 2h6"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
          <Circle cx={12} cy={14} r={8} stroke={color} strokeWidth={1.8} />
          <Path
            d="M12 10v4l2.5 2"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'dumbbell':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x={2} y={9} width={3} height={6} rx={1} stroke={color} strokeWidth={1.6} />
          <Rect x={5} y={7} width={3} height={10} rx={1} stroke={color} strokeWidth={1.6} />
          <Rect x={8} y={11} width={8} height={2} rx={0.5} fill={color} />
          <Rect x={16} y={7} width={3} height={10} rx={1} stroke={color} strokeWidth={1.6} />
          <Rect x={19} y={9} width={3} height={6} rx={1} stroke={color} strokeWidth={1.6} />
        </Svg>
      );
    case 'list-checks':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 5l1.5 1.5L7 4"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M3 12l1.5 1.5L7 11"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M3 19l1.5 1.5L7 18"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path d="M11 5h10" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
          <Path d="M11 12h10" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
          <Path d="M11 19h10" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
    case 'play':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M7 4.5v15l13-7.5L7 4.5z"
            fill={color}
            stroke={color}
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'pause':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x={6} y={4} width={4} height={16} rx={1} fill={color} />
          <Rect x={14} y={4} width={4} height={16} rx={1} fill={color} />
        </Svg>
      );
    case 'bolt':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"
            fill={color}
            fillOpacity={0.2}
            stroke={color}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'flame':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3c1 3 4 4.5 4 8a4 4 0 11-8 0c0-1.5.5-2.5 1.5-3.5C10.5 6 11 4.5 12 3z"
            fill={color}
            fillOpacity={0.2}
            stroke={color}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <Path
            d="M12 12c.5 1.5 2 2.2 2 4a2 2 0 11-4 0c0-1 .5-1.6 1-2.2.5-.6.8-1.1 1-1.8z"
            stroke={color}
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'music':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M9 18V5l12-2v13"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx={6} cy={18} r={3} stroke={color} strokeWidth={1.8} />
          <Circle cx={18} cy={16} r={3} stroke={color} strokeWidth={1.8} />
        </Svg>
      );
    default: {
      const _exhaustive: never = name;
      return _exhaustive;
    }
  }
}
