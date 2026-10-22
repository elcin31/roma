import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
const articles = defineCollection({loader:glob({pattern:'**/*.mdx',base:'./src/content/articles'}),schema:z.object({entityId:z.string(),title:z.string(),description:z.string(),status:z.enum(['draft','needs_review','verified'])})});
export const collections = {articles};
