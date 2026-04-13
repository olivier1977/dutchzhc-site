import type { Preview } from '@storybook/react';
import '../src/tokens/tokens.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dzhc-dark',
      values: [
        { name: 'dzhc-dark', value: '#060d1a' },
        { name: 'dzhc-surface', value: '#0d1b2e' },
        { name: 'light', value: '#ffffff' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'padded',
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme',
      defaultValue: 'dark',
      toolbar: {
        icon: 'circlehollow',
        items: ['dark'],
        showName: true,
      },
    },
  },
};

export default preview;
