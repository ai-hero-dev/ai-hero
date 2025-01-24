# AI Hero

<a href="https://aihero.dev"><img width="830" alt="From Zero to AI Hero" src="https://github.com/user-attachments/assets/930f3e81-981f-48ec-a1b0-8ff77568c34c" /></a>

## Welcome!

[AI Hero](https://www.aihero.dev/) is the course I'm building to take you from **zero to fully-fledged AI engineer**.

It's going to be the perfect course for anyone looking to **transition from frontend, backend, or full-stack** development to working with AI.

I'm **open sourcing most of the code** for the course, including:

- Examples
- Exercises
- Libraries & SDKs (like [Evalite](https://www.evalite.dev/), my evals framework)
- Articles

Following repo notifications can be pretty painful, so [get on my newsletter](https://aihero.dev) to stay up to date.

## Examples

The bit I'm currently working on is the [examples](./examples/) directory.

Each example is a self-contained, runnable code sample that demonstrates a concept or technique.

Anything marked with `TODO` is, well, you get it.

## Quickstart

Let's get you running your first example.

### 1. Install node

You'll need [Node.js](https://nodejs.org/en/download) installed to run the exercises and examples. LTS (Long Term Support) is recommended.

### 2. Install PNPM

[Install `pnpm` using Corepack](https://pnpm.io/installation#using-corepack).

### 3. Install Dependencies

```sh
# Installs all dependencies
pnpm install
```

### 4. Add A `.env` File

Create a `.env` file in the root of the project with the following content:

```sh
# Your OpenAI API key
OPENAI_API_KEY=your-api-key

# OR your Anthropic API key
ANTHROPIC_API_KEY=your-api-key
```

I'll be adding a guide on running the examples with local models soon.

### 5. Run An Example

Runs the first example of [examples/vercel-ai-sdk](./examples/vercel-ai-sdk/). Each example links to a corresponding article on [AI Hero](https://www.aihero.dev/).

```bash
pnpm run example v 01
```
