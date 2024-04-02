import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";

export default {
  input: "src/ordinal.ts",
  output: {
    file: "content/script.js",
    format: "es", // Output format is ECMAScript Module
    sourcemap: true,
  },
  external: [
    "/content/flick.js", // Mark the external dependency
  ],
  plugins: [
    typescript(), // Use TypeScript plugin for Rollup
    // terser(), // Optional: Minify the output
    {
      resolveId(source) {
        if (source === "@0xflick/assets") {
          return "/content/flick.js"; // Replace @flick/lib with /content/library.js
        }
        return null; // Let Rollup handle other imports normally
      },
    },
  ],
};
