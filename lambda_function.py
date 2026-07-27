import json
import os
import re
import urllib.request
import urllib.parse
import time
import boto3

# Environment Variables
DYNAMODB_TABLE_NAME = os.environ.get("DYNAMODB_TABLE_NAME", "seattle_job_tracker")
DISCORD_WEBHOOK_URL = os.environ.get("DISCORD_WEBHOOK_URL", "")

# Initialize DynamoDB resource safely
try:
    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(DYNAMODB_TABLE_NAME)
except Exception as e:
    print(f"Warning: DynamoDB resource initialization skipped/failed: {e}")
    table = None

LOCATION_KEYWORDS = ["seattle", "bellevue", "redmond"]
ROLE_KEYWORDS = ["software", "sde", "swe", "product manager", "product management", "pm"]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*"
}

def is_target_role_and_location(title: str, location: str) -> bool:
    title_lower = title.lower()
    location_lower = location.lower()
    
    match_location = any(loc in location_lower for loc in LOCATION_KEYWORDS)
    match_role = any(role in title_lower for role in ROLE_KEYWORDS)
    
    return match_location and match_role

def is_already_notified(job_id: str) -> bool:
    if not table:
        return False
    try:
        response = table.get_item(Key={"job_id": job_id})
        return "Item" in response
    except Exception as e:
        print(f"Error checking DynamoDB for {job_id}: {e}")
        return False

def save_job_state(job_id: str, company: str, title: str, url: str):
    if not table:
        return
    ttl_timestamp = int(time.time()) + (30 * 24 * 60 * 60)  # 30-day auto-purge
    try:
        table.put_item(
            Item={
                "job_id": job_id,
                "company": company,
                "title": title,
                "url": url,
                "first_seen_at": int(time.time()),
                "ttl": ttl_timestamp
            }
        )
    except Exception as e:
        print(f"Error saving job to DynamoDB: {e}")

def send_discord_alert(company: str, title: str, location: str, url: str):
    if not DISCORD_WEBHOOK_URL:
        print("No Webhook URL configured. Alert skipped.")
        return

    payload = {
        "content": "🚨 **NEW SEATTLE JOB OPENING DETECTED** 🚨",
        "embeds": [
            {
                "title": f"{company.upper()} - {title}",
                "url": url,
                "color": 3066993,
                "fields": [
                    {"name": "Location", "value": location or "Greater Seattle Area", "inline": True},
                    {"name": "Company", "value": company.capitalize(), "inline": True}
                ],
                "footer": {"text": "Seattle Tech Job Alert System • Immediate Apply Notification"}
            }
        ]
    }

    req = urllib.request.Request(
        DISCORD_WEBHOOK_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
    )
    
    try:
        with urllib.request.urlopen(req) as resp:
            if resp.status not in (200, 204):
                print(f"Failed to post to Discord. Status: {resp.status}")
    except Exception as e:
        print(f"Error delivering notification: {e}")

def fetch_json(url: str, post_data: dict = None):
    try:
        data_bytes = json.dumps(post_data).encode("utf-8") if post_data else None
        req = urllib.request.Request(url, data=data_bytes, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=8) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

# --- ATS Specific Scraper Implementations ---

def check_greenhouse_companies():
    companies = ["stripe", "databricks", "snowflake", "doordash", "palantir"]
    new_jobs = []
    for company in companies:
        url = f"https://boards-api.greenhouse.io/v1/boards/{company}/jobs?content=true"
        data = fetch_json(url)
        if not data:
            continue
        for job in data.get("jobs", []):
            job_id = f"{company}_{job['id']}"
            title = job.get("title", "")
            location = job.get("location", {}).get("name", "")
            job_url = job.get("absolute_url", "")

            if is_target_role_and_location(title, location) and not is_already_notified(job_id):
                new_jobs.append({"job_id": job_id, "company": company, "title": title, "location": location, "url": job_url})
    return new_jobs

def check_lever_companies():
    companies = ["snap"]
    new_jobs = []
    for company in companies:
        url = f"https://api.lever.co/v0/postings/{company}?mode=json"
        data = fetch_json(url)
        if not data or not isinstance(data, list):
            continue
        for job in data:
            job_id = f"{company}_{job['id']}"
            title = job.get("text", "")
            categories = job.get("categories", {})
            location = categories.get("location", "")
            job_url = job.get("hostedUrl", "")

            if is_target_role_and_location(title, location) and not is_already_notified(job_id):
                new_jobs.append({"job_id": job_id, "company": company, "title": title, "location": location, "url": job_url})
    return new_jobs

def check_amazon():
    new_jobs = []
    url = "https://www.amazon.jobs/en/search.json?loc_query=Seattle%2C%20WA%2C%20United%20States&offset=0&result_limit=30&sort=recent"
    data = fetch_json(url)
    if data and "jobs" in data:
        for job in data["jobs"]:
            job_id = f"amazon_{job['id_icims']}"
            title = job.get("title", "")
            location = job.get("location", "")
            job_url = f"https://www.amazon.jobs{job.get('job_path', '')}"

            if is_target_role_and_location(title, location) and not is_already_notified(job_id):
                new_jobs.append({"job_id": job_id, "company": "amazon", "title": title, "location": location, "url": job_url})
    return new_jobs

def check_microsoft():
    new_jobs = []
    url = "https://gcsservices.careers.microsoft.com/search/api/v1/search?lc=Seattle%2C%20Washington%2C%20United%20States&l=en_us&pg=1&pgSz=20&o=Recent"
    data = fetch_json(url)
    if data and "operationResult" in data and "result" in data["operationResult"]:
        jobs = data["operationResult"]["result"].get("jobs", [])
        for job in jobs:
            job_id = f"msft_{job.get('jobId')}"
            title = job.get("title", "")
            location = job.get("properties", {}).get("primaryLocation", "Seattle, WA")
            job_url = f"https://jobs.careers.microsoft.com/global/en/job/{job.get('jobId')}"

            if is_target_role_and_location(title, location) and not is_already_notified(job_id):
                new_jobs.append({"job_id": job_id, "company": "microsoft", "title": title, "location": location, "url": job_url})
    return new_jobs

def check_google():
    new_jobs = []
    url = "https://careers.google.com/api/v3/search/?distance=50&q=software%20product%20manager&location=Seattle%2C%20WA%2C%20USA"
    data = fetch_json(url)
    if data and "jobs" in data:
        for job in data["jobs"]:
            raw_id = job.get("id", "").split("/")[-1]
            job_id = f"google_{raw_id}"
            title = job.get("title", "")
            locations = ", ".join([loc.get("display", "") for loc in job.get("locations", [])])
            job_url = f"https://careers.google.com/jobs/results/{raw_id}"

            if is_target_role_and_location(title, locations) and not is_already_notified(job_id):
                new_jobs.append({"job_id": job_id, "company": "google", "title": title, "location": locations, "url": job_url})
    return new_jobs

def check_apple():
    new_jobs = []
    url = "https://jobs.apple.com/api/v1/job/search?location=seattle-USA"
    data = fetch_json(url)
    if data and "searchResults" in data:
        for job in data["searchResults"]:
            job_id = f"apple_{job.get('id')}"
            title = job.get("postingTitle", "")
            locations_list = job.get("locations", [{}])
            location = locations_list[0].get("city", "Seattle") if locations_list else "Seattle"
            job_url = f"https://jobs.apple.com/en-us/details/{job.get('id')}"

            if is_target_role_and_location(title, location) and not is_already_notified(job_id):
                new_jobs.append({"job_id": job_id, "company": "apple", "title": title, "location": location, "url": job_url})
    return new_jobs

def check_workday_companies():
    endpoints = [
        {"company": "nvidia", "url": "https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs"},
        {"company": "uber", "url": "https://uber.wd1.myworkdayjobs.com/wday/cxs/uber/Uber_Careers/jobs"},
        {"company": "oracle", "url": "https://oracle.wd1.myworkdayjobs.com/wday/cxs/oracle/USA/jobs"}
    ]
    new_jobs = []
    for ep in endpoints:
        post_body = {"searchText": "Software Product", "limit": 20, "offset": 0}
        data = fetch_json(ep["url"], post_data=post_body)
        if data and "jobPostings" in data:
            for job in data["jobPostings"]:
                raw_path = job.get("externalPath", "")
                job_id = f"{ep['company']}_{abs(hash(raw_path))}"
                title = job.get("title", "")
                location = job.get("locationsText", "")
                job_url = f"{ep['url'].split('/wday')[0]}{raw_path}"

                if is_target_role_and_location(title, location) and not is_already_notified(job_id):
                    new_jobs.append({"job_id": job_id, "company": ep["company"], "title": title, "location": location, "url": job_url})
    return new_jobs

# --- Main Entry Point ---

def lambda_handler(event, context):
    all_new_jobs = []
    
    scrapers = [
        check_greenhouse_companies,
        check_lever_companies,
        check_amazon,
        check_microsoft,
        check_google,
        check_apple,
        check_workday_companies
    ]
    
    for scraper in scrapers:
        try:
            jobs = scraper()
            if jobs:
                all_new_jobs.extend(jobs)
        except Exception as e:
            print(f"Error executing scraper {scraper.__name__}: {e}")

    for job in all_new_jobs:
        send_discord_alert(
            company=job["company"],
            title=job["title"],
            location=job["location"],
            url=job["url"]
        )
        save_job_state(
            job_id=job["job_id"],
            company=job["company"],
            title=job["title"],
            url=job["url"]
        )

    return {
        "statusCode": 200,
        "body": json.dumps(f"Successfully processed scan. Found {len(all_new_jobs)} new target jobs.")
    }

if __name__ == "__main__":
    print("Testing lambda handler execution...")
    res = lambda_handler(None, None)
    print("Execution output:", res)
