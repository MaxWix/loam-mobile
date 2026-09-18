import FadeInScreen from "../../../lib/components/FadeInScreen";
import ProfileScreenBody from "../../../lib/components/ProfileScreenBody";
import { useLocalSearchParams } from "expo-router";

export default function ProfileScreen() {
  // `refresh` param lets other screens (e.g. after editing) force a refetch
  // by bumping the query string, same trick the original screen used.
  const { refresh } = useLocalSearchParams();

  return (
    <FadeInScreen>
      <ProfileScreenBody refreshKey={refresh} />
    </FadeInScreen>
  );
}
