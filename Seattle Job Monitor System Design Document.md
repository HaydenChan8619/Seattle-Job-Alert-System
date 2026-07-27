# **System Design Document: Instant Seattle Tech Job Monitor (SWE & PM)**

## **1\. Executive Summary & Objective**

* **Goal:** Detect and alert on new Software Engineering (SWE) and Product Management (PM) job postings across 15 target tech companies in the Greater Seattle Area (Seattle, Bellevue, Redmond) within 5 minutes of release.  
* **Target Window:** Active polling execution between **8:00 AM and 10:00 PM PST daily**.  
* **Primary Constraints:** Zero/minimal operational cost (AWS Permanent Free Tier), high reliability, low-latency push alerts (Discord / Pushover / Email), and strict deduplication.

## **2\. Comprehensive 15-Company Integration Specifications**

| Company | ATS / Portal Type | Ingestion Endpoint / Strategy | Location Keywords Filter |
| :---- | :---- | :---- | :---- |
| **Stripe** | Greenhouse | REST API (/v1/boards/stripe/jobs) | Seattle, Bellevue, Redmond |
| **Databricks** | Greenhouse | REST API (/v1/boards/databricks/jobs) | Seattle, Bellevue, Redmond |
| **Snowflake** | Greenhouse | REST API (/v1/boards/snowflake/jobs) | Seattle, Bellevue, Redmond |
| **DoorDash** | Greenhouse | REST API (/v1/boards/doordash/jobs) | Seattle, Bellevue, Redmond |
| **Palantir** | Greenhouse | REST API (/v1/boards/palantir/jobs) | Seattle, Bellevue, Redmond |
| **Snap Inc.** | Lever | REST API (/v0/postings/snap?mode=json) | Seattle, Bellevue, Redmond |
| **Amazon** | Custom REST API | amazon.jobs/en/search.json API endpoint | Seattle, WA, Bellevue, WA |
| **Microsoft** | Custom REST API | gcsservices.careers.microsoft.com/search/api/v1/search | Seattle, Bellevue, Redmond |
| **Google** | Custom JSON API | Google Careers Search API (/api/v3/search) | Seattle, WA, USA, Bellevue, WA, USA |
| **Apple** | Custom JSON API | Apple Jobs API (/api/v1/job/search) | Seattle, Bellevue |
| **Meta** | Custom REST API | Meta Careers Search Endpoint | Seattle, WA, Bellevue, WA |
| **Uber** | Workday / Custom API | Workday CXS / Uber Careers Search Endpoint | Seattle, WA, Bellevue, WA |
| **LinkedIn** | Custom API / Workday | LinkedIn Careers API / Microsoft Integration Feed | Seattle, WA, Bellevue, WA, Redmond, WA |
| **NVIDIA** | Workday | Workday CXS Endpoint (nvidia.wd5.myworkdayjobs.com) | Seattle, WA, Redmond, WA |
| **Oracle (OCI)** | Custom / Taleo API | Oracle Cloud Careers JSON Feed | Seattle, WA, Bellevue, WA |

## **3\. Architecture & Infrastructure Diagram**

 \+-------------------------------------------------------------------+  
 |                   AWS EventBridge (Cron Trigger)                  |  
 |  cron(0/5 15-5 \* \* ? \*) \-\> UTC corresponding to 8am-10pm PST       |  
 \+-------------------------------------------------------------------+  
                                   |  
                                   v  
 \+-------------------------------------------------------------------+  
 |                    AWS Lambda (Python 3.11)                        |  
 |                                                                   |  
 | 1\. Modular Fetchers for Greenhouse, Lever, Amazon, MSFT, Google,  |  
 |    Apple, Meta, Workday & Custom Corporate Endpoints             |  
 | 2\. Filter Roles: SWE/SDE & PM | Filter Locations: Seattle/Bellevue |  
 | 3\. Deduplicate against DynamoDB state table                       |  
 \+-------------------------------------------------------------------+  
                   |                               |  
                   v                               v  
 \+-----------------------------------+   \+---------------------------+  
 |         Amazon DynamoDB           |   | Notifications & Dashboard |  
 |  (Job Hash Table \- TTL 30 Days)   |   | (Discord Webhook /        |  
 |  Key: job\_id                      |   |  Minimalist React UI)     |  
 \+-----------------------------------+   \+---------------------------+

## **4\. Operational & Component Specifications**

### **4.1. EventBridge Schedule Rules**

* **Cron Schedule:** cron(0/5 15-5 \* \* ? \*)  
  * *Note:* Executes every 5 minutes from 15:00 UTC (8:00 AM PST) to 05:00 UTC (10:00 PM PST next day).

### **4.2. Storage Layer (Amazon DynamoDB)**

* **Table Name:** seattle\_job\_tracker  
* **Primary Key:** job\_id (String)  
* **Attributes:** company (String), title (String), location (String), url (String), first\_seen\_at (Number / Unix Timestamp), ttl (Number \- set to epoch timestamp \+ 30 days for auto-cleanup).

### **4.3. Notification Engine**

* **Default Channel:** Discord Webhook or Pushover API.  
* **Payload Structure:** Job title, company, location tag, direct apply URL, and timestamp.

## **5\. Web UI & Application Tracking System Architecture**

### **5.1. Overview & Goal**

A web-based tracker for desktop application workflows. When a job alert is triggered via Discord/Lambda, the applicant can open the UI to apply immediately, track application status, and record resume variants/notes.

### **5.2. Minimalist UI Design Principles**

* **Color Palette:** Dark zinc monochrome theme (\#09090b / \#18181b), subtle \#27272a borders, high-contrast monochrome text (\#fafafa), and low-saturation status dots.  
* **Typography & Layout:** Clean sans-serif UI, tabular mono font for time metrics/salaries, tight component padding, zero unnecessary gradients or loud decorative elements.  
* **Key Components:**  
  1. **Minimalist Top Bar:** Status pulse indicator, real-time trigger simulation button, and state export action.  
  2. **Speed Analytics Strip:** Real-time counters for new drops, applied count, interviewing roles, and calculated average speed-to-apply metric.  
  3. **Controls Bar:** Search filter with single-line select dropdowns (Status, Role, Company) and view toggle (Cards / Table).  
  4. **Direct Action Listing:** Job cards equipped with an **"Apply"** button that opens the direct career portal link in a new tab while automatically updating the job's status to applied.  
  5. **Drawer / Form Modal:** Minimalist form to log resume versions (e.g. SWE\_Backend\_v3.pdf) and referral notes.

### **5.3. Data Storage Strategy**

* **Local-First Persistence:** Persisted in localStorage under seattle\_job\_tracker\_data.  
* **Optional API Synchronization:** Can be connected to Amazon DynamoDB via AWS API Gateway REST endpoint (GET /jobs, POST /jobs/status).

## **6\. Production Code Blueprint (lambda\_function.py)**

The script uses Python standard library (urllib.request) to eliminate external Lambda dependencies.

import json  
import os  
import re  
import urllib.request  
import urllib.parse  
import time  
import boto3

\# Environment Variables  
DYNAMODB\_TABLE\_NAME \= os.environ.get("DYNAMODB\_TABLE\_NAME", "seattle\_job\_tracker")  
DISCORD\_WEBHOOK\_URL \= os.environ.get("DISCORD\_WEBHOOK\_URL", "")

dynamodb \= boto3.resource("dynamodb")  
table \= dynamodb.Table(DYNAMODB\_TABLE\_NAME)

LOCATION\_KEYWORDS \= \["seattle", "bellevue", "redmond"\]  
ROLE\_KEYWORDS \= \["software", "sde", "swe", "product manager", "product management", "pm"\]

HEADERS \= {  
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10\_15\_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",  
    "Accept": "application/json, text/plain, \*/\*"  
}

def is\_target\_role\_and\_location(title: str, location: str) \-\> bool:  
    title\_lower \= title.lower()  
    location\_lower \= location.lower()  
      
    match\_location \= any(loc in location\_lower for loc in LOCATION\_KEYWORDS)  
    match\_role \= any(role in title\_lower for role in ROLE\_KEYWORDS)  
      
    return match\_location and match\_role

def is\_already\_notified(job\_id: str) \-\> bool:  
    try:  
        response \= table.get\_item(Key={"job\_id": job\_id})  
        return "Item" in response  
    except Exception as e:  
        print(f"Error checking DynamoDB for {job\_id}: {e}")  
        return False

def save\_job\_state(job\_id: str, company: str, title: str, url: str):  
    ttl\_timestamp \= int(time.time()) \+ (30 \* 24 \* 60 \* 60\) \# 30-day auto-purge  
    try:  
        table.put\_item(  
            Item={  
                "job\_id": job\_id,  
                "company": company,  
                "title": title,  
                "url": url,  
                "first\_seen\_at": int(time.time()),  
                "ttl": ttl\_timestamp  
            }  
        )  
    except Exception as e:  
        print(f"Error saving job to DynamoDB: {e}")

def send\_discord\_alert(company: str, title: str, location: str, url: str):  
    if not DISCORD\_WEBHOOK\_URL:  
        print("No Webhook URL configured. Alert skipped.")  
        return

    payload \= {  
        "content": "🚨 \*\*NEW SEATTLE JOB OPENING DETECTED\*\* 🚨",  
        "embeds": \[  
            {  
                "title": f"{company.upper()} \- {title}",  
                "url": url,  
                "color": 3066993,  
                "fields": \[  
                    {"name": "Location", "value": location or "Greater Seattle Area", "inline": True},  
                    {"name": "Company", "value": company.capitalize(), "inline": True}  
                \],  
                "footer": {"text": "Seattle Tech Job Alert System • Immediate Apply Notification"}  
            }  
        \]  
    }

    req \= urllib.request.Request(  
        DISCORD\_WEBHOOK\_URL,  
        data=json.dumps(payload).encode("utf-8"),  
        headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}  
    )  
      
    try:  
        with urllib.request.urlopen(req) as resp:  
            if resp.status not in (200, 204):  
                print(f"Failed to post to Discord. Status: {resp.status}")  
    except Exception as e:  
        print(f"Error delivering notification: {e}")

def fetch\_json(url: str, post\_data: dict \= None):  
    try:  
        data\_bytes \= json.dumps(post\_data).encode("utf-8") if post\_data else None  
        req \= urllib.request.Request(url, data=data\_bytes, headers=HEADERS)  
        with urllib.request.urlopen(req, timeout=8) as resp:  
            return json.loads(resp.read().decode())  
    except Exception as e:  
        print(f"Error fetching {url}: {e}")  
        return None

\# \--- ATS Specific Scraper Implementations \---

def check\_greenhouse\_companies():  
    companies \= \["stripe", "databricks", "snowflake", "doordash", "palantir"\]  
    new\_jobs \= \[\]  
    for company in companies:  
        url \= f"https://boards-api.greenhouse.io/v1/boards/{company}/jobs?content=true"  
        data \= fetch\_json(url)  
        if not data:  
            continue  
        for job in data.get("jobs", \[\]):  
            job\_id \= f"{company}\_{job\['id'\]}"  
            title \= job.get("title", "")  
            location \= job.get("location", {}).get("name", "")  
            job\_url \= job.get("absolute\_url", "")

            if is\_target\_role\_and\_location(title, location) and not is\_already\_notified(job\_id):  
                new\_jobs.append({"job\_id": job\_id, "company": company, "title": title, "location": location, "url": job\_url})  
    return new\_jobs

def check\_lever\_companies():  
    companies \= \["snap"\]  
    new\_jobs \= \[\]  
    for company in companies:  
        url \= f"https://api.lever.co/v0/postings/{company}?mode=json"  
        data \= fetch\_json(url)  
        if not data or not isinstance(data, list):  
            continue  
        for job in data:  
            job\_id \= f"{company}\_{job\['id'\]}"  
            title \= job.get("text", "")  
            categories \= job.get("categories", {})  
            location \= categories.get("location", "")  
            job\_url \= job.get("hostedUrl", "")

            if is\_target\_role\_and\_location(title, location) and not is\_already\_notified(job\_id):  
                new\_jobs.append({"job\_id": job\_id, "company": company, "title": title, "location": location, "url": job\_url})  
    return new\_jobs

def check\_amazon():  
    new\_jobs \= \[\]  
    url \= "https://www.amazon.jobs/en/search.json?loc\_query=Seattle%2C%20WA%2C%20United%20States\&offset=0\&result\_limit=30\&sort=recent"  
    data \= fetch\_json(url)  
    if data and "jobs" in data:  
        for job in data\["jobs"\]:  
            job\_id \= f"amazon\_{job\['id\_icims'\]}"  
            title \= job.get("title", "")  
            location \= job.get("location", "")  
            job\_url \= f"https://www.amazon.jobs{job.get('job\_path', '')}"

            if is\_target\_role\_and\_location(title, location) and not is\_already\_notified(job\_id):  
                new\_jobs.append({"job\_id": job\_id, "company": "amazon", "title": title, "location": location, "url": job\_url})  
    return new\_jobs

def check\_microsoft():  
    new\_jobs \= \[\]  
    url \= "https://gcsservices.careers.microsoft.com/search/api/v1/search?lc=Seattle%2C%20Washington%2C%20United%20States\&l=en\_us\&pg=1\&pgSz=20\&o=Recent"  
    data \= fetch\_json(url)  
    if data and "operationResult" in data and "result" in data\["operationResult"\]:  
        jobs \= data\["operationResult"\]\["result"\].get("jobs", \[\])  
        for job in jobs:  
            job\_id \= f"msft\_{job.get('jobId')}"  
            title \= job.get("title", "")  
            location \= job.get("properties", {}).get("primaryLocation", "Seattle, WA")  
            job\_url \= f"https://jobs.careers.microsoft.com/global/en/job/{job.get('jobId')}"

            if is\_target\_role\_and\_location(title, location) and not is\_already\_notified(job\_id):  
                new\_jobs.append({"job\_id": job\_id, "company": "microsoft", "title": title, "location": location, "url": job\_url})  
    return new\_jobs

def check\_google():  
    new\_jobs \= \[\]  
    url \= "https://careers.google.com/api/v3/search/?distance=50\&q=software%20product%20manager\&location=Seattle%2C%20WA%2C%20USA"  
    data \= fetch\_json(url)  
    if data and "jobs" in data:  
        for job in data\["jobs"\]:  
            raw\_id \= job.get("id", "").split("/")\[-1\]  
            job\_id \= f"google\_{raw\_id}"  
            title \= job.get("title", "")  
            locations \= ", ".join(\[loc.get("display", "") for loc in job.get("locations", \[\])\])  
            job\_url \= f"https://careers.google.com/jobs/results/{raw\_id}"

            if is\_target\_role\_and\_location(title, locations) and not is\_already\_notified(job\_id):  
                new\_jobs.append({"job\_id": job\_id, "company": "google", "title": title, "location": locations, "url": job\_url})  
    return new\_jobs

def check\_apple():  
    new\_jobs \= \[\]  
    url \= "https://jobs.apple.com/api/v1/job/search?location=seattle-USA"  
    data \= fetch\_json(url)  
    if data and "searchResults" in data:  
        for job in data\["searchResults"\]:  
            job\_id \= f"apple\_{job.get('id')}"  
            title \= job.get("postingTitle", "")  
            location \= job.get("locations", \[{}\])\[0\].get("city", "Seattle")  
            job\_url \= f"https://jobs.apple.com/en-us/details/{job.get('id')}"

            if is\_target\_role\_and\_location(title, location) and not is\_already\_notified(job\_id):  
                new\_jobs.append({"job\_id": job\_id, "company": "apple", "title": title, "location": location, "url": job\_url})  
    return new\_jobs

def check\_workday\_companies():  
    endpoints \= \[  
        {"company": "nvidia", "url": "https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs"},  
        {"company": "uber", "url": "https://uber.wd1.myworkdayjobs.com/wday/cxs/uber/Uber\_Careers/jobs"},  
        {"company": "oracle", "url": "https://oracle.wd1.myworkdayjobs.com/wday/cxs/oracle/USA/jobs"}  
    \]  
    new\_jobs \= \[\]  
    for ep in endpoints:  
        post\_body \= {"searchText": "Software Product", "limit": 20, "offset": 0}  
        data \= fetch\_json(ep\["url"\], post\_data=post\_body)  
        if data and "jobPostings" in data:  
            for job in data\["jobPostings"\]:  
                raw\_path \= job.get("externalPath", "")  
                job\_id \= f"{ep\['company'\]}\_{hash(raw\_path)}"  
                title \= job.get("title", "")  
                location \= job.get("locationsText", "")  
                job\_url \= f"{ep\['url'\].split('/wday')\[0\]}{raw\_path}"

                if is\_target\_role\_and\_location(title, location) and not is\_already\_notified(job\_id):  
                    new\_jobs.append({"job\_id": job\_id, "company": ep\["company"\], "title": title, "location": location, "url": job\_url})  
    return new\_jobs

\# \--- Main Entry Point \---

def lambda\_handler(event, context):  
    all\_new\_jobs \= \[\]  
      
    scrapers \= \[  
        check\_greenhouse\_companies,  
        check\_lever\_companies,  
        check\_amazon,  
        check\_microsoft,  
        check\_google,  
        check\_apple,  
        check\_workday\_companies  
    \]  
      
    for scraper in scrapers:  
        try:  
            jobs \= scraper()  
            if jobs:  
                all\_new\_jobs.extend(jobs)  
        except Exception as e:  
            print(f"Error executing scraper {scraper.\_\_name\_\_}: {e}")

    for job in all\_new\_jobs:  
        send\_discord\_alert(  
            company=job\["company"\],  
            title=job\["title"\],  
            location=job\["location"\],  
            url=job\["url"\]  
        )  
        save\_job\_state(  
            job\_id=job\["job\_id"\],  
            company=job\["company"\],  
            title=job\["title"\],  
            url=job\["url"\]  
        )

    return {  
        "statusCode": 200,  
        "body": json.dumps(f"Successfully processed scan. Found {len(all\_new\_jobs)} new target jobs.")  
    }

## **7\. Infrastructure-as-Code (main.tf)**

provider "aws" {  
  region \= "us-west-2"  
}

\# 1\. DynamoDB Table for State Tracking  
resource "aws\_dynamodb\_table" "job\_tracker" {  
  name         \= "seattle\_job\_tracker"  
  billing\_mode \= "PAY\_PER\_REQUEST"  
  hash\_key     \= "job\_id"

  attribute {  
    name \= "job\_id"  
    type \= "S"  
  }

  ttl {  
    attribute\_name \= "ttl"  
    enabled        \= true  
  }  
}

\# 2\. IAM Role & Permissions  
resource "aws\_iam\_role" "lambda\_exec\_role" {  
  name \= "seattle\_job\_scraper\_lambda\_role"

  assume\_role\_policy \= jsonencode({  
    Version \= "2012-10-17"  
    Statement \= \[{  
      Action \= "sts:AssumeRole"  
      Effect \= "Allow"  
      Principal \= {  
        Service \= "lambda.amazonaws.com"  
      }  
    }\]  
  })  
}

resource "aws\_iam\_policy" "lambda\_policy" {  
  name \= "seattle\_job\_scraper\_policy"

  policy \= jsonencode({  
    Version \= "2012-10-17"  
    Statement \= \[  
      {  
        Action   \= \["dynamodb:GetItem", "dynamodb:PutItem"\]  
        Effect   \= "Allow"  
        Resource \= aws\_dynamodb\_table.job\_tracker.arn  
      },  
      {  
        Action   \= \["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"\]  
        Effect   \= "Allow"  
        Resource \= "arn:aws:logs:\*:\*:\*"  
      }  
    \]  
  })  
}

resource "aws\_iam\_role\_policy\_attachment" "attach\_policy" {  
  role       \= aws\_iam\_role.lambda\_exec\_role.name  
  policy\_arn \= aws\_iam\_policy.lambda\_policy.arn  
}

\# 3\. AWS Lambda Function  
resource "aws\_lambda\_function" "job\_scraper" {  
  filename      \= "lambda\_function.zip"  
  function\_name \= "seattle\_job\_scraper"  
  role          \= aws\_iam\_role.lambda\_exec\_role.arn  
  handler       \= "lambda\_function.lambda\_handler"  
  runtime       \= "python3.11"  
  timeout       \= 60  
  memory\_size   \= 512

  environment {  
    variables \= {  
      DYNAMODB\_TABLE\_NAME \= aws\_dynamodb\_table.job\_tracker.name  
      DISCORD\_WEBHOOK\_URL \= "YOUR\_DISCORD\_WEBHOOK\_URL\_HERE"  
    }  
  }  
}

\# 4\. EventBridge Schedule (8 AM \- 10 PM PST Every 5 Mins)  
resource "aws\_cloudwatch\_event\_rule" "cron\_trigger" {  
  name                \= "seattle\_job\_scraper\_5min\_cron"  
  schedule\_expression \= "cron(0/5 15-5 \* \* ? \*)"  
}

resource "aws\_cloudwatch\_event\_target" "trigger\_lambda" {  
  rule      \= aws\_cloudwatch\_event\_rule.cron\_trigger.name  
  target\_id \= "TargetLambda"  
  arn       \= aws\_lambda\_function.job\_scraper.arn  
}

resource "aws\_lambda\_permission" "allow\_eventbridge" {  
  statement\_id  \= "AllowExecutionFromEventBridge"  
  action        \= "lambda:InvokeFunction"  
  function\_name \= aws\_lambda\_function.job\_scraper.function\_name  
  principal     \= "events.amazonaws.com"  
  source\_arn    \= aws\_cloudwatch\_event\_rule.cron\_trigger.arn  
}

## **8\. Execution Checklist for Antigravity**

1. **Discord Integration:**  
   * Create a dedicated channel in your Discord server (\#seattle-job-alerts).  
   * Navigate to Channel Settings \-\> Integrations \-\> Webhooks and copy the Webhook URL into main.tf.  
2. **Frontend UI Deployment:**  
   * Deploy the React Web Dashboard code (app.jsx) to Vercel, Netlify, or AWS Amplify.  
3. **Bundle Lambda & Infrastructure:**  
   * Save Python code to lambda\_function.py.  
   * Package: zip lambda\_function.zip lambda\_function.py.  
   * Run terraform init and terraform apply \-auto-approve.  
4. **Validation:**  
   * Execute a test invocation in AWS Lambda console to verify DynamoDB persistence, Discord push alerts, and web UI reactivity.