import { GithubDesignTaskMeta } from "@/app/tasks/gh-design/gh-design";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const UpdateMetaSchema = z.object({
    slackMessageTemplate: z.string()
        .min(1, "Slack message template cannot be empty")
        .refine(
            (template) => template.includes("{{ITEM_TYPE}}"),
            "Slack message template must include {{ITEM_TYPE}} placeholder"
        )
        .refine(
            (template) => template.includes("{{URL}}"),
            "Slack message template must include {{URL}} placeholder"
        )
        .refine(
            (template) => template.includes("{{TITLE}}"),
            "Slack message template must include {{TITLE}} placeholder"
        )
        .optional(),
    requestReviewers: z.array(z.string().min(1, "Reviewer username cannot be empty")).optional(),
    repoUrls: z.array(
        z.string()
            .url("Repository URL must be a valid URL")
            .refine(
                (url) => url.startsWith("https://github.com"),
                "Repository URL must start with https://github.com"
            )
    ).optional(),
});

type UpdateMetaRequest = z.infer<typeof UpdateMetaSchema>;

export async function GET() {
    try {
        const meta = await GithubDesignTaskMeta.findOne({ coll: "GithubDesignTask" });
        return NextResponse.json({ meta });
    } catch (error) {
        console.error("Failed to fetch metadata:", error);
        return NextResponse.json({ error: "Failed to fetch metadata" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate request body with Zod
        const validationResult = UpdateMetaSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json({
                error: "Validation failed",
                details: validationResult.error.format()
            }, { status: 400 });
        }

        const { slackMessageTemplate, requestReviewers, repoUrls } = validationResult.data;

        // Update the metadata
        const updateData: Partial<UpdateMetaRequest> = {};
        if (slackMessageTemplate !== undefined) updateData.slackMessageTemplate = slackMessageTemplate;
        if (requestReviewers !== undefined) updateData.requestReviewers = requestReviewers;
        if (repoUrls !== undefined) updateData.repoUrls = repoUrls;

        const meta = await GithubDesignTaskMeta.save(updateData);

        return NextResponse.json({ success: true, meta });
    } catch (error) {
        console.error("Failed to update metadata:", error);
        return NextResponse.json({ error: "Failed to update metadata" }, { status: 500 });
    }
}
