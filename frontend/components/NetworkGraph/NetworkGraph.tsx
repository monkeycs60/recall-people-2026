import { useState, useMemo } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Svg from 'react-native-svg';
import { GraphNode } from './GraphNode';
import { GraphEdge } from './GraphEdge';
import { NetworkData, GraphNode as GraphNodeType, GraphEdge as GraphEdgeType } from '@/types';

type NetworkGraphProps = {
  data: NetworkData;
  onNodePress: (node: GraphNodeType) => void;
  onEdgePress: (edge: GraphEdgeType) => void;
};

const GRAPH_WIDTH = 350;
const GRAPH_HEIGHT = 400;

export const NetworkGraph = ({ data, onNodePress, onEdgePress }: NetworkGraphProps) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const screenWidth = Dimensions.get('window').width;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const nodesMap = useMemo(() => {
    const map = new Map<string, GraphNodeType>();
    for (const node of data.nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [data.nodes]);

  const handleNodePress = (node: GraphNodeType) => {
    setSelectedNodeId(node.id);
    onNodePress(node);
  };

  const handleEdgePress = (edge: GraphEdgeType) => {
    onEdgePress(edge);
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 0.5) {
        scale.value = withSpring(0.5);
        savedScale.value = 0.5;
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
        savedScale.value = 3;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withSpring(1);
      savedScale.value = 1;
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });

  const composedGesture = Gesture.Simultaneous(
    Gesture.Race(doubleTapGesture, panGesture),
    pinchGesture
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (data.nodes.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.svgContainer, animatedStyle]}>
          <Svg
            width={screenWidth - 32}
            height={GRAPH_HEIGHT}
            viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
          >
            {data.edges.map((edge) => {
              const sourceNode = nodesMap.get(edge.source);
              const targetNode = nodesMap.get(edge.target);
              if (!sourceNode || !targetNode) return null;

              return (
                <GraphEdge
                  key={edge.id}
                  edge={edge}
                  sourceNode={sourceNode}
                  targetNode={targetNode}
                  showLabel={data.edges.length <= 10}
                  onPress={handleEdgePress}
                />
              );
            })}
            {data.nodes.map((node) => (
              <GraphNode
                key={node.id}
                node={node}
                isSelected={node.id === selectedNodeId}
                onPress={handleNodePress}
              />
            ))}
          </Svg>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: GRAPH_HEIGHT,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    overflow: 'hidden',
  },
  svgContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
