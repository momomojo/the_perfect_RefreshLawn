// Declaration file to resolve conflicts between React Native and DOM types

// Override DOM types to prevent conflicts with React Native types
// This is necessary because both React Native and DOM define similar globals
// but with different signatures

// Overrides for DOM types
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "development" | "production" | "test";
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
  }
}

// Fix module conflicts by telling TypeScript to use React Native's version
// of these global types instead of DOM's version
interface FormData {}
interface URL {}
interface URLSearchParams {}
interface AbortController {}
interface AbortSignal {}

// Make TypeScript aware of expo-router types
declare module "expo-router" {
  import { LinkProps as OriginalLinkProps } from "expo-router/build/link/Link";
  export * from "expo-router/build";

  export interface LinkProps extends OriginalLinkProps {
    asChild?: boolean;
  }
}
