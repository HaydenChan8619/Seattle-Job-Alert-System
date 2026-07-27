import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-west-2";
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "seattle_job_tracker";

// Initialize DynamoDB Client safely
let docClient = null;

try {
  const client = new DynamoDBClient({ region: REGION });
  docClient = DynamoDBDocumentClient.from(client);
} catch (e) {
  console.warn("DynamoDB client init skipped:", e.message);
}

export async function GET() {
  if (!docClient) {
    return NextResponse.json({ live: false, jobs: [], message: "DynamoDB client not configured" });
  }

  try {
    const command = new ScanCommand({
      TableName: TABLE_NAME
    });

    const response = await docClient.send(command);
    const items = response.Items || [];

    // Filter out soft-deleted items and sort by first_seen_at descending
    const activeJobs = items.filter((item) => item.status !== "Deleted");
    const sortedJobs = activeJobs.sort((a, b) => (b.first_seen_at || 0) - (a.first_seen_at || 0));

    return NextResponse.json({
      live: true,
      count: sortedJobs.length,
      jobs: sortedJobs
    });
  } catch (error) {
    console.error("Error fetching jobs from DynamoDB:", error);
    return NextResponse.json(
      { live: false, jobs: [], error: error.message },
      { status: 200 } // Return 200 so UI falls back gracefully
    );
  }
}

export async function POST(request) {
  if (!docClient) {
    return NextResponse.json({ success: false, message: "DynamoDB client not configured" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { job_id, company, title, location, url, first_seen_at, status, role_category, resume_version, referral_note, notes, applied_at, is_viewed, is_flagged } = body;

    if (!job_id) {
      return NextResponse.json({ success: false, message: "Missing job_id" }, { status: 400 });
    }

    const ttlTimestamp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30-day auto-purge

    const item = {
      job_id,
      company: company || "Unknown",
      title: title || "Untitled Position",
      location: location || "Seattle, WA",
      url: url || "",
      first_seen_at: first_seen_at || Math.floor(Date.now() / 1000),
      status: status || "New Drop",
      role_category: role_category || "Software Engineer",
      resume_version: resume_version || "",
      referral_note: referral_note || "",
      notes: notes || "",
      applied_at: applied_at || null,
      is_viewed: is_viewed ?? false,
      is_flagged: is_flagged ?? false,
      ttl: ttlTimestamp
    };

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    });

    await docClient.send(command);

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("Error saving job to DynamoDB:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!docClient) {
    return NextResponse.json({ success: false, message: "DynamoDB client not configured" }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(request.url);
    let jobId = searchParams.get("job_id");

    if (!jobId) {
      const body = await request.json().catch(() => ({}));
      jobId = body.job_id;
    }

    if (!jobId) {
      return NextResponse.json({ success: false, message: "Missing job_id" }, { status: 400 });
    }

    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { job_id: jobId }
    });

    await docClient.send(command);

    return NextResponse.json({ success: true, job_id: jobId });
  } catch (error) {
    console.error("Error deleting job from DynamoDB:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

