import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  Keyboard,
  Animated,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import PagerView from "react-native-pager-view";

import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useAuth } from "../../../lib/stores/auth";
import { API_URL } from "../../../lib/config";
import ColorPicker from "../../../lib/components/ColorPicker";
import SearchBar from "../../../lib/components/SearchBar";
import ResultItem from "../../../lib/components/ResultItem";
import Button from "../../../lib/components/Button";
import { colors, fonts, spacing, radius } from "../../../lib/theme";
import {
  getImage,
  getSubtitle,
  getTitle,
  smartMerge,
} from "../../../lib/utils/mediaUtils";
import Tabs from "../../../lib/components/Tabs";
import Input from "../../../lib/components/Input";
import CameraSection from "../../../lib/components/CameraSection";
import FadeInScreen from "../../../lib/components/FadeInScreen";
import BranchButton from "../../../lib/components/BranchButton";
import BlobScene from "../../../lib/components/BlobScene";
import WhiteOnBrownLogo from "../../../assets/whiteOnBrownLogo.svg";

const POST_TABS = [
  { id: "text", label: "Text" },
  { id: "photo", label: "Photo" },
  { id: "listening", label: "Listening" },
  { id: "watching", label: "Watching" },
  { id: "reading", label: "Reading" },
];

const SEARCH_PLACEHOLDERS = {
  listening: "Search for music or podcasts...",
  watching: "Search for movies or TV shows...",
  reading: "Search for books...",
};

// Same organic blob as PostCard's CARD_BLOB_PATH, so the create-post
// preview has the same hand-drawn edges as the card it'll become.
const CARD_BLOB_PATH =
  "M8.89625 347.555C-8.76673 336.514 4.74257 81.5901 8.16367 21.794C8.5866 14.4018 13.9813 8.49062 21.3318 7.59935C53.6813 3.67685 150.966 -4.93056 334.343 3.73077C373.519 5.58116 359.107 276.701 355.063 342.04C354.563 350.115 348.148 356.384 340.066 356.742C279.454 359.425 42.3656 368.476 8.89625 347.555Z";

const BG_COLORS = {
  F5F5E1: colors.lime300,
  F5EDEB: colors.clay100,
  ECEDE2: colors.green100,
  F3EEE4: colors.brown100,
};

function getSubtitleFromResult(item, category) {
  if (category === "listening") {
    const parts = [item.album, item.artist].filter(Boolean);
    return parts.join(" • ");
  }
  if (category === "watching") {
    return item.year || item.release_date?.slice(0, 4) || "";
  }
  if (category === "reading") {
    return item.author || "";
  }
  return "";
}

export default function CreatePostScreen() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState("text");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [color, setColor] = useState("F5F5E1");
  const [imageUri, setImageUri] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [includeOnProfile, setIncludeOnProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [captionContainerHeight, setCaptionContainerHeight] = useState(0);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const searchTimeout = useRef(null);
  const pagerRef = useRef(null);
  // Continuous page position (2.4 = 40% of the way from page 2 to 3),
  // fed by onPageScroll below. BlobScene interpolates off it so the
  // background blobs track a swipe in progress rather than snapping
  // once it settles — and a tab tap animates the pager, which drives
  // the same value, so both inputs share one animation path.
  const pageProgress = useRef(new Animated.Value(0)).current;
  // Per-tab refs so the caption can be scrolled into view on focus —
  // PagerView keeps every page mounted, so these are keyed by tab id.
  const scrollRefs = useRef({});
  const captionRefs = useRef({});

  const token = session?.access_token;

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/branches`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : { branches: [] }))
      .then((data) => {
        setBranches(
          (data.branches || []).map((b) => ({
            id: b.id,
            name: b.name || "Unnamed",
            emoji: b.emoji || "✨",
            color: b.color || "B6AFA3",
          })),
        );
      })
      .catch(() => {});
  }, [token]);

  const isMediaTab = ["listening", "watching", "reading"].includes(activeTab);
  const isSearchTab = isMediaTab;
  const isPhotoTab = activeTab === "photo";
  const hasSelectedItem = !!selectedItem;
  const showForm = !isSearchTab || hasSelectedItem;
  const finalIsProfileItem = isMediaTab ? true : includeOnProfile;
  const bgColor = BG_COLORS[color] || colors.lime100;

  const resetForm = () => {
    setTitle("");
    setCaption("");
    setImageUri(null);
    setImageUrl("");
    setSelectedItem(null);
    setSearchQuery("");
    setSearchResults([]);
    setCaptionContainerHeight(0);
  };

  const resetAll = () => {
    resetForm();
    setColor("F5F5E1");
    setSelectedBranchId(null);
    setIncludeOnProfile(false);
  };
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    resetForm();
  };

  // Tapping a tab pill: update state immediately for a snappy highlight,
  // then animate the pager to match. onPageSelected below is guarded so
  // it won't re-run handleTabChange once the animation settles here.
  const handleTabPress = (tabId) => {
    const index = POST_TABS.findIndex((t) => t.id === tabId);
    if (index === -1) return;
    handleTabChange(tabId);
    pagerRef.current?.setPage(index);
    settleProgress(index);
  };

  // Swiping the pager: the source of truth for swipe-driven tab changes.
  // Guarded against firing again when the page change was caused by a
  // tab tap (which already updated activeTab above).
  // Tracks whether onPageScroll is actually firing. It doesn't on every
  // PagerView build (notably under the New Architecture), and since it's
  // the only thing that moved pageProgress, the blobs stayed pinned at
  // page 0 — invisible, but still laid out over the screen. When it
  // isn't firing we fall back to animating on page *selection* instead.
  const pageScrollWorks = useRef(false);

  const onPageScroll = (e) => {
    const { position, offset } = e.nativeEvent;
    pageScrollWorks.current = true;
    pageProgress.setValue(position + offset);
  };

  const settleProgress = (index) => {
    if (pageScrollWorks.current) return; // the live scroll already has it
    Animated.timing(pageProgress, {
      toValue: index,
      duration: 320,
      useNativeDriver: true,
    }).start();
  };

  const onPageSelected = (e) => {
    const index = e.nativeEvent.position;
    settleProgress(index);
    const tabId = POST_TABS[index]?.id;
    if (tabId && tabId !== activeTab) {
      handleTabChange(tabId);
    }
  };

  const handleSearch = useCallback(
    async (query) => {
      setSearchQuery(query);
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      searchTimeout.current = setTimeout(async () => {
        setSearching(true);
        try {
          let results = [];
          if (activeTab === "reading") {
            const res = await fetch(
              `${API_URL}/api/books?q=${encodeURIComponent(query)}`,
              {
                headers: { Authorization: `Bearer ${session.access_token}` },
              },
            );
            const json = await res.json();
            if (res.ok) results = json;
          } else if (activeTab === "watching") {
            const [mRes, tRes] = await Promise.all([
              fetch(
                `${API_URL}/api/tmdb?q=${encodeURIComponent(query)}&type=movie`,
                {
                  headers: { Authorization: `Bearer ${session.access_token}` },
                },
              ),
              fetch(
                `${API_URL}/api/tmdb?q=${encodeURIComponent(query)}&type=tv`,
                {
                  headers: { Authorization: `Bearer ${session.access_token}` },
                },
              ),
            ]);
            const movies = mRes.ok
              ? (await mRes.json()).map((i) => ({ ...i, media_type: "movie" }))
              : [];
            const tv = tRes.ok
              ? (await tRes.json()).map((i) => ({ ...i, media_type: "tv" }))
              : [];
            results = smartMerge(movies, tv, query);
          } else if (activeTab === "listening") {
            const [mRes, pRes] = await Promise.all([
              fetch(
                `${API_URL}/api/spotify?q=${encodeURIComponent(query)}&category=music`,
                {
                  headers: { Authorization: `Bearer ${session.access_token}` },
                },
              ),
              fetch(
                `${API_URL}/api/spotify?q=${encodeURIComponent(query)}&category=podcast`,
                {
                  headers: { Authorization: `Bearer ${session.access_token}` },
                },
              ),
            ]);
            const music = mRes.ok ? await mRes.json() : [];
            const pods = pRes.ok ? await pRes.json() : [];
            results = smartMerge(music, pods, query);
          }
          console.log(
            "Results count:",
            results.length,
            "activeTab:",
            activeTab,
          );
          console.log("API_URL:", API_URL);
          console.log(
            "Fetching:",
            `${API_URL}/api/spotify?q=test&category=music`,
          );
          setSearchResults(results);
        } catch (e) {
          console.error("Search error", e);
        } finally {
          setSearching(false);
        }
      }, 600);
    },
    [activeTab, session],
  );

  const handleSelectResult = (item) => {
    setSelectedItem(item);
    setTitle(getTitle(item));
    setImageUrl(getImage(item, activeTab) || "");
    setSearchResults([]);
    setSearchQuery("");
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return Alert.alert(
        "Permission needed",
        "Please allow access to your photo library.",
      );
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    // 1. Get signature from backend
    const sigRes = await fetch(`${API_URL}/api/cloudinarySignature`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!sigRes.ok) throw new Error("Could not get upload signature");
    const { signature, timestamp, folder, transformation } =
      await sigRes.json();

    // 2. Read image as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const filename = uri.split("/").pop();
    const match = /\.(\w+)$/.exec(filename);
    const mimeType = match ? `image/${match[1]}` : "image/jpeg";
    const dataUri = `data:${mimeType};base64,${base64}`;

    // 3. Upload directly to Cloudinary
    const fd = new FormData();
    fd.append("file", dataUri);
    fd.append("api_key", process.env.EXPO_PUBLIC_CLOUDINARY_KEY);
    fd.append("timestamp", String(timestamp));
    fd.append("signature", signature);
    fd.append("folder", folder);
    fd.append("transformation", transformation);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.EXPO_PUBLIC_CLOUDINARY_NAME}/image/upload`,
      { method: "POST", body: fd },
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? "Cloudinary upload failed");
    }

    const data = await uploadRes.json();
    return data.secure_url;
  };

  const handlePost = async () => {
    if (!title && activeTab === "text") {
      return Alert.alert("Required", "Please write a title.");
    }
    setLoading(true);
    try {
      let finalImageUrl = imageUrl;
      if (imageUri) {
        finalImageUrl = await uploadImage(imageUri);
      }

      const res = await fetch(`${API_URL}/api/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          caption: caption || "",
          color,
          category: activeTab,
          is_profile_item: finalIsProfileItem,
          image_url: finalImageUrl || undefined,
          subtitle: selectedItem
            ? getSubtitle(selectedItem, activeTab)
            : undefined,
          branch_id: selectedBranchId || undefined,
          ...(activeTab === "listening" && selectedItem
            ? {
                external_source: "spotify",
                external_id: selectedItem.id,
                external_type: selectedItem.type,
                external_url: selectedItem.external_urls?.spotify,
              }
            : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return Alert.alert("Error", data.error || "Could not create post.");
      }

      resetAll();
      pagerRef.current?.setPage(0);
      setActiveTab("text");
      router.replace("/(app)/feed");
    } catch (e) {
      Alert.alert("Error", e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // The caption sits near the bottom of a tall form (image + title +
  // color + branches), so on focus we explicitly scroll it up into the
  // space the keyboard insets opened. measureLayout gives its y within
  // the ScrollView's content; the short delay lets the keyboard's own
  // inset animation start first so we scroll against the final height.
  const handleCaptionFocus = (tabId) => {
    setTimeout(() => {
      const scroll = scrollRefs.current[tabId];
      const caption = captionRefs.current[tabId];
      if (!scroll || !caption) return;
      caption.measureLayout(
        scroll.getInnerViewNode(),
        (_x, y) => {
          scroll.scrollTo({ y: Math.max(0, y - 80), animated: true });
        },
        () => {},
      );
    }, 120);
  };

  const displayImage = imageUri || imageUrl;

  // Renders the search/form/color/branch/toggle content for a specific
  // tab id. Parameterized on tabId (rather than reading the shared
  // `activeTab` state) so each PagerView page renders correctly for its
  // own tab even while a neighboring page is pre-mounted during a swipe.
  const renderTabBody = (tabId) => {
    const isMediaTabLocal = ["listening", "watching", "reading"].includes(
      tabId,
    );
    const isSearchTabLocal = isMediaTabLocal;
    const isPhotoTabLocal = tabId === "photo";
    const showFormLocal = !isSearchTabLocal || hasSelectedItem;
    // Mount the live camera preview when this page is active OR one page
    // away from active, so it's already warmed up by the time a swipe
    // lands on it, without keeping it running on every distant tab.
    const tabIndex = POST_TABS.findIndex((t) => t.id === tabId);
    const activeIndex = POST_TABS.findIndex((t) => t.id === activeTab);
    const shouldMountCamera =
      isPhotoTabLocal && Math.abs(tabIndex - activeIndex) <= 1;

    return (
      <>
        {/* Search (media tabs) */}
        {isSearchTabLocal && !hasSelectedItem && (
          <View style={styles.searchSection}>
            <SearchBar
              placeholder={SEARCH_PLACEHOLDERS[tabId]}
              onSearch={handleSearch}
              autoFocus={tabId === activeTab}
            />
            {searching && (
              <ActivityIndicator
                color={colors.brown500}
                style={{ marginTop: spacing.md }}
              />
            )}
            {searchResults.length > 0 && (
              <View style={styles.results}>
                {searchResults.map((item, i) => (
                  <ResultItem
                    key={item.id || i}
                    item={item}
                    category={tabId}
                    onPress={() => handleSelectResult(item)}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Post form */}
        {showFormLocal && (
          <View style={styles.previewCard}>
            {/* Organic card edge — matches PostCard: the blob is sliced
                to cover, and previewCard clips it so it can't paint
                past the card's bounds. pointerEvents none so it never
                eats taps meant for the fields on top of it. */}
            <Svg
              style={StyleSheet.absoluteFill}
              viewBox="0 0 361 361"
              preserveAspectRatio="xMidYMid slice"
              pointerEvents="none"
            >
              <Path d={CARD_BLOB_PATH} fill={bgColor} />
            </Svg>

            {/* Reset selected item */}
            {hasSelectedItem && (
              <TouchableOpacity style={styles.trashButton} onPress={resetForm}>
                <Text style={styles.trashText}>✕</Text>
              </TouchableOpacity>
            )}

            {/* Image area — CameraSection is mounted when this page is
                active or one page away, so the camera is pre-warmed
                before a swipe actually lands on it. PagerView keeps
                every page mounted at once for smooth swiping, so without
                this guard the live camera preview would keep running in
                the background on every distant tab too, which is what
                was making transitions into/out of Photo look like a
                jump instead of a slide. */}
            {isPhotoTabLocal ? (
              shouldMountCamera ? (
                <CameraSection
                  onCapture={(uri) => setImageUri(uri)}
                  onPickImage={pickImage}
                  imageUri={imageUri}
                  onClear={() => setImageUri(null)}
                />
              ) : (
                <View style={styles.cameraPlaceholder} />
              )
            ) : displayImage ? (
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: displayImage }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                {!hasSelectedItem && (
                  <TouchableOpacity
                    style={styles.trashButton}
                    onPress={() => {
                      setImageUri(null);
                      setImageUrl("");
                    }}
                  >
                    <Text style={styles.trashText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            {/* Title + subtitle from selected item */}
            {hasSelectedItem ? (
              <View style={styles.selectedTextBlock}>
                <Text style={styles.selectedTitle}>{title}</Text>
                {selectedItem && (
                  <Text style={styles.selectedSubtitle}>
                    {getSubtitle(selectedItem, tabId)}
                  </Text>
                )}
              </View>
            ) : !isPhotoTabLocal || displayImage ? (
              <Input
                value={title}
                onChangeText={setTitle}
                placeholder="Write a title"
                organic
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
            ) : null}

            {/* Caption */}
            <View
              ref={(r) => (captionRefs.current[tabId] = r)}
              style={[
                styles.captionWrapper,
                { height: captionContainerHeight || undefined },
              ]}
            >
              <Svg
                style={StyleSheet.absoluteFill}
                viewBox="0 0 336 110"
                preserveAspectRatio="none"
              >
                <Path
                  d="M9.20624 105.903C-5.19317 102.93 2.86654 41.913 7.11283 15.193C8.26825 7.92246 14.3452 2.56426 21.7013 2.27498C52.5356 1.06237 142.15 -1.47283 309.41 1.13684C341.742 1.64128 334.506 67.8212 329.951 96.0143C328.764 103.366 322.45 108.589 315.004 108.698C259.603 109.51 40.1378 112.29 9.20624 105.903Z"
                  fill="transparent"
                />
                <Path
                  d="M2.69922 94.1426C1.50637 87.6418 1.29452 78.9449 1.66699 69.4727C2.41158 50.5374 5.48403 28.6269 7.60645 15.2715C8.72414 8.23833 14.6012 3.05451 21.7207 2.77441C52.5445 1.56222 142.149 -0.972805 309.402 1.63673C317.272 1.75951 322.736 5.86041 326.465 12.4561C330.209 19.0786 332.185 28.1942 333.015 38.2334C334.673 58.3024 331.734 81.8463 329.458 95.9346C328.311 103.036 322.211 108.093 314.996 108.198C287.296 108.604 218.583 109.502 152.929 109.5C120.101 109.499 88.042 109.273 62.2578 108.648C36.4495 108.023 16.9863 106.999 9.30762 105.413C7.69661 105.08 6.34937 103.93 5.24219 101.999C4.13293 100.064 3.29598 97.3948 2.69922 94.1426Z"
                  fill="none"
                  stroke={colors.brown500}
                  strokeOpacity={0.8}
                />
              </Svg>
              <TextInput
                style={styles.captionInput}
                value={caption}
                onChangeText={setCaption}
                placeholder="Write a caption"
                placeholderTextColor={colors.brown300}
                multiline
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
                onSubmitEditing={() => Keyboard.dismiss()}
                onFocus={() => handleCaptionFocus(tabId)}
                scrollEnabled={captionContainerHeight >= 20 * 15}
                onContentSizeChange={(e) => {
                  const h = Math.min(
                    e.nativeEvent.contentSize.height + 24,
                    20 * 15,
                  );
                  setCaptionContainerHeight(h);
                }}
              />
            </View>
          </View>
        )}

        {/* Color picker */}
        {showFormLocal && <ColorPicker value={color} onChange={setColor} />}

        {/* Branch picker — single-select, defaults to no branch (post
            just goes to the general feed). Uses disableTouch so tapping
            reliably toggles selection via a plain onPress, no drag/delete
            behavior needed here unlike the Connections/Feed branch row. */}
        {showFormLocal && branches.length > 0 && (
          <View style={styles.branchSection}>
            <Text style={styles.branchSectionLabel}>Post to a branch</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.branchRow}
            >
              <TouchableOpacity
                style={styles.branchChipWrapper}
                onPress={() => setSelectedBranchId(null)}
                activeOpacity={0.8}
              >
                <BranchButton
                  branch={{ id: "all", name: "all buds", color: "B6AFA3" }}
                  icon={WhiteOnBrownLogo}
                  isSelected={!selectedBranchId}
                  disableTouch
                />
              </TouchableOpacity>
              {branches.map((branch) => (
                <TouchableOpacity
                  key={branch.id}
                  style={styles.branchChipWrapper}
                  onPress={() => setSelectedBranchId(branch.id)}
                  activeOpacity={0.8}
                >
                  <BranchButton
                    branch={branch}
                    isSelected={selectedBranchId === branch.id}
                    disableTouch
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Save to profile toggle (non-media tabs) */}
        {showFormLocal && !isMediaTabLocal && (
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setIncludeOnProfile(!includeOnProfile)}
          >
            <Text style={styles.toggleLabel}>Save to Profile</Text>
            <View
              style={[
                styles.toggleTrack,
                includeOnProfile && styles.toggleTrackOn,
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  includeOnProfile && styles.toggleThumbOn,
                ]}
              />
            </View>
          </TouchableOpacity>
        )}
      </>
    );
  };

  return (
    <FadeInScreen>
      <View style={styles.root}>
        {/* Header — fixed, doesn't swipe */}

        {/* Tab switcher — fixed. Tapping animates the pager; swiping the
            pager updates this via onPageSelected below. Tabs already
            renders its own internal horizontal ScrollView, so this is a
            plain View, not another ScrollView — wrapping it in a second
            scroll container caused it to inherit ambiguous flex sizing
            once it moved out of the old single-ScrollView layout, which
            is what made the tab bar balloon to half the screen. */}
        <View style={styles.header}>
          <Tabs items={POST_TABS} value={activeTab} onChange={handleTabPress} />
        </View>
        {/* Swipeable tab content — one page per tab, each with its own
            vertical ScrollView since PagerView only handles the
            horizontal swipe. */}
        {/* The pager gets its own wrapper on purpose. On iOS,
            react-native-pager-view re-inserts its native view during
            layout, which lifts it above any *sibling* — so a decorative
            layer rendered beside it (before OR after) ends up buried.
            Isolating the pager in a wrapper keeps that reordering
            contained; the blob scene is a sibling of the wrapper, not of
            the pager, and stays on top. */}
        <View style={styles.pagerWrap}>
          <PagerView
            ref={pagerRef}
            style={styles.pager}
            initialPage={0}
            onPageSelected={onPageSelected}
            onPageScroll={onPageScroll}
          >
            {POST_TABS.map((tab) => (
              <ScrollView
                key={tab.id}
                ref={(r) => (scrollRefs.current[tab.id] = r)}
                style={styles.scroll}
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                // iOS: grow the scrollable area by the keyboard height so
                // there's somewhere to scroll the caption to. Android needs
                // softwareKeyboardLayoutMode: "resize" in app.json instead.
                automaticallyAdjustKeyboardInsets
                keyboardDismissMode="interactive"
              >
                {renderTabBody(tab.id)}
              </ScrollView>
            ))}
          </PagerView>
        </View>

        {/* Ambient media-tab blobs — decorative overlay. pointerEvents
            none keeps every swipe, tab and control fully interactive. */}
        <BlobScene progress={pageProgress} />
      </View>

      {/* Actions — pinned to the bottom of the screen rather than
          scrolling with the form content */}
      {showForm && (
        <View style={styles.actions}>
          <Button
            variant="ghost"
            size="sideBySide"
            onPress={() => router.replace("/(app)/feed")}
          >
            Cancel
          </Button>
          <Button size="sideBySide" onPress={handlePost} disabled={loading}>
            {loading ? "Posting..." : "Post"}
          </Button>
        </View>
      )}
    </FadeInScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  pagerWrap: {
    flex: 1,
  },
  pager: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scroll: {
    flex: 1,
    backgroundColor: "transparent",
  },
  container: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    paddingTop: 75,
  },
  headerTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.brown900,
  },
  tabsWrapper: {
    paddingHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.sm,
  },
  searchSection: {
    gap: spacing.sm,
  },
  results: {
    marginTop: spacing.sm,
  },
  previewCard: {
    padding: spacing.lg,
    gap: spacing.sm,
    position: "relative",
    // Matches PostCard's cardBody so the sliced blob is clipped the
    // same way and the content sits at the same inset.
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  trashButton: {
    alignSelf: "flex-end",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.clay300,
    alignItems: "center",
    justifyContent: "center",
  },
  trashText: {
    color: colors.brown700,
    fontSize: 14,
    fontFamily: fonts.primaryBold,
  },
  imageWrapper: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  cameraPlaceholder: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: colors.brown100,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  addImageButton: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: colors.brown100,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.brown200,
    borderStyle: "dashed",
  },
  addImageText: {
    fontFamily: fonts.primary,
    fontSize: 16,
    color: colors.brown300,
  },
  selectedTextBlock: {
    gap: 4,
    paddingHorizontal: spacing.sm,
  },
  selectedTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.brown500,
  },
  selectedSubtitle: {
    fontFamily: fonts.primary,
    fontSize: 12,
    color: colors.brown300,
  },
  titleInput: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.brown500,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  branchSection: {
    marginTop: spacing.md,
  },
  branchSectionLabel: {
    fontFamily: fonts.primaryBold,
    fontSize: 13,
    color: colors.brown500,
    marginBottom: spacing.xs,
  },
  branchRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  branchChipWrapper: {
    marginRight: spacing.md,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.green50,
    borderWidth: 1,
    borderColor: colors.green300,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  toggleLabel: {
    fontFamily: fonts.primaryBold,
    fontSize: 14,
    color: colors.brown500,
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brown300,
    justifyContent: "center",
    padding: 4,
  },
  toggleTrackOn: {
    backgroundColor: colors.lime500,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white200,
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: 32,
  },
  captionWrapper: {
    position: "relative",
    width: "100%",
  },
  captionInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.brown900,
    backgroundColor: "transparent",
  },
});
