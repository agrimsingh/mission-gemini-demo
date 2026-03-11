import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: ["convex/_generated/**", ".next/**"],
  },
  ...nextVitals,
];

export default config;
