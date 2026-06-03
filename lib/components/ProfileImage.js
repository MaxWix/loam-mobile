import { View } from "react-native";
import Svg, { Path, Defs, ClipPath, Image as SvgImage } from "react-native-svg";
import { colors } from "../theme";

const SHAPES = {
  large: {
    width: 98.43,
    height: 94,
    viewBox: "0 0 99 94",
    path: "M98.434 39.4464C98.434 65.8673 77.1457 94 50.8854 94C24.625 94 0 72.5816 0 46.1607C0 19.7398 22.9566 0 49.217 0C75.4774 0 98.434 13.0255 98.434 39.4464Z",
  },
  small: {
    width: 40,
    height: 38,
    viewBox: "0 0 25 24",
    path: "M25 10.0714C25 16.8172 19.5933 24 12.9237 24C6.25419 24 0 18.5315 0 11.7857C0 5.03995 5.83046 0 12.5 0C19.1695 0 25 3.32567 25 10.0714Z",
  },
};

const PLACEHOLDER_PATH =
  "M63.4563 6.97342C59.1181 2.47644 53.0588 0 46.3709 0C39.6473 0 33.568 2.46146 29.2498 6.93061C24.8848 11.449 22.7581 17.5898 23.2574 24.2208C24.2473 37.3029 34.6158 47.945 46.3709 47.945C58.1261 47.945 68.4768 37.305 69.4822 24.225C69.9882 17.654 67.8481 11.5261 63.4563 6.97342ZM85.6068 95.8899H7.13507C6.10794 95.9027 5.09076 95.6956 4.15752 95.2835C3.22428 94.8714 2.39846 94.2647 1.74014 93.5077C0.291085 91.8446 -0.292994 89.5736 0.139492 87.277C2.02103 77.2556 7.89303 68.8374 17.1224 62.9278C25.3218 57.6816 35.7081 54.7942 46.3709 54.7942C57.0337 54.7942 67.4201 57.6838 75.6195 62.9278C84.8488 68.8353 90.7208 77.2535 92.6023 87.2748C93.0348 89.5715 92.4508 91.8424 91.0017 93.5055C90.3436 94.263 89.5179 94.87 88.5846 95.2825C87.6514 95.695 86.6341 95.9025 85.6068 95.8899Z";

let idCounter = 0;

export default function ProfileImage({
  src,
  alt = "Profile image",
  variant = "large",
}) {
  const shape = SHAPES[variant] || SHAPES.large;
  const clipId = `clip-${idCounter++}`;

  return (
    <View>
      <Svg
        width={shape.width}
        height={shape.height}
        viewBox={shape.viewBox}
        fill="none"
      >
        <Defs>
          <ClipPath id={clipId}>
            <Path d={shape.path} />
          </ClipPath>
        </Defs>

        {src ? (
          <SvgImage
            href={src}
            x="0"
            y="0"
            width={shape.viewBox.split(" ")[2]}
            height={shape.viewBox.split(" ")[3]}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
        ) : (
          <>
            <Path d={shape.path} fill={colors.brown50} />
            <Path
              d={PLACEHOLDER_PATH}
              fill={colors.brown500}
              transform={
                variant === "small"
                  ? "translate(4, 4) scale(0.18)"
                  : "translate(15, 12) scale(0.7)"
              }
            />
          </>
        )}
      </Svg>
    </View>
  );
}
