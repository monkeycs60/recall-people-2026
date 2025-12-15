import { Circle, Text as SvgText, G } from 'react-native-svg';
import { GraphNode as GraphNodeType } from '@/types';

type GraphNodeProps = {
  node: GraphNodeType;
  isSelected: boolean;
  onPress: (node: GraphNodeType) => void;
};

const NODE_RADIUS = 24;

export const GraphNode = ({ node, isSelected, onPress }: GraphNodeProps) => {
  const handlePress = () => {
    onPress(node);
  };

  return (
    <G onPress={handlePress}>
      <Circle
        cx={node.x}
        cy={node.y}
        r={NODE_RADIUS}
        fill={isSelected ? '#3b82f6' : '#6366f1'}
        stroke={isSelected ? '#1d4ed8' : '#4f46e5'}
        strokeWidth={2}
      />
      <SvgText
        x={node.x}
        y={node.y + 5}
        fontSize={16}
        fontWeight="bold"
        fill="white"
        textAnchor="middle"
      >
        {node.label}
      </SvgText>
    </G>
  );
};
