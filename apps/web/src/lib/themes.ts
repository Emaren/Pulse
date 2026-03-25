export const themeStorageKey = "pulse-theme";
export const defaultTheme = "sepia" as const;

export const themes = [
  {
    id: "black",
    label: "Black",
    swatch: "linear-gradient(135deg, #050505, #2b2b2b)",
  },
  {
    id: "grey",
    label: "Grey",
    swatch: "linear-gradient(135deg, #d7dde2, #7c8791)",
  },
  {
    id: "white",
    label: "White",
    swatch: "linear-gradient(135deg, #ffffff, #d9e2ed)",
  },
  {
    id: "sepia",
    label: "Sepia",
    swatch: "linear-gradient(135deg, #f3e6d2, #9b6a42)",
  },
  {
    id: "walnut",
    label: "Walnut",
    swatch: "linear-gradient(135deg, #422715, #b88b5f)",
  },
  {
    id: "crimson",
    label: "Crimson",
    swatch: "linear-gradient(135deg, #22080d, #b14053)",
  },
  {
    id: "midnight",
    label: "Midnight",
    swatch: "linear-gradient(135deg, #06101d, #34557d)",
  },
] as const;

export type ThemeName = (typeof themes)[number]["id"];
export const themeNames = themes.map((theme) => theme.id);
