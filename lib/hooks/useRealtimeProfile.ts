import { useState, useEffect, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import {
  Profile,
  subscribeToProfiles,
  unsubscribeFromChannel,
} from "../data";

interface UseRealtimeProfileOptions {
  userId?: string;
  enabled?: boolean;
}

interface UseRealtimeProfileReturn {
  profile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  isSubscribed: boolean;
}

/**
 * Custom hook for real-time profile subscriptions
 *
 * @example
 * // Subscribe to current user's profile changes
 * const { profile } = useRealtimeProfile({ userId: user.id });
 */
export function useRealtimeProfile(
  options: UseRealtimeProfileOptions = {}
): UseRealtimeProfileReturn {
  const { userId, enabled = true } = options;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Don't subscribe if disabled or no userId provided
    if (!enabled || !userId) {
      return;
    }

    console.log("Setting up real-time profile subscription", { userId });

    // Subscribe to profile changes
    channelRef.current = subscribeToProfiles((payload) => {
      console.log("Real-time profile update:", payload);

      if (payload.new && payload.new.id === userId) {
        setProfile(payload.new);
      }
    }, userId);

    setIsSubscribed(true);

    // Cleanup on unmount or when userId changes
    return () => {
      console.log("Cleaning up real-time profile subscription");
      if (channelRef.current) {
        unsubscribeFromChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsSubscribed(false);
    };
  }, [userId, enabled]);

  return {
    profile,
    setProfile,
    isSubscribed,
  };
}
