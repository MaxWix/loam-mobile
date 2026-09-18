import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { colors, fonts, spacing } from "../../../lib/theme";
import { MaterialIcons } from "@expo/vector-icons";

const PRIVACY_POLICY = [
  {
    title: "1. Who We Are",
    body: "Loam is a social sharing application operated in the United States. If you have any questions about this policy, you can reach us at privacy@loam.ing.",
    email: "privacy@loam.ing",
  },
  {
    title: "2. What We Collect",
    body: "When you create an account, we collect your name, email address, content you post or share, and your connections. We collect minimal technical data like crash logs to operate the service. We do not build behavioral profiles, track your activity for advertising, or share your data with third parties.",
  },
  {
    title: "3. How We Use Your Information",
    body: "We use information solely to create and maintain your account, deliver content from your connections to your feed, send essential service communications, and diagnose technical issues. We do not use your information for advertising or behavioral profiling.",
  },
  {
    title: "4. How We Share Your Information",
    body: "We do not sell your data. We do not share your data with advertisers, data brokers, or marketing partners. Ever. We may share with service providers solely to operate Loam, or if required by law.",
  },
  {
    title: "5. Data Retention",
    body: "We retain your account information for as long as your account is active. Content you delete is removed within 30 days. If you delete your account, we will delete all personal information within 90 days, except where retention is required by law.",
  },
  {
    title: "6. Your Rights",
    body: "You have the right to access, correct, or delete your personal information, and to export a copy of your data. Contact us at privacy@loam.ing and we will respond within 30 days.",
    email: "privacy@loam.ing",
  },
  {
    title: "7. Children's Privacy",
    body: "Loam is not intended for anyone under the age of 16. We do not knowingly collect personal information from users under 16.",
  },
  {
    title: "8. Security",
    body: "We use industry-standard security practices including encrypted data transmission and secure storage. We will notify you of any breach affecting your personal data as required by law.",
  },
  {
    title: "9. Changes to This Policy",
    body: "We may update this Privacy Policy from time to time. If we make material changes, we will notify you through the app or by email at least 14 days before the changes take effect.",
  },
];

const TERMS = [
  {
    title: "1. Eligibility",
    body: "You must be at least 16 years old to use Loam. By creating an account, you confirm that you meet this age requirement.",
  },
  {
    title: "2. Your Account",
    body: "You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. Notify us at support@loam.ing if you suspect unauthorized access.",
    email: "support@loam.ing",
  },
  {
    title: "3. Acceptable Use",
    body: "You agree not to post illegal, harassing, or abusive content, impersonate others, spam or phish, scrape data, or use Loam for any commercial purpose. We may remove violating content and suspend repeat violators.",
  },
  {
    title: "4. Your Content",
    body: "You retain ownership of the content you post. By posting, you grant us a limited license to store and deliver that content to your connections within the app. We do not use your content for advertising or AI training.",
  },
  {
    title: "5. Privacy",
    body: "Our Privacy Policy explains how we collect and use your information and is incorporated into these Terms by reference. We do not sell your data or use it for advertising.",
  },
  {
    title: "6. The 150-Connection Limit",
    body: "Loam limits each user to a maximum of 150 connections. This limit is intentional and core to how Loam works. Attempting to circumvent this limit is a violation of these Terms.",
  },
  {
    title: "7. Termination",
    body: "You may delete your account at any time through app settings. We may suspend or terminate accounts that violate these Terms, generally with reasonable notice except in cases of serious violations.",
  },
  {
    title: "8. Disclaimers",
    body: 'Loam is provided "as is" without warranties of any kind. We do not guarantee the service will be uninterrupted or error-free.',
  },
  {
    title: "9. Limitation of Liability",
    body: "To the fullest extent permitted by law, Loam shall not be liable for indirect, incidental, or consequential damages. Our total liability shall not exceed $100 or the amount you paid us in the preceding 12 months.",
  },
  {
    title: "10. Changes to These Terms",
    body: "We may update these Terms from time to time. We will notify you through the app or by email at least 14 days before material changes take effect.",
  },
  {
    title: "11. Contact",
    body: "Questions about these Terms? Contact us at support@loam.ing.",
    email: "support@loam.ing",
  },
];

export default function LegalScreen() {
  const [activeTab, setActiveTab] = useState("privacy");
  const sections = activeTab === "privacy" ? PRIVACY_POLICY : TERMS;

  const intro =
    activeTab === "privacy"
      ? "Loam is built on a simple belief: your data belongs to you. This Privacy Policy explains what information we collect, why we collect it, and what we do (and do not do) with it."
      : "These Terms of Service govern your use of the Loam application. By creating an account, you agree to these terms. Please read them carefully.";

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={12}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.brown500} />
        </TouchableOpacity>
      </TouchableOpacity>

      <Text style={styles.title}>Legal</Text>
      <Text style={styles.subtitle}>Effective May 15, 2026</Text>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "privacy" && styles.tabActive]}
          onPress={() => setActiveTab("privacy")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "privacy" && styles.tabTextActive,
            ]}
          >
            Privacy Policy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "terms" && styles.tabActive]}
          onPress={() => setActiveTab("terms")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "terms" && styles.tabTextActive,
            ]}
          >
            Terms of Service
          </Text>
        </TouchableOpacity>
      </View>

      {/* Intro callout */}
      <View style={styles.intro}>
        <Text style={styles.introText}>{intro}</Text>
      </View>

      {/* Sections */}
      {sections.map((section, i) => (
        <View key={i} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionBody}>
            {section.body}
            {section.email ? (
              <Text
                style={styles.link}
                onPress={() => Linking.openURL(`mailto:${section.email}`)}
              >
                {" "}
                {section.email}
              </Text>
            ) : null}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 24,
    color: colors.brown900,
    marginBottom: -spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.brown300,
  },
  tabs: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: colors.brown100,
  },
  tabActive: {
    backgroundColor: colors.brown500,
    borderColor: colors.brown500,
  },
  tabText: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.brown300,
  },
  tabTextActive: {
    color: colors.white200,
    fontFamily: fonts.primaryBold,
  },
  intro: {
    backgroundColor: colors.brown50,
    borderLeftWidth: 3,
    borderLeftColor: colors.lime500,
    borderRadius: 8,
    padding: spacing.md,
  },
  introText: {
    fontFamily: fonts.primary,
    fontSize: 15,
    color: colors.brown500,
    lineHeight: 24,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.brown900,
  },
  sectionBody: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.brown500,
    lineHeight: 22,
  },
  link: {
    color: colors.brown500,
    textDecorationLine: "underline",
  },
});
