"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Briefcase,
  ExternalLink,
  Clock,
  MapPin,
  Search,
  Filter,
  LayoutGrid,
  List,
  Plus,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  ChevronRight,
  X,
  Zap,
  TrendingUp,
  RotateCcw,
  Sparkles,
  BookmarkCheck,
  Send
} from "lucide-react";

// Target Companies & ATS Configuration
const TARGET_COMPANIES = [
  "Stripe", "Databricks", "Snowflake", "DoorDash", "Palantir",
  "Snap Inc.", "Amazon", "Microsoft", "Google", "Apple",
  "Meta", "Uber", "LinkedIn", "NVIDIA", "Oracle"
];

const INITIAL_JOBS = [
  {
    job_id: "stripe_829104",
    company: "Stripe",
    title: "Software Engineer, Infrastructure & Core Systems",
    location: "Seattle, WA",
    ats: "Greenhouse",
    url: "https://stripe.com/jobs/search?q=software",
    first_seen_at: Date.now() - 1000 * 60 * 12, // 12 mins ago
    applied_at: null,
    status: "New Drop", // New Drop, Applied, Interviewing, Offer, Rejected, Archived
    role_category: "Software Engineer",
    resume_version: "",
    referral_note: "",
    notes: ""
  },
  {
    job_id: "databricks_736201",
    company: "Databricks",
    title: "Senior Staff Product Manager - Lakehouse Compute Platform",
    location: "Bellevue, WA",
    ats: "Greenhouse",
    url: "https://www.databricks.com/company/careers/open-positions",
    first_seen_at: Date.now() - 1000 * 60 * 35, // 35 mins ago
    applied_at: null,
    status: "New Drop",
    role_category: "Product Manager",
    resume_version: "",
    referral_note: "",
    notes: ""
  },
  {
    job_id: "amazon_icims_991823",
    company: "Amazon",
    title: "Software Development Engineer II (SDE II) - AWS Database Services",
    location: "Seattle, WA",
    ats: "Custom API",
    url: "https://www.amazon.jobs/en/search.json",
    first_seen_at: Date.now() - 1000 * 60 * 95, // 1.5 hours ago
    applied_at: Date.now() - 1000 * 60 * 90,
    status: "Applied",
    role_category: "Software Engineer",
    resume_version: "SWE_Backend_v4_AWS.pdf",
    referral_note: "Reached out to L7 Mgr on LinkedIn",
    notes: "Applied 5 mins after drop."
  },
  {
    job_id: "msft_982103",
    company: "Microsoft",
    title: "Principal Product Manager - Azure AI Infrastructure",
    location: "Redmond, WA",
    ats: "Custom API",
    url: "https://jobs.careers.microsoft.com/",
    first_seen_at: Date.now() - 1000 * 60 * 240, // 4 hours ago
    applied_at: Date.now() - 1000 * 60 * 220,
    status: "Interviewing",
    role_category: "Product Manager",
    resume_version: "PM_AI_Infrastructure_v2.pdf",
    referral_note: "Internal referral submitted",
    notes: "Recruiter phone screen scheduled for Thursday."
  },
  {
    job_id: "snowflake_621900",
    company: "Snowflake",
    title: "Software Engineer - Distributed Query Processing",
    location: "Bellevue, WA",
    ats: "Greenhouse",
    url: "https://www.snowflake.com/en/company/careers/",
    first_seen_at: Date.now() - 1000 * 60 * 400,
    applied_at: null,
    status: "New Drop",
    role_category: "Software Engineer",
    resume_version: "",
    referral_note: "",
    notes: ""
  },
  {
    job_id: "google_102938",
    company: "Google",
    title: "Staff Software Engineer, Google Cloud Platform",
    location: "Seattle, WA, USA",
    ats: "Custom API",
    url: "https://careers.google.com/jobs/results/",
    first_seen_at: Date.now() - 1000 * 60 * 600,
    applied_at: Date.now() - 1000 * 60 * 595,
    status: "Applied",
    role_category: "Software Engineer",
    resume_version: "SWE_Distributed_Systems_v1.pdf",
    referral_note: "Ex-colleague referral",
    notes: "Applied in under 5 minutes!"
  }
];

const LOCAL_STORAGE_KEY = "seattle_job_tracker_data";

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Filters & Views State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'table'

  // Modal / Drawer State
  const [activeDrawerJob, setActiveDrawerJob] = useState(null);
  const [drawerForm, setDrawerForm] = useState({
    resume_version: "",
    referral_note: "",
    notes: "",
    status: "Applied"
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newJobForm, setNewJobForm] = useState({
    company: "Stripe",
    title: "",
    location: "Seattle, WA",
    url: "",
    role_category: "Software Engineer"
  });

  // 1. Initial Load & Persistence
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setJobs(JSON.parse(stored));
      } else {
        setJobs(INITIAL_JOBS);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_JOBS));
      }
    } catch (e) {
      console.error("Failed to load from LocalStorage:", e);
      setJobs(INITIAL_JOBS);
    }
    setIsLoaded(true);
  }, []);

  const saveJobsToStorage = (updatedJobs) => {
    setJobs(updatedJobs);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedJobs));
    } catch (e) {
      console.error("Failed to save to LocalStorage:", e);
    }
  };

  // 2. Calculated Analytics Metrics
  const metrics = useMemo(() => {
    const total = jobs.length;
    const newDrops = jobs.filter((j) => j.status === "New Drop").length;
    const applied = jobs.filter((j) => j.status === "Applied").length;
    const interviewing = jobs.filter((j) => j.status === "Interviewing").length;
    const offer = jobs.filter((j) => j.status === "Offer").length;

    // Speed-to-apply calculation for jobs applied
    const appliedJobsWithSpeed = jobs.filter(
      (j) => j.applied_at && j.first_seen_at && j.applied_at >= j.first_seen_at
    );
    const avgMinutes =
      appliedJobsWithSpeed.length > 0
        ? Math.round(
            appliedJobsWithSpeed.reduce(
              (acc, j) => acc + (j.applied_at - j.first_seen_at) / (1000 * 60),
              0
            ) / appliedJobsWithSpeed.length
          )
        : 4;

    return { total, newDrops, applied, interviewing, offer, avgMinutes };
  }, [jobs]);

  // 3. Filtered Job List
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Search query matcher
      const matchesSearch =
        searchQuery === "" ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase());

      // Status matcher
      const matchesStatus =
        statusFilter === "All" || job.status === statusFilter;

      // Role matcher
      const matchesRole =
        roleFilter === "All" ||
        (roleFilter === "Software Engineer" &&
          (job.role_category === "Software Engineer" ||
            job.title.toLowerCase().includes("software") ||
            job.title.toLowerCase().includes("sde") ||
            job.title.toLowerCase().includes("swe"))) ||
        (roleFilter === "Product Manager" &&
          (job.role_category === "Product Manager" ||
            job.title.toLowerCase().includes("product") ||
            job.title.toLowerCase().includes("pm")));

      // Company matcher
      const matchesCompany =
        companyFilter === "All" ||
        job.company.toLowerCase() === companyFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesRole && matchesCompany;
    });
  }, [jobs, searchQuery, statusFilter, roleFilter, companyFilter]);

  // 4. Job Action Handlers
  const handleApplyNow = (jobId, url) => {
    // Open direct career portal link in a new tab
    window.open(url, "_blank", "noopener,noreferrer");

    // Automatically update job status to Applied with timestamp
    const now = Date.now();
    const updated = jobs.map((j) => {
      if (j.job_id === jobId) {
        return {
          ...j,
          status: j.status === "New Drop" ? "Applied" : j.status,
          applied_at: j.applied_at || now
        };
      }
      return j;
    });
    saveJobsToStorage(updated);
  };

  const handleUpdateStatus = (jobId, newStatus) => {
    const now = Date.now();
    const updated = jobs.map((j) => {
      if (j.job_id === jobId) {
        return {
          ...j,
          status: newStatus,
          applied_at: newStatus === "Applied" && !j.applied_at ? now : j.applied_at
        };
      }
      return j;
    });
    saveJobsToStorage(updated);
  };

  const handleOpenDrawer = (job) => {
    setActiveDrawerJob(job);
    setDrawerForm({
      resume_version: job.resume_version || "",
      referral_note: job.referral_note || "",
      notes: job.notes || "",
      status: job.status
    });
  };

  const handleSaveDrawerNotes = (e) => {
    e.preventDefault();
    if (!activeDrawerJob) return;

    const updated = jobs.map((j) => {
      if (j.job_id === activeDrawerJob.job_id) {
        return {
          ...j,
          resume_version: drawerForm.resume_version,
          referral_note: drawerForm.referral_note,
          notes: drawerForm.notes,
          status: drawerForm.status,
          applied_at:
            drawerForm.status === "Applied" && !j.applied_at
              ? Date.now()
              : j.applied_at
        };
      }
      return j;
    });

    saveJobsToStorage(updated);
    setActiveDrawerJob(null);
  };

  const handleAddManualJob = (e) => {
    e.preventDefault();
    if (!newJobForm.title || !newJobForm.url) return;

    const createdJob = {
      job_id: `${newJobForm.company.toLowerCase().replace(/\s+/g, "")}_${Date.now()}`,
      company: newJobForm.company,
      title: newJobForm.title,
      location: newJobForm.location || "Seattle, WA",
      ats: "Manual Entry",
      url: newJobForm.url,
      first_seen_at: Date.now(),
      applied_at: null,
      status: "New Drop",
      role_category: newJobForm.role_category,
      resume_version: "",
      referral_note: "",
      notes: ""
    };

    saveJobsToStorage([createdJob, ...jobs]);
    setIsAddModalOpen(false);
    setNewJobForm({
      company: "Stripe",
      title: "",
      location: "Seattle, WA",
      url: "",
      role_category: "Software Engineer"
    });
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jobs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `seattle_job_tracker_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportData = (e) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (Array.isArray(parsed)) {
            saveJobsToStorage(parsed);
            alert(`Successfully imported ${parsed.length} job records.`);
          }
        } catch (err) {
          alert("Invalid JSON data file format.");
        }
      };
    }
  };

  const handleResetData = () => {
    if (confirm("Reset to default dataset? This will replace your local state.")) {
      saveJobsToStorage(INITIAL_JOBS);
    }
  };

  // Helper formatting function for relative time
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "N/A";
    const diffMins = Math.floor((Date.now() - timestamp) / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#09090b] text-zinc-400">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
          <span className="mono-font text-sm">Initializing Seattle Job Monitor State...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col font-sans antialiased">
      {/* 1. Minimalist Top Bar Header */}
      <header className="border-b border-[#27272a] bg-[#18181b]/80 backdrop-blur sticky top-0 z-30 px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 pulse-indicator" />
            <h1 className="font-semibold text-base tracking-tight text-white flex items-center gap-2">
              <span>Seattle Tech Job Monitor</span>
              <span className="text-xs font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded">
                15 Hubs • 5m Polling
              </span>
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400 border-l border-zinc-800 pl-4 mono-font">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>Target Window: 8:00 AM - 10:00 PM PST</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-md transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Job</span>
          </button>

          <button
            onClick={handleExportData}
            title="Export state JSON"
            className="flex items-center gap-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-2.5 py-1.5 rounded-md transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <label
            title="Import state JSON"
            className="flex items-center gap-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-2.5 py-1.5 rounded-md transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import</span>
            <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
          </label>

          <button
            onClick={handleResetData}
            title="Reset default dataset"
            className="flex items-center text-xs text-zinc-400 hover:text-zinc-200 p-1.5 rounded-md transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. Main Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        
        {/* Speed Analytics Metric Strip */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-[#18181b] border border-[#27272a] p-3.5 rounded-lg flex flex-col justify-between">
            <span className="text-xs font-medium text-zinc-400 flex items-center justify-between">
              New Drops
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold mono-font text-amber-400">{metrics.newDrops}</span>
              <span className="text-xs text-zinc-500">Unapplied</span>
            </div>
          </div>

          <div className="bg-[#18181b] border border-[#27272a] p-3.5 rounded-lg flex flex-col justify-between">
            <span className="text-xs font-medium text-zinc-400 flex items-center justify-between">
              Applied
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold mono-font text-emerald-400">{metrics.applied}</span>
              <span className="text-xs text-zinc-500">Submissions</span>
            </div>
          </div>

          <div className="bg-[#18181b] border border-[#27272a] p-3.5 rounded-lg flex flex-col justify-between">
            <span className="text-xs font-medium text-zinc-400 flex items-center justify-between">
              Interviewing
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold mono-font text-blue-400">{metrics.interviewing}</span>
              <span className="text-xs text-zinc-500">Active Pipeline</span>
            </div>
          </div>

          <div className="bg-[#18181b] border border-[#27272a] p-3.5 rounded-lg flex flex-col justify-between">
            <span className="text-xs font-medium text-zinc-400 flex items-center justify-between">
              Avg Speed-to-Apply
              <Clock className="w-3.5 h-3.5 text-purple-400" />
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold mono-font text-purple-400">
                {metrics.avgMinutes} <span className="text-sm font-normal">m</span>
              </span>
              <span className="text-xs text-emerald-400">&lt; 5m goal</span>
            </div>
          </div>

          <div className="bg-[#18181b] border border-[#27272a] p-3.5 rounded-lg col-span-2 md:col-span-1 flex flex-col justify-between">
            <span className="text-xs font-medium text-zinc-400 flex items-center justify-between">
              Total Tracked
              <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold mono-font text-white">{metrics.total}</span>
              <span className="text-xs text-zinc-500">Roles</span>
            </div>
          </div>
        </section>

        {/* 3. Controls & Filter Bar */}
        <section className="bg-[#18181b] border border-[#27272a] p-4 rounded-lg space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search job title, company, or location (e.g. Bellevue, SDE, Stripe)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#09090b] border border-[#27272a] focus:border-zinc-500 focus:outline-none text-xs text-white pl-9 pr-4 py-2 rounded-md transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Select Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              
              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-[#09090b] border border-[#27272a] px-2.5 py-1.5 rounded-md">
                <span className="text-zinc-500">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-white focus:outline-none font-medium cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="New Drop">⚡ New Drop</option>
                  <option value="Applied">✓ Applied</option>
                  <option value="Interviewing">💬 Interviewing</option>
                  <option value="Offer">🎉 Offer</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-1.5 bg-[#09090b] border border-[#27272a] px-2.5 py-1.5 rounded-md">
                <span className="text-zinc-500">Role:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-transparent text-white focus:outline-none font-medium cursor-pointer"
                >
                  <option value="All">All Roles</option>
                  <option value="Software Engineer">SWE / SDE</option>
                  <option value="Product Manager">PM / Product</option>
                </select>
              </div>

              {/* Company Filter */}
              <div className="flex items-center gap-1.5 bg-[#09090b] border border-[#27272a] px-2.5 py-1.5 rounded-md">
                <span className="text-zinc-500">Company:</span>
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="bg-transparent text-white focus:outline-none font-medium cursor-pointer max-w-[130px] truncate"
                >
                  <option value="All">All 15 Hubs</option>
                  {TARGET_COMPANIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-[#09090b] border border-[#27272a] rounded-md p-0.5 ml-auto md:ml-0">
                <button
                  onClick={() => setViewMode("cards")}
                  className={`p-1.5 rounded ${
                    viewMode === "cards"
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                  title="Card View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded ${
                    viewMode === "table"
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                  title="Table View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* 4. Direct Action Job Listings */}
        {filteredJobs.length === 0 ? (
          <div className="bg-[#18181b] border border-[#27272a] p-12 text-center rounded-lg space-y-3">
            <Briefcase className="w-8 h-8 mx-auto text-zinc-600" />
            <h3 className="text-sm font-medium text-zinc-300">No matching job drops found</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Try adjusting your search query, status filters, or company parameters.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("All");
                setRoleFilter("All");
                setCompanyFilter("All");
              }}
              className="text-xs text-emerald-400 hover:underline pt-2 inline-block"
            >
              Clear all filters
            </button>
          </div>
        ) : viewMode === "cards" ? (
          /* Cards View Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job) => (
              <div
                key={job.job_id}
                className="bg-[#18181b] border border-[#27272a] hover:border-zinc-700 p-4 rounded-lg flex flex-col justify-between transition group relative"
              >
                <div>
                  {/* Company & ATS Header */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-white bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded">
                        {job.company}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {job.ats}
                      </span>
                    </div>

                    {/* Status Pill */}
                    <select
                      value={job.status}
                      onChange={(e) => handleUpdateStatus(job.job_id, e.target.value)}
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none ${
                        job.status === "New Drop"
                          ? "bg-amber-950/60 border-amber-800 text-amber-400"
                          : job.status === "Applied"
                          ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                          : job.status === "Interviewing"
                          ? "bg-blue-950/60 border-blue-800 text-blue-400"
                          : job.status === "Offer"
                          ? "bg-purple-950/60 border-purple-800 text-purple-400"
                          : "bg-zinc-900 border-zinc-700 text-zinc-400"
                      }`}
                    >
                      <option value="New Drop">⚡ New Drop</option>
                      <option value="Applied">✓ Applied</option>
                      <option value="Interviewing">💬 Interviewing</option>
                      <option value="Offer">🎉 Offer</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  {/* Job Title */}
                  <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-white line-clamp-2 leading-snug">
                    {job.title}
                  </h3>

                  {/* Metadata Row */}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-zinc-500" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-1 mono-font text-[11px] text-zinc-500">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      <span>{formatTimeAgo(job.first_seen_at)}</span>
                    </div>
                  </div>

                  {/* Resume & Notes Preview */}
                  {(job.resume_version || job.notes || job.referral_note) && (
                    <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-1 text-xs text-zinc-400">
                      {job.resume_version && (
                        <div className="flex items-center gap-1.5 text-zinc-300 truncate">
                          <FileText className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          <span className="truncate mono-font text-[11px]">
                            {job.resume_version}
                          </span>
                        </div>
                      )}
                      {job.referral_note && (
                        <p className="text-[11px] text-zinc-400 truncate italic">
                          Ref: {job.referral_note}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenDrawer(job)}
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition py-1 px-2 rounded hover:bg-zinc-800"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Log Resume / Notes</span>
                  </button>

                  <button
                    onClick={() => handleApplyNow(job.job_id, job.url)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded transition ${
                      job.status === "Applied"
                        ? "bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-zinc-700"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                    }`}
                  >
                    <span>{job.status === "Applied" ? "Applied ✓" : "Apply Now"}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-[#18181b] border border-[#27272a] rounded-lg overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#27272a] text-zinc-400 bg-zinc-900/50">
                  <th className="p-3 font-medium">Company</th>
                  <th className="p-3 font-medium">Role & Title</th>
                  <th className="p-3 font-medium">Location</th>
                  <th className="p-3 font-medium">Detected</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Logged Resume</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredJobs.map((job) => (
                  <tr key={job.job_id} className="hover:bg-zinc-900/40 transition">
                    <td className="p-3 font-medium text-white whitespace-nowrap">
                      {job.company}
                    </td>
                    <td className="p-3 font-medium text-zinc-200 max-w-xs truncate">
                      {job.title}
                    </td>
                    <td className="p-3 text-zinc-400 whitespace-nowrap">
                      {job.location}
                    </td>
                    <td className="p-3 text-zinc-500 mono-font text-[11px] whitespace-nowrap">
                      {formatTimeAgo(job.first_seen_at)}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <select
                        value={job.status}
                        onChange={(e) => handleUpdateStatus(job.job_id, e.target.value)}
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none ${
                          job.status === "New Drop"
                            ? "bg-amber-950/60 border-amber-800 text-amber-400"
                            : job.status === "Applied"
                            ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                            : job.status === "Interviewing"
                            ? "bg-blue-950/60 border-blue-800 text-blue-400"
                            : job.status === "Offer"
                            ? "bg-purple-950/60 border-purple-800 text-purple-400"
                            : "bg-zinc-900 border-zinc-700 text-zinc-400"
                        }`}
                      >
                        <option value="New Drop">⚡ New Drop</option>
                        <option value="Applied">✓ Applied</option>
                        <option value="Interviewing">💬 Interviewing</option>
                        <option value="Offer">🎉 Offer</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="p-3 text-zinc-400 mono-font text-[11px] max-w-[150px] truncate">
                      {job.resume_version || "-"}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => handleOpenDrawer(job)}
                        className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 inline-block"
                        title="Edit Notes"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleApplyNow(job.job_id, job.url)}
                        className={`inline-flex items-center gap-1 font-medium px-2.5 py-1 rounded transition ${
                          job.status === "Applied"
                            ? "bg-zinc-800 text-emerald-400 border border-zinc-700"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white"
                        }`}
                      >
                        <span>{job.status === "Applied" ? "Applied" : "Apply"}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* 5. Resume & Notes Drawer Modal */}
      {activeDrawerJob && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="bg-[#18181b] border-l border-[#27272a] w-full max-w-md h-full flex flex-col justify-between p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              {/* Drawer Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-800">
                <div>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
                    {activeDrawerJob.company}
                  </span>
                  <h2 className="font-bold text-base text-white mt-1.5 leading-snug">
                    {activeDrawerJob.title}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">{activeDrawerJob.location}</p>
                </div>
                <button
                  onClick={() => setActiveDrawerJob(null)}
                  className="text-zinc-500 hover:text-white p-1 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveDrawerNotes} className="mt-6 space-y-4 text-xs">
                
                {/* Application Status */}
                <div>
                  <label className="block font-medium text-zinc-300 mb-1.5">
                    Pipeline Status
                  </label>
                  <select
                    value={drawerForm.status}
                    onChange={(e) => setDrawerForm({ ...drawerForm, status: e.target.value })}
                    className="w-full bg-[#09090b] border border-[#27272a] text-white p-2.5 rounded-md focus:border-zinc-500 focus:outline-none"
                  >
                    <option value="New Drop">⚡ New Drop</option>
                    <option value="Applied">✓ Applied</option>
                    <option value="Interviewing">💬 Interviewing</option>
                    <option value="Offer">🎉 Offer</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {/* Resume Version Log */}
                <div>
                  <label className="block font-medium text-zinc-300 mb-1.5">
                    Resume Variant Used
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SWE_Backend_v3_Stripe.pdf"
                    value={drawerForm.resume_version}
                    onChange={(e) => setDrawerForm({ ...drawerForm, resume_version: e.target.value })}
                    className="w-full bg-[#09090b] border border-[#27272a] text-white p-2.5 rounded-md focus:border-zinc-500 focus:outline-none mono-font"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Keep track of which tailored resume variant was submitted.
                  </p>
                </div>

                {/* Referral & Recruiter Note */}
                <div>
                  <label className="block font-medium text-zinc-300 mb-1.5">
                    Referral / Recruiter Contact
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Referred by Jane (L6 SWE) / Recruiter DM on LinkedIn"
                    value={drawerForm.referral_note}
                    onChange={(e) => setDrawerForm({ ...drawerForm, referral_note: e.target.value })}
                    className="w-full bg-[#09090b] border border-[#27272a] text-white p-2.5 rounded-md focus:border-zinc-500 focus:outline-none"
                  />
                </div>

                {/* Interview Notes & Free Form Log */}
                <div>
                  <label className="block font-medium text-zinc-300 mb-1.5">
                    Application & Interview Notes
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Record interview dates, tech screen topics, salary disclosures..."
                    value={drawerForm.notes}
                    onChange={(e) => setDrawerForm({ ...drawerForm, notes: e.target.value })}
                    className="w-full bg-[#09090b] border border-[#27272a] text-white p-2.5 rounded-md focus:border-zinc-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-4 flex items-center gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-md transition text-xs shadow-sm"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDrawerJob(null)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2 rounded-md transition text-xs border border-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>

            {/* Direct Portal Link */}
            <div className="pt-6 border-t border-zinc-800 text-xs text-zinc-400">
              <a
                href={activeDrawerJob.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between text-zinc-300 hover:text-white p-2 bg-zinc-900 border border-zinc-800 rounded-md transition"
              >
                <span>Direct Career Portal Link</span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 6. Manual Add Job Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#18181b] border border-[#27272a] w-full max-w-md rounded-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-sm text-white">Add Manual Job Tracking Entry</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddManualJob} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-400 mb-1">Company</label>
                <select
                  value={newJobForm.company}
                  onChange={(e) => setNewJobForm({ ...newJobForm, company: e.target.value })}
                  className="w-full bg-[#09090b] border border-[#27272a] text-white p-2 rounded-md focus:border-zinc-500 focus:outline-none"
                >
                  {TARGET_COMPANIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-zinc-400 mb-1">Job Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Software Engineer - Infrastructure"
                  value={newJobForm.title}
                  onChange={(e) => setNewJobForm({ ...newJobForm, title: e.target.value })}
                  className="w-full bg-[#09090b] border border-[#27272a] text-white p-2 rounded-md focus:border-zinc-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-zinc-400 mb-1">Location</label>
                  <input
                    type="text"
                    value={newJobForm.location}
                    onChange={(e) => setNewJobForm({ ...newJobForm, location: e.target.value })}
                    className="w-full bg-[#09090b] border border-[#27272a] text-white p-2 rounded-md focus:border-zinc-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-400 mb-1">Role Category</label>
                  <select
                    value={newJobForm.role_category}
                    onChange={(e) => setNewJobForm({ ...newJobForm, role_category: e.target.value })}
                    className="w-full bg-[#09090b] border border-[#27272a] text-white p-2 rounded-md focus:border-zinc-500 focus:outline-none"
                  >
                    <option value="Software Engineer">Software Engineer</option>
                    <option value="Product Manager">Product Manager</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-400 mb-1">Application URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={newJobForm.url}
                  onChange={(e) => setNewJobForm({ ...newJobForm, url: e.target.value })}
                  className="w-full bg-[#09090b] border border-[#27272a] text-white p-2 rounded-md focus:border-zinc-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-500"
                >
                  Add Job Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
