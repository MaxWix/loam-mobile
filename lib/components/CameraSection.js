import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  AccessibilityInfo,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { MaterialIcons } from "@expo/vector-icons";
import { PinchGestureHandler, State } from "react-native-gesture-handler";
import { colors, fonts, spacing } from "../theme";

export default function CameraSection({
  onCapture,
  onPickImage,
  imageUri,
  onClear,
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState("off");
  const [facing, setFacing] = useState("back");
  const [zoom, setZoom] = useState(0);
  const cameraRef = useRef(null);
  // Zoom at the moment the current pinch gesture began. Pinch events give
  // a `scale` relative to gesture start, not an absolute value, so each
  // new pinch needs to build on top of wherever zoom already was rather
  // than overwriting it from zero.
  const zoomStartRef = useRef(0);
  const spin = useRef(new Animated.Value(0)).current;
  const spinTarget = useRef(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => sub?.remove();
  }, []);

  if (imageUri) {
    return (
      <View style={styles.previewContainer}>
        <Image
          source={{ uri: imageUri }}
          style={styles.preview}
          resizeMode="cover"
        />
        <TouchableOpacity style={styles.clearButton} onPress={onClear}>
          <MaterialIcons name="close" size={18} color={colors.brown700} />
        </TouchableOpacity>
      </View>
    );
  }

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera access is needed to take photos
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    onCapture(photo.uri);
  };

  const flipCamera = () => {
    if (!reduceMotion) {
      spinTarget.current += 1;
      Animated.timing(spin, {
        toValue: spinTarget.current,
        duration: 350,
        easing: Easing.bezier(0.2, 0, 0.2, 1),
        useNativeDriver: true,
      }).start();
    }
    setFacing((f) => {
      const next = f === "back" ? "front" : "back";
      if (next === "front") setZoom(0);
      return next;
    });
  };

  // Only meaningful on the back camera — see flipCamera above.
  const onPinchGestureEvent = ({ nativeEvent }) => {
    if (facing !== "back") return;
    const next = zoomStartRef.current + (nativeEvent.scale - 1) * 0.5;
    setZoom(Math.max(0, Math.min(1, next)));
  };

  const onPinchHandlerStateChange = ({ nativeEvent }) => {
    if (nativeEvent.state === State.BEGAN) {
      zoomStartRef.current = zoom;
    }
  };

  // expo-camera's `zoom` prop is a device-relative 0–1 range, not a true
  // optical multiplier — this is an approximate label for user feedback,
  // not an exact "Nx" reading.
  const zoomLabel = `${(1 + zoom * 9).toFixed(1)}x`;

  const flashOn = flash === "on";

  return (
    <View style={styles.container}>
      <PinchGestureHandler
        onGestureEvent={onPinchGestureEvent}
        onHandlerStateChange={onPinchHandlerStateChange}
        enabled={facing === "back"}
      >
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          flash={flash}
          facing={facing}
          zoom={zoom}
        >
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.controlButton, styles.blobA]}
              onPress={flipCamera}
              accessibilityLabel="Switch camera"
            >
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: spin.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "180deg"],
                      }),
                    },
                  ],
                }}
              >
                <MaterialIcons
                  name="cameraswitch"
                  size={20}
                  color={colors.white200}
                />
              </Animated.View>
            </TouchableOpacity>
            {/* Struck-through bolt = flash off, plain bolt = flash on.
                The lime fill on the "on" state gives a second, non-icon
                cue that it's armed, same lime used for active chips
                elsewhere in the app. */}
            <TouchableOpacity
              style={[
                styles.controlButton,
                styles.blobB,
                flashOn && styles.controlButtonActive,
              ]}
              onPress={() => setFlash((f) => (f === "off" ? "on" : "off"))}
              accessibilityLabel={flashOn ? "Turn flash off" : "Turn flash on"}
              accessibilityState={{ selected: flashOn }}
            >
              <MaterialIcons
                name={flashOn ? "flash-on" : "flash-off"}
                size={20}
                color={flashOn ? colors.brown700 : colors.white200}
              />
            </TouchableOpacity>
          </View>

          {facing === "back" && zoom > 0 && (
            <View style={styles.zoomBadge} pointerEvents="none">
              <Text style={styles.zoomBadgeText}>{zoomLabel}</Text>
            </View>
          )}

          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[styles.galleryButton, styles.blobA]}
              onPress={onPickImage}
              accessibilityLabel="Choose from library"
            >
              <MaterialIcons
                name="photo-library"
                size={22}
                color={colors.white200}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shutter}
              onPress={takePicture}
              accessibilityLabel="Take photo"
            >
              <View style={styles.shutterInner} />
            </TouchableOpacity>

            <View style={styles.bottomBarSpacer} />
          </View>
        </CameraView>
      </PinchGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  camera: {
    flex: 1,
    justifyContent: "space-between",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
  },
  controlButton: {
    width: 40,
    height: 40,
    // Tinted with brown rather than neutral black so the controls read as
    // part of the app over any photo subject.
    backgroundColor: "rgba(70,43,1,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlButtonActive: {
    backgroundColor: colors.lime500,
  },
  // The same lopsided blob radii as PostCard's reaction/comment buttons.
  // Two mirrored variants so adjacent controls aren't identical — hand-cut
  // rather than stamped, matching how the post cards vary their buttons.
  blobA: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 25,
  },
  blobB: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 25,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 22,
  },
  zoomBadge: {
    alignSelf: "center",
    backgroundColor: "rgba(70,43,1,0.55)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 14,
  },
  zoomBadgeText: {
    color: colors.white200,
    fontFamily: fonts.primaryBold,
    fontSize: 13,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: "rgba(70,43,1,0.3)",
  },
  galleryButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(70,43,1,0.45)",
  },
  // Left round on purpose: the shutter is the one control people find by
  // muscle memory, so it keeps the universal camera shape while everything
  // around it carries the branding.
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.white200,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white200,
  },
  previewContainer: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: spacing.sm,
    position: "relative",
  },
  preview: {
    width: "100%",
    height: "100%",
  },
  clearButton: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 17,
    borderBottomLeftRadius: 17,
    borderBottomRightRadius: 20,
    backgroundColor: colors.clay300,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionContainer: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 16,
    backgroundColor: colors.brown100,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  permissionText: {
    fontFamily: fonts.primary,
    fontSize: 15,
    color: colors.brown500,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
  permissionButton: {
    backgroundColor: colors.brown500,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    borderRadius: 44,
  },
  permissionButtonText: {
    fontFamily: fonts.primaryBold,
    fontSize: 14,
    color: colors.white200,
  },
  bottomBarSpacer: {
    width: 44,
    height: 44,
  },
});
