import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const talks = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/talks' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date().optional(),
    type: z.string().optional(),
    venue: z.string().optional(),
    location: z.string().optional(),
    collection: z.string().optional(),
    permalink: z.string().optional(),
    excerpt: z.string().optional(),
  }).passthrough(),
});

const portfolio = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/portfolio' }),
  schema: z.object({
    title: z.string(),
    excerpt: z.string().optional(),
    collection: z.string().optional(),
    permalink: z.string().optional(),
    date: z.coerce.date().optional(),
    image: z.string().optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
    demo_url: z.string().optional(),
    source_url: z.string().optional(),
    image_fit: z.enum(['cover', 'contain']).optional(),
  }).passthrough(),
});

const publications = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/publications' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date().optional(),
    venue: z.string().optional(),
    paperurl: z.string().optional(),
    citation: z.string().optional(),
    collection: z.string().optional(),
    permalink: z.string().optional(),
    excerpt: z.string().optional(),
  }).passthrough(),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date().optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    excerpt: z.string().optional(),
    permalink: z.string().optional(),
    collection: z.string().optional(),
  }).passthrough(),
});

export const collections = { talks, portfolio, publications, blog };
