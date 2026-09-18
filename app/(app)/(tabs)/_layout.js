import { useEffect, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../../lib/theme";

import HomeActive from "../../../assets/icons/HomeActive.svg";
import HomeInactive from "../../../assets/icons/HomeInactive.svg";
import AddActive from "../../../assets/icons/AddActive.svg";
import AddInactive from "../../../assets/icons/AddInactive.svg";
import ProfileActive from "../../../assets/icons/ProfileActive.svg";
import ProfileInactive from "../../../assets/icons/ProfileInactive.svg";

// Active icons are drawn on a 46x49 background blob with the glyph centered
// inside, while inactive icons are just the bare glyph on a tight ~24px
// canvas. Rendering both at the same width/height shrinks the active
// glyph, so we size each group by its native proportions instead of one
// shared value. Centering is handled via `tabBarIconStyle` (the library's
// real icon container), not a nested View.
const ACTIVE_ICON_WIDTH = 40;
const ACTIVE_ICON_HEIGHT = ACTIVE_ICON_WIDTH * (49 / 46);
const INACTIVE_ICON_SIZE = 24;
const TAB_WAVE_PATH =
  "M0 24 L0 12 C60 2, 140 18, 200 9 C255 1, 330 16, 390 5 L390 24 Z";
const TAB_WAVE_HEIGHT = 22;

const ICON_SLOT_STYLE = {
  width: 44,
  height: 44,
  alignItems: "center",
  justifyContent: "center",
};

function OrganicTabBarBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.brown50 }]}
      />
      <Svg
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: -TAB_WAVE_HEIGHT + 1, // 1px overlap avoids a hairline seam
          height: TAB_WAVE_HEIGHT,
        }}
        viewBox="0 0 390 24"
        preserveAspectRatio="none"
      >
        <Path d={TAB_WAVE_PATH} fill={colors.brown50} />
      </Svg>
    </View>
  );
}

// Shrinks slightly on tap-out, springs back up (a bit past 1) on tap-in —
// gives the tab bar a bit of bounce whenever the selection changes.
function AnimatedTabIcon({ focused, ActiveIcon, InactiveIcon }) {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.9)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.08 : 0.9,
      useNativeDriver: true,
      tension: 260,
      friction: 12,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      {focused ? (
        <ActiveIcon width={ACTIVE_ICON_WIDTH} height={ACTIVE_ICON_HEIGHT} />
      ) : (
        <InactiveIcon width={INACTIVE_ICON_SIZE} height={INACTIVE_ICON_SIZE} />
      )}
    </Animated.View>
  );
}

// Only the three real, visible tabs live here now. Every other screen
// (posts/[id], user/[username], settings/*, profile/edit, connections,
// notifications) was previously registered here too via `href: null` —
// that's what was breaking back navigation. They now live as plain
// sibling routes under (app), pushed onto the outer Stack instead.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        sceneStyle: { backgroundColor: "transparent" },
        tabBarBackground: () => <OrganicTabBarBackground />,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0, // kill the default straight line
          elevation: 0, // Android shadow
          shadowOpacity: 0, // iOS shadow
          overflow: "visible",
        },
        tabBarActiveTintColor: colors.brown500,
        tabBarInactiveTintColor: colors.brown300,
        tabBarIconStyle: ICON_SLOT_STYLE,
        tabBarItemStyle: {
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              ActiveIcon={HomeActive}
              InactiveIcon={HomeInactive}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="create-post"
        options={{
          title: "Post",
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              ActiveIcon={AddActive}
              InactiveIcon={AddInactive}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              ActiveIcon={ProfileActive}
              InactiveIcon={ProfileInactive}
            />
          ),
        }}
      />
    </Tabs>
  );
}
