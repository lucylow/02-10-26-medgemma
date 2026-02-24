import type { Preview } from "@storybook/react";
import React from "react";
import { ThemeProvider } from "../src/theme";
import { ThemeProvider as ClinicalTokensProvider } from "../src/providers/ThemeProvider";
import "../src/index.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ClinicalTokensProvider>
          <Story />
        </ClinicalTokensProvider>
      </ThemeProvider>
    ),
  ],
};

export default preview;
