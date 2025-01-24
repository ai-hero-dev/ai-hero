import { createCmsClient } from "./cms-client.ts";

const posts = [
  {
    title: "Best Practices for Prompt Engineering",
    content: `Prompt engineering is a crucial skill in AI development. The key to effective prompt engineering lies in being specific, providing context, and understanding the model's limitations. When crafting prompts, always include relevant examples, specify the desired format, and break complex tasks into smaller steps. Remember to consider edge cases and validate the model's outputs to ensure reliability.`,
  },
  {
    title: "Understanding Large Language Models",
    content: `Large Language Models (LLMs) have revolutionized AI applications. These models work by processing text through multiple transformer layers, using attention mechanisms to understand context and relationships between words. While powerful, they come with challenges like hallucinations and context limitations. Developers should implement proper validation and fallback mechanisms when building applications with LLMs.`,
  },
  {
    title: "AI System Architecture Design",
    content: `Designing robust AI systems requires careful consideration of scalability, reliability, and maintainability. Key components typically include preprocessing pipelines, model serving infrastructure, and monitoring systems. Important considerations include handling rate limiting, implementing retry mechanisms, and ensuring proper error handling. Always design with observability in mind to track model performance and system health.`,
  },
];

const seedDatabase = async () => {
  const client = createCmsClient();

  console.log("🔍 Checking for existing posts...");

  const existingPosts = await client.getAllPosts();

  if (existingPosts.length > 0) {
    console.log(
      "📝 Database already has posts, skipping seeding.",
    );
    return;
  }

  console.log("🌱 Starting database seeding...");

  for (const post of posts) {
    try {
      const created = await client.createPost(post);
      console.log(`✅ Created post: ${created.title}`);
    } catch (error) {
      console.error(
        `❌ Failed to create post "${post.title}":`,
        error,
      );
    }
  }

  console.log("✨ Database seeding completed!");
};

export { seedDatabase };
