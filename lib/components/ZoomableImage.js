import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  Easing,
  withTiming,
} from "react-native-reanimated";

const SPRING = { damping: 18, stiffness: 180 };

export default function ZoomableImage({ source, style, resizeMode = "cover" }) {
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  // Focal point (pinch origin) relative to the image center
  const ox = useSharedValue(0);
  const oy = useSharedValue(0);
  const size = useSharedValue({ w: 0, h: 0 });

  const RESET_DURATION = 220;

  const reset = () => {
    "worklet";
    scale.value = withTiming(1, {
      duration: RESET_DURATION,
      easing: Easing.out(Easing.cubic),
    });
    tx.value = withTiming(0, {
      duration: RESET_DURATION,
      easing: Easing.out(Easing.cubic),
    });
    ty.value = withTiming(0, {
      duration: RESET_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  };

  const pinch = Gesture.Pinch()
    .onStart((e) => {
      ox.value = e.focalX - size.value.w / 2;
      oy.value = e.focalY - size.value.h / 2;
    })
    .onUpdate((e) => {
      scale.value = Math.max(1, e.scale);
    })
    .onEnd(reset);

  // Two-finger drag so you can move around while zoomed; minPointers(2)
  // keeps it from fighting with the feed ScrollView's one-finger scroll.
  const pan = Gesture.Pan()
    .minPointers(2)
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd(reset);

  const gesture = Gesture.Simultaneous(pinch, pan);

  const animatedStyle = useAnimatedStyle(() => {
    const s = Math.max(scale.value, 0.01);
    return {
      transform: [
        { translateX: tx.value },
        { translateY: ty.value },
        { translateX: ox.value },
        { translateY: oy.value },
        { scale: s },
        { translateX: -ox.value },
        { translateY: -oy.value },
      ],
    };
  });
  return (
    <GestureDetector gesture={gesture}>
      <Animated.Image
        source={source}
        resizeMode={resizeMode}
        style={[style, animatedStyle]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          size.value = { w: width, h: height };
        }}
      />
    </GestureDetector>
  );
}
