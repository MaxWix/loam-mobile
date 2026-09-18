import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { colors, typography, layout, buttons, spacing } from "../../lib/theme";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    id: 1,
    text: "With Loam, we ditch doomscrolling to shift the focus back to you and the people you care about. Your feed populates chronologically and resets every 72hrs, with the most recent posts from your buds appearing first. Only your buds can see your posts.",
  },
  {
    id: 2,
    text: "Your profile is an ever-evolving reflection of you. Only your 10 most-recent posts added to your profile are visible. Fill it with everything from songs you're loving, food, shows, shower thoughts, and more. Not all posts need to go on your profile!",
  },
  {
    id: 3,
    text: "Your connections should be real and meaningful, which is why we limit buds to 150. After onboarding, you can share your profile link (the share button on your profile) to connect with friends.",
  },
  {
    id: 4,
    text: "Lastly, Loam is built to support authentic sharing. But that requires you to commit to authenticity as well. Your buds appreciate you for who you are, so be yourself on loam.",
  },
];

export default function WelcomeScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      router.push("/onboarding/age-verify");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>loam</Text>

      <View style={styles.slideContainer}>
        <Text style={styles.slideText}>{SLIDES[currentSlide].text}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentSlide && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {currentSlide < SLIDES.length - 1 ? "Next" : "Get Started"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...layout.screen,
    ...layout.screenContent,
  },
  wordmark: layout.wordmark,
  slideContainer: {
    flex: 1,
    justifyContent: "center",
  },
  slideText: {
    ...typography.hg20,
    color: colors.brown500,
    lineHeight: 30,
  },
  footer: {
    gap: spacing.lg,
  },
  dots: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brown100,
  },
  dotActive: {
    backgroundColor: colors.brown500,
  },
  button: buttons.primary,
  buttonText: buttons.primaryText,
});
