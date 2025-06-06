./watch-articles.ts

This script currently only works with posts. We want it to work with lessons as WELL as posts.

In our API, post ids are prefixed with a post\_. So, post_m8cq7 is an example.
Lessons are prefixed with lesson\_. So, lesson_bn123 is an example.

If we encounter an id with a post\_, we should use the posts API.
If we encounter an id with a lesson\_, we should use the lessons API.
If we encounter an id without a prefix, we should log it to the console.

Our watch-articles script should use the lessons API.

There is some logic in the file which converts the slug to an id. Don't worry about reusing that logic for lessons - that's posts only.

Lessons should be updated with the id of the lesson, and the body (from the markdown file).

Here is the lessons API implementation:

```ts
import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  getLessons,
  LessonError,
  updateLesson,
} from "@/lib/lessons/lessons.service";
import { getUserAbilityForRequest } from "@/server/ability-for-request";
import { log } from "@/server/logger";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods":
    "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json(
    {},
    { headers: corsHeaders },
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slugOrId = searchParams.get("slugOrId");

  try {
    const { ability, user } =
      await getUserAbilityForRequest(request);
    await log.info("api.lessons.get.started", {
      userId: user?.id,
      slugOrId,
      hasAbility: !!ability,
    });

    const result = await getLessons({
      userId: user?.id,
      ability,
      slug: slugOrId,
    });

    await log.info("api.lessons.get.success", {
      userId: user?.id,
      slugOrId,
      resultCount: Array.isArray(result)
        ? result.length
        : 1,
    });

    return NextResponse.json(result, {
      headers: corsHeaders,
    });
  } catch (error) {
    if (error instanceof LessonError) {
      await log.error("api.lessons.get.error", {
        error: error.message,
        details: error.details,
        statusCode: error.statusCode,
        slugOrId,
      });
      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
        },
        {
          status: error.statusCode,
          headers: corsHeaders,
        },
      );
    }
    await log.error("api.lessons.get.failed", {
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
      stack:
        error instanceof Error
          ? error.stack
          : undefined,
      slugOrId,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  try {
    const { ability, user } =
      await getUserAbilityForRequest(request);
    console.log({ user, ability });
    if (!user) {
      await log.warn("api.lessons.put.unauthorized", {
        headers: Object.fromEntries(request.headers),
        lessonId: id,
      });
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders },
      );
    }

    if (!id) {
      await log.warn("api.lessons.put.invalid", {
        userId: user.id,
        error: "Missing lesson ID",
      });
      return NextResponse.json(
        { error: "Missing lesson ID" },
        { status: 400, headers: corsHeaders },
      );
    }

    const body = await request.json();
    await log.info("api.lessons.put.started", {
      userId: user.id,
      lessonId: id,
      changes: Object.keys(body),
    });

    const result = await updateLesson({
      id,
      data: body,
      action: body.action,
      userId: user.id,
      ability,
    });

    await log.info("api.lessons.put.success", {
      userId: user.id,
      lessonId: id,
    });

    return NextResponse.json(result, {
      headers: corsHeaders,
    });
  } catch (error) {
    if (error instanceof LessonError) {
      await log.error("api.lessons.put.error", {
        error: error.message,
        details: error.details,
        statusCode: error.statusCode,
        lessonId: id,
      });
      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
        },
        {
          status: error.statusCode,
          headers: corsHeaders,
        },
      );
    }
    if (error instanceof Error) {
      await log.error("api.lessons.put.error", {
        error: error.message,
        stack: error.stack,
        lessonId: id,
      });
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: corsHeaders },
      );
    }
    await log.error("api.lessons.put.failed", {
      error: "Unknown error",
      lessonId: id,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}
```
