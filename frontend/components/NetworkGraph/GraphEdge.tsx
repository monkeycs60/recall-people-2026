import { Line, Text as SvgText, G } from 'react-native-svg';
import { GraphEdge as GraphEdgeType, GraphNode } from '@/types';

type GraphEdgeProps = {
  edge: GraphEdgeType;
  sourceNode: GraphNode;
  targetNode: GraphNode;
  showLabel: boolean;
  onPress: (edge: GraphEdgeType) => void;
};

const FACT_TYPE_COLORS: Record<string, string> = {
  work: '#f59e0b',
  company: '#3b82f6',
  hobby: '#10b981',
  sport: '#ef4444',
  relationship: '#ec4899',
  partner: '#ec4899',
  location: '#8b5cf6',
  education: '#06b6d4',
  birthday: '#f97316',
  contact: '#64748b',
  other: '#6b7280',
};

export const GraphEdge = ({
  edge,
  sourceNode,
  targetNode,
  showLabel,
  onPress,
}: GraphEdgeProps) => {
  const handlePress = () => {
    onPress(edge);
  };

  const midX = (sourceNode.x + targetNode.x) / 2;
  const midY = (sourceNode.y + targetNode.y) / 2;

  const strokeColor = FACT_TYPE_COLORS[edge.factType] || '#6b7280';
  const opacity = Math.max(0.3, edge.similarity);

  return (
    <G onPress={handlePress}>
      <Line
        x1={sourceNode.x}
        y1={sourceNode.y}
        x2={targetNode.x}
        y2={targetNode.y}
        stroke={strokeColor}
        strokeWidth={2 + edge.similarity * 2}
        strokeOpacity={opacity}
        strokeLinecap="round"
      />
      {showLabel && (
        <SvgText
          x={midX}
          y={midY - 8}
          fontSize={10}
          fill="#374151"
          textAnchor="middle"
        >
          {edge.label.length > 20 ? `${edge.label.slice(0, 20)}...` : edge.label}
        </SvgText>
      )}
    </G>
  );
};
