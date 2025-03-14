import React from "react";
import { View, Text, Image } from "react-native";

interface LogoProps {
  size?: "small" | "medium" | "large";
  variant?: "light" | "dark";
}

const Logo = ({ size = "medium", variant = "dark" }: LogoProps) => {
  const getImageSize = () => {
    if (size === "small") return 80;
    if (size === "large") return 160;
    return 128; // medium
  };

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: getImageSize(),
          height: getImageSize(),
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: variant === "light" ? "#dcfce7" : "#14532d",
        }}
      >
        <Image
          source={require("../../../assets/images/icon.png")}
          style={{
            width: getImageSize(),
            height: getImageSize(),
            borderRadius: 999,
          }}
          resizeMode="contain"
        />
      </View>
      <Text
        style={{
          marginTop: 8,
          fontSize: 20,
          fontWeight: "bold",
          color: variant === "light" ? "#ffffff" : "#14532d",
        }}
      >
        GreenScape
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: variant === "light" ? "#e5e7eb" : "#4b5563",
        }}
      >
        Lawn Care Services
      </Text>
    </View>
  );
};

export default Logo;
