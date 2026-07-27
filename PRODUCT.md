# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Software Engineering (SWE/SDE) and Product Management (PM/APM) new graduates and early-career job seekers targeting tech roles in the Greater Seattle Area (Seattle, Bellevue, Redmond). They need to discover and apply to new job releases within minutes of posting before applicant pools saturate.

## Product Purpose

The Instant Seattle Tech Job Monitor & Speed Tracker automatically detects new grad and early career job postings across 15 target tech hubs, pushes real-time Discord webhook alerts, and provides a web-based desktop application tracking system with 1-click apply actions and speed analytics.

## Positioning

Unlike generic job aggregators or delayed job alerts, this system offers < 5 minute detection speed, strict location/level filtering (Seattle/Bellevue/Redmond New Grad SWE & APM), and an integrated desktop workflow dashboard that calculates real-time "Speed-to-Apply" while logging tailored resume variants.

## Operating Context

Active daily execution between 8:00 AM and 10:00 PM PST. Applicants keep the dark-themed web dashboard open on desktop, receiving instant Discord push alerts when new roles drop, enabling immediate application submission and notes logging.

## Capabilities and Constraints

- **Scraper Engine**: Python AWS Lambda function polling 15 target tech companies (Stripe, Databricks, Snowflake, DoorDash, Palantir, Snap, Amazon, Microsoft, Google, Apple, Meta, Uber, LinkedIn, NVIDIA, Oracle) every 5 minutes.
- **Strict Filtering**: Includes New Grad, University, Early Career, Entry-Level, SDE I, and APM titles; strictly excludes Senior, Staff, Principal, Lead, and Manager titles.
- **Data & Persistence**: Amazon DynamoDB state table with 30-day auto-purge TTL + browser LocalStorage fallback (`seattle_job_tracker_new_grad_data`).
- **Dashboard UI**: Built with Next.js (App Router, Tailwind CSS, Lucide icons) optimized for Vercel deployment.
- **Speed Analytics**: Tracks total drops, unapplied count, active pipeline, and average speed-to-apply (goal < 5 mins).

## Brand Commitments

- **Aesthetic World**: Dark zinc monochrome theme (`#09090b` background, `#18181b` cards, `#27272a` subtle borders).
- **Typography & Details**: High-contrast typography (`#fafafa`), monospace font for timestamps/salaries, tight component padding, and emerald status pulse indicators.

## Evidence on Hand

- `Seattle Job Monitor System Design Document.md`: Architectural specification and component blueprints.
- `lambda_function.py`: 15-company ATS scraper implementation with regex filters and Discord webhook engine.
- `main.tf`: Infrastructure as Code for DynamoDB, IAM, AWS Lambda (`us-west-2`), and EventBridge cron schedule.
- `src/app/page.js`: Next.js web application dashboard.
- `src/app/api/jobs/route.js`: Live server-side DynamoDB API endpoint.

## Product Principles

1. **Sub-5-Minute Speed**: Speed to apply is the single primary metric. The system prioritizes immediate detection and 1-click direct portal application.
2. **Signal over Noise**: Strict filtering eliminates senior positions and non-Seattle locations so applicants only see relevant early-career roles.
3. **Local-First & Live-Synced**: UI functions instantly via LocalStorage, with seamless AWS DynamoDB synchronization.
4. **Minimalist Precision**: Clean, dark zinc monochrome interface with zero unnecessary decorative noise or distraction.
