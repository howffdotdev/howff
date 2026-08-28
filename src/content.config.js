import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

// Bot instructions live as markdown beside their JSON in data/entries.
// Astro's bundled markdown pipeline renders them, so no extra dependency.
export const collections = {
  instructions: defineCollection({
    loader: glob({ pattern: '*.md', base: './data/entries' }),
  }),
};
