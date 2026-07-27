import json
import os
import re
import urllib.request
import urllib.parse
import ssl
import time
import boto3

# Environment Variables
DYNAMODB_TABLE_NAME = os.environ.get("DYNAMODB_TABLE_NAME", "seattle_job_tracker")
DISCORD_WEBHOOK_URL = os.environ.get("DISCORD_WEBHOOK_URL", "")

# Initialize DynamoDB resource safely
try:
    dynamodb = boto3.resource("dynamodb", region_name="us-west-2")
    table = dynamodb.Table(DYNAMODB_TABLE_NAME)
except Exception as e:
    print(f"Warning: DynamoDB resource initialization skipped/failed: {e}")
    table = None

LOCATION_KEYWORDS = ["seattle", "bellevue", "redmond", "wa", "washington"]
ROLE_KEYWORDS = ["software", "sde", "swe", "product manager", "product management", "pm", "apm", "developer", "engineer"]

# Target New Grad & Early Career Keywords
NEW_GRAD_KEYWORDS = [
    "new grad", "new-grad", "university", "early career", "early-career",
    "entry level", "entry-level", "graduate", "college", "associate",
    "campus", "2025", "2026", "sde 1", "sde i", "swe 1", "swe i", "apm"
]

# Strict Exclusions for Experienced Roles
EXCLUDE_KEYWORDS = [
    "senior", "sr", "staff", "principal", "lead", "manager", "director",
    "vp", "head", "architect", "ii", "iii", "iv", "l5", "l6", "l7", "l8"
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9"
}

# SSL Context for HTTPS requests
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

def is_target_role_and_location(title: str, location: str) -> bool:
    title_lower = title.lower()
    location_lower = location.lower()
    
    # 1. Location match check
    match_location = any(loc in location_lower for loc in LOCATION_KEYWORDS)
    if not match_location:
        return False
        
    # 2. Role match check (SWE or PM)
    match_role = any(role in title_lower for role in ROLE_KEYWORDS)
    if not match_role:
        return False
        
    # 3. Explicit Senior / Experienced exclusion check
    has_exclusion = any(ex in title_lower for ex in EXCLUDE_KEYWORDS)
    if has_exclusion:
        return False

    # 4. New Grad / Early Career match check
    match_new_grad = any(ng in title_lower for ng in NEW_GRAD_KEYWORDS)
    
    return match_new_grad or not has_exclusion

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
                "role_level": "New Grad / Early Career",
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
        "content": "🎓 **NEW SEATTLE NEW GRAD / EARLY CAREER JOB DETECTED** 🚨",
        "embeds": [
            {
                "title": f"{company.upper()} - {title}",
                "url": url,
                "color": 3066993,
                "fields": [
                    {"name": "Location", "value": location or "Greater Seattle Area", "inline": True},
                    {"name": "Company", "value": company.capitalize(), "inline": True},
                    {"name": "Level", "value": "🎓 New Grad / Early Career", "inline": True}
                ],
                "footer": {"text": "Seattle New Grad Job Alert System • Immediate Apply Notification"}
            }
        ]
    }

    req = urllib.request.Request(
        DISCORD_WEBHOOK_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
    )
    
    try:
        with urllib.request.urlopen(req, context=ssl_ctx) as resp:
            if resp.status not in (200, 204):
                print(f"Failed to post to Discord. Status: {resp.status}")
    except Exception as e:
        print(f"Error delivering notification: {e}")

def fetch_json(url: str, post_data: dict = None, custom_headers: dict = None):
    try:
        req_headers = HEADERS.copy()
        if custom_headers:
            req_headers.update(custom_headers)

        data_bytes = json.dumps(post_data).encode("utf-8") if post_data is not None else None
        req = urllib.request.Request(url, data=data_bytes, headers=req_headers)
        with urllib.request.urlopen(req, timeout=10, context=ssl_ctx) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

# --- ATS Specific Scraper Implementations ---

def check_greenhouse_companies():
    boards = [
        {"name": "stripe", "slug": "stripe"},
        {"name": "databricks", "slug": "databricks"}
    ]
    new_jobs = []
    for b in boards:
        url = f"https://boards-api.greenhouse.io/v1/boards/{b['slug']}/jobs?content=true"
        data = fetch_json(url)
        if not data or "jobs" not in data:
            continue
        for job in data.get("jobs", []):
            job_id = f"{b['name']}_{job['id']}"
            title = job.get("title", "")
            location = job.get("location", {}).get("name", "")
            job_url = job.get("absolute_url", "")

            if is_target_role_and_location(title, location) and not is_already_notified(job_id):
                new_jobs.append({"job_id": job_id, "company": b['name'], "title": title, "location": location, "url": job_url})
    return new_jobs

def check_amazon():
    new_jobs = []
    url = "https://www.amazon.jobs/en/search.json?loc_query=Seattle%2C%20WA%2C%20United%20States&base_query=software&offset=0&result_limit=50&sort=recent"
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
    url = "https://services.careers.microsoft.com/search/api/v1/search?lc=Seattle%2C%20Washington%2C%20United%20States&q=software&l=en_us&pg=1&pgSz=30&o=Recent"
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

def check_eightfold_companies():
    # Eightfold API for DoorDash & Palantir
    endpoints = [
        {"company": "doordash", "url": "https://doordash.eightfold.ai/api/apply/v2/jobs?domain=doordash.com&start=0&num=30&location=Seattle%2C%20WA"},
        {"company": "palantir", "url": "https://palantir.eightfold.ai/api/apply/v2/jobs?domain=palantir.com&start=0&num=30&location=Seattle%2C%20WA"}
    ]
    new_jobs = []
    for ep in endpoints:
        data = fetch_json(ep["url"])
        if data and "positions" in data:
            for job in data["positions"]:
                job_id = f"{ep['company']}_{job.get('id')}"
                title = job.get("name", "")
                location = job.get("location", "Seattle, WA")
                job_url = job.get("canonicalPositionUrl", f"https://{ep['company']}.careers")

                if is_target_role_and_location(title, location) and not is_already_notified(job_id):
                    new_jobs.append({"job_id": job_id, "company": ep['company'], "title": title, "location": location, "url": job_url})
    return new_jobs

def check_workday_companies():
    endpoints = [
        {"company": "nvidia", "url": "https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs"},
        {"company": "uber", "url": "https://uber.wd1.myworkdayjobs.com/wday/cxs/uber/Uber_Careers/jobs"},
        {"company": "oracle", "url": "https://oracle.wd1.myworkdayjobs.com/wday/cxs/oracle/USA/jobs"},
        {"company": "snowflake", "url": "https://snowflake.wd1.myworkdayjobs.com/wday/cxs/snowflake/Snowflake_Careers/jobs"}
    ]
    new_jobs = []
    for ep in endpoints:
        post_body = {
            "appliedFacets": {},
            "limit": 20,
            "offset": 0,
            "searchText": "software",
            "userLanguage": "en"
        }
        custom_headers = {"Content-Type": "application/json"}
        data = fetch_json(ep["url"], post_data=post_body, custom_headers=custom_headers)
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
        check_amazon,
        check_microsoft,
        check_eightfold_companies,
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
        "body": json.dumps(f"Successfully processed scan. Found {len(all_new_jobs)} new target New Grad jobs.")
    }

if __name__ == "__main__":
    print("Testing New Grad scraper execution...")
    res = lambda_handler(None, None)
    print("Execution output:", res)
