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
  FileText,
  X,
  Zap,
  TrendingUp,
  RotateCcw,
  RefreshCw,
  GraduationCap,
  ArrowUpRight,
  Database,
  Check,
  Building2,
  Trash2,
  Undo2,
  Flag,
  Bookmark,
  Eye,
  EyeOff,
  Star
} from "lucide-react";

// Target Companies Config
const TARGET_COMPANIES = [
  "Stripe", "Databricks", "Snowflake", "DoorDash", "Palantir",
  "Snap Inc.", "Amazon", "Microsoft", "Google", "Apple",
  "Meta", "Uber", "LinkedIn", "NVIDIA", "Oracle"
];

// Clean Initial Dataset with Viewed & Flagged defaults
const INITIAL_NEW_GRAD_JOBS = [
  {
    job_id: "stripe_ng_829104",
    company: "Stripe",
    title: "Software Engineer, New Grad 2026",
    location: "Seattle, WA",
    ats: "Greenhouse",
    url: "https://stripe.com/jobs/search?q=new+grad",
    first_seen_at: Date.now() - 1000 * 60 * 12,
    applied_at: null,
    status: "New Drop",
    role_category: "Software Engineer",
    role_level: "New Grad",
    resume_version: "",
    referral_note: "",
    notes: "",
    is_viewed: false,
    is_flagged: true
  },
  {
    job_id: "databricks_ng_736201",
    company: "Databricks",
    title: "Associate Product Manager (APM), University Graduate",
    location: "Bellevue, WA",
    ats: "Greenhouse",
    url: "https://www.databricks.com/company/careers/open-positions",
    first_seen_at: Date.now() - 1000 * 60 * 35,
    applied_at: null,
    status: "New Drop",
    role_category: "Product Manager",
    role_level: "New Grad",
    resume_version: "",
    referral_note: "",
    notes: "",
    is_viewed: false,
    is_flagged: false
  },
  {
    job_id: "amazon_icims_ng_991823",
    company: "Amazon",
    title: "Software Development Engineer I (SDE I), Early Career 2025/2026",
    location: "Seattle, WA",
    ats: "Custom API",
    url: "https://www.amazon.jobs/en/search.json?base_query=new%20grad",
    first_seen_at: Date.now() - 1000 * 60 * 95,
    applied_at: Date.now() - 1000 * 60 * 90,
    status: "Applied",
    role_category: "Software Engineer",
    role_level: "New Grad",
    resume_version: "SWE_NewGrad_v3_AWS.pdf",
    referral_note: "Contacted AWS Technical Recruiter on LinkedIn",
    notes: "Submitted 5 minutes post release.",
    is_viewed: true,
    is_flagged: true
  },
  {
    job_id: "msft_ng_982103",
    company: "Microsoft",
    title: "Software Engineer, University Graduates Full-Time",
    location: "Redmond, WA",
    ats: "Custom API",
    url: "https://jobs.careers.microsoft.com/",
    first_seen_at: Date.now() - 1000 * 60 * 240,
    applied_at: Date.now() - 1000 * 60 * 220,
    status: "Interviewing",
    role_category: "Software Engineer",
    role_level: "New Grad",
    resume_version: "SWE_University_v2.pdf",
    referral_note: "Submitted campus referral code",
    notes: "First round technical screen scheduled.",
    is_viewed: true,
    is_flagged: false
  },
  {
    job_id: "snowflake_ng_621900",
    company: "Snowflake",
    title: "Associate Software Engineer, Entry Level",
    location: "Bellevue, WA",
    ats: "Greenhouse",
    url: "https://www.snowflake.com/en/company/careers/",
    first_seen_at: Date.now() - 1000 * 60 * 400,
    applied_at: null,
    status: "New Drop",
    role_category: "Software Engineer",
    role_level: "New Grad",
    resume_version: "",
    referral_note: "",
    notes: "",
    is_viewed: false,
    is_flagged: false
  },
  {
    job_id: "google_ng_102938",
    company: "Google",
    title: "Software Engineer, Early Career, Campus 2026",
    location: "Seattle, WA, USA",
    ats: "Custom API",
    url: "https://careers.google.com/jobs/results/",
    first_seen_at: Date.now() - 1000 * 60 * 600,
    applied_at: Date.now() - 1000 * 60 * 595,
    status: "Applied",
    role_category: "Software Engineer",
    role_level: "New Grad",
    resume_version: "SWE_EarlyCareer_v1.pdf",
    referral_note: "Alumni referral link attached",
    notes: "Application completed.",
    is_viewed: true,
    is_flagged: false
  }
];

const LOCAL_STORAGE_KEY = "seattle_job_tracker_soft_brutal_v1";

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Views State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [viewedFilter, setViewedFilter] = useState("All"); // All | Unviewed | Viewed
  const [flaggedOnlyFilter, setFlaggedOnlyFilter] = useState(false);
  const [sortBy, setSortBy] = useState("default"); // default | unviewed | newest
  const [viewMode, setViewMode] = useState("cards");

  // Modal / Drawer State
  const [activeDrawerJob, setActiveDrawerJob] = useState(null);
  const [drawerForm, setDrawerForm] = useState({
    resume_version: "",
    referral_note: "",
    notes: "",
    status: "Applied",
    is_viewed: false,
    is_flagged: false
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newJobForm, setNewJobForm] = useState({
    company: "Stripe",
    title: "",
    location: "Seattle, WA",
    url: "",
    role_category: "Software Engineer",
    is_flagged: false
  });

  // Undo Toast State
  const [deletedToast, setDeletedToast] = useState(null);

  // Pending Application Confirmation Modal State
  const [pendingApplyJob, setPendingApplyJob] = useState(null);

  // Helper to sort jobs on page load or manual refresh
  const sortJobsOnRefresh = (jobList) => {
    return [...jobList].sort((a, b) => {
      // 1. Unviewed jobs (false) come before Viewed jobs (true)
      if (Boolean(a.is_viewed) !== Boolean(b.is_viewed)) {
        return a.is_viewed ? 1 : -1;
      }
      // 2. Flagged jobs (true) come before unflagged jobs (false)
      if (Boolean(a.is_flagged) !== Boolean(b.is_flagged)) {
        return a.is_flagged ? -1 : 1;
      }
      // 3. Newest first
      return (b.first_seen_at || 0) - (a.first_seen_at || 0);
    });
  };

  // Fetch Live Jobs from DynamoDB API
  const fetchLiveDynamoDBJobs = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      if (data.live && Array.isArray(data.jobs)) {
        setIsLiveConnected(true);
        const normalizedLiveJobs = data.jobs.map((j) => ({
          ...j,
          first_seen_at:
            j.first_seen_at && j.first_seen_at < 10000000000
              ? j.first_seen_at * 1000
              : j.first_seen_at || Date.now(),
          ats: j.ats || "Live Scraper",
          status: (j.status || "New Drop").replace(/[^\w\s]/gi, "").trim(),
          role_level: "New Grad",
          is_viewed: j.is_viewed !== undefined ? Boolean(j.is_viewed) : (j.status && j.status !== "New Drop"),
          is_flagged: Boolean(j.is_flagged)
        }));
        const sortedJobs = sortJobsOnRefresh(normalizedLiveJobs);
        setJobs(sortedJobs);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sortedJobs));
      } else {
        loadLocalStorage();
      }
    } catch (e) {
      loadLocalStorage();
    } finally {
      setIsRefreshing(false);
      setIsLoaded(true);
    }
  };

  const loadLocalStorage = () => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const normalized = parsed.map((j) => ({
          ...j,
          is_viewed: j.is_viewed !== undefined ? Boolean(j.is_viewed) : (j.status && j.status !== "New Drop"),
          is_flagged: Boolean(j.is_flagged)
        }));
        const sortedJobs = sortJobsOnRefresh(normalized);
        setJobs(sortedJobs);
      } else {
        const sortedJobs = sortJobsOnRefresh(INITIAL_NEW_GRAD_JOBS);
        setJobs(sortedJobs);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sortedJobs));
      }
    } catch (e) {
      const sortedJobs = sortJobsOnRefresh(INITIAL_NEW_GRAD_JOBS);
      setJobs(sortedJobs);
    }
  };

  useEffect(() => {
    fetchLiveDynamoDBJobs();
  }, []);

  const saveJobsToStorage = async (updatedJobs, modifiedJob = null) => {
    setJobs(updatedJobs);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedJobs));
    } catch (e) {
      console.error("Failed to save to LocalStorage:", e);
    }

    if (modifiedJob) {
      try {
        await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(modifiedJob)
        });
      } catch (err) {
        console.warn("DynamoDB sync error:", err);
      }
    }
  };

  const handleDeleteJob = async (jobToDelete) => {
    if (deletedToast && deletedToast.intervalId) {
      clearInterval(deletedToast.intervalId);
    }

    const softDeletedJob = { ...jobToDelete, status: "Deleted" };
    const updatedJobs = jobs.map((j) => (j.job_id === jobToDelete.job_id ? softDeletedJob : j));
    saveJobsToStorage(updatedJobs, softDeletedJob);

    let secondsLeft = 5;
    const intervalId = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        clearInterval(intervalId);
        setDeletedToast(null);
      } else {
        setDeletedToast((prev) => (prev ? { ...prev, secondsLeft } : null));
      }
    }, 1000);

    setDeletedToast({
      job: jobToDelete,
      intervalId,
      secondsLeft: 5
    });
  };

  const handleUndoDelete = async () => {
    if (!deletedToast || !deletedToast.job) return;

    const jobToRestore = deletedToast.job;
    if (deletedToast.intervalId) {
      clearInterval(deletedToast.intervalId);
    }
    setDeletedToast(null);

    setJobs((prevJobs) => {
      const updated = [jobToRestore, ...prevJobs];
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save to LocalStorage:", e);
      }
      return updated;
    });

    try {
      await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobToRestore)
      });
    } catch (err) {
      console.warn("DynamoDB restore error:", err);
    }
  };

  // Calculated Analytics Metrics
  const metrics = useMemo(() => {
    const activeJobs = jobs.filter((j) => j.status !== "Deleted");
    const total = activeJobs.length;
    const newDrops = activeJobs.filter((j) => j.status === "New Drop").length;
    const applied = activeJobs.filter((j) => j.status === "Applied").length;
    const interviewing = activeJobs.filter((j) => j.status === "Interviewing").length;
    const offer = activeJobs.filter((j) => j.status === "Offer").length;
    const flagged = activeJobs.filter((j) => j.is_flagged).length;
    const unviewed = activeJobs.filter((j) => !j.is_viewed).length;

    const appliedJobsWithSpeed = activeJobs.filter(
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

    return { total, newDrops, applied, interviewing, offer, flagged, unviewed, avgMinutes };
  }, [jobs]);

  // Filtered Job List
  const filteredJobs = useMemo(() => {
    const list = jobs.filter((job) => {
      if (job.status === "Deleted") return false;

      const matchesSearch =
        searchQuery === "" ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || job.status === statusFilter;

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
            job.title.toLowerCase().includes("apm") ||
            job.title.toLowerCase().includes("pm")));

      const matchesCompany =
        companyFilter === "All" ||
        job.company.toLowerCase() === companyFilter.toLowerCase();

      const matchesViewed =
        viewedFilter === "All" ||
        (viewedFilter === "Unviewed" && !job.is_viewed) ||
        (viewedFilter === "Viewed" && job.is_viewed);

      const matchesFlagged = !flaggedOnlyFilter || job.is_flagged;

      return matchesSearch && matchesStatus && matchesRole && matchesCompany && matchesViewed && matchesFlagged;
    });

    return list.sort((a, b) => {
      if (sortBy === "unviewed") {
        if (Boolean(a.is_viewed) !== Boolean(b.is_viewed)) {
          return a.is_viewed ? 1 : -1;
        }
        if (Boolean(a.is_flagged) !== Boolean(b.is_flagged)) {
          return a.is_flagged ? -1 : 1;
        }
        return (b.first_seen_at || 0) - (a.first_seen_at || 0);
      }

      if (sortBy === "newest") {
        return (b.first_seen_at || 0) - (a.first_seen_at || 0);
      }

      // Default (Stable order): Flagged jobs top, then newest drops first.
      // Changing is_viewed state updates card styling without jumping card position!
      if (Boolean(a.is_flagged) !== Boolean(b.is_flagged)) {
        return a.is_flagged ? -1 : 1;
      }
      return (b.first_seen_at || 0) - (a.first_seen_at || 0);
    });
  }, [jobs, searchQuery, statusFilter, roleFilter, companyFilter, viewedFilter, flaggedOnlyFilter, sortBy]);

  // Job Action Handlers
  const handleApplyNow = (job) => {
    let updatedJob = job;
    if (!job.is_viewed) {
      updatedJob = { ...job, is_viewed: true };
      const updated = jobs.map((j) => (j.job_id === job.job_id ? updatedJob : j));
      saveJobsToStorage(updated, updatedJob);
    }

    if (job.url) {
      window.open(job.url, "_blank", "noopener,noreferrer");
    }
    setPendingApplyJob(updatedJob);
  };

  const handleToggleFlag = (job, e) => {
    if (e) e.stopPropagation();
    const modifiedTarget = { ...job, is_flagged: !job.is_flagged };
    const updated = jobs.map((j) => (j.job_id === job.job_id ? modifiedTarget : j));
    saveJobsToStorage(updated, modifiedTarget);
  };

  const handleToggleViewed = (job, e) => {
    if (e) e.stopPropagation();
    const modifiedTarget = { ...job, is_viewed: !job.is_viewed };
    const updated = jobs.map((j) => (j.job_id === job.job_id ? modifiedTarget : j));
    saveJobsToStorage(updated, modifiedTarget);
  };

  const handleConfirmApplied = (job) => {
    const now = Date.now();
    let modifiedTarget = null;
    const updated = jobs.map((j) => {
      if (j.job_id === job.job_id) {
        modifiedTarget = {
          ...j,
          status: "Applied",
          applied_at: j.applied_at || now,
          is_viewed: true,
          is_flagged: false
        };
        return modifiedTarget;
      }
      return j;
    });
    saveJobsToStorage(updated, modifiedTarget);
    setPendingApplyJob(null);
  };

  const handleCancelApplied = () => {
    setPendingApplyJob(null);
  };

  const handleUpdateStatus = (jobId, newStatus) => {
    const now = Date.now();
    let modifiedTarget = null;
    const updated = jobs.map((j) => {
      if (j.job_id === jobId) {
        const isApplied = newStatus === "Applied";
        modifiedTarget = {
          ...j,
          status: newStatus,
          applied_at: isApplied && !j.applied_at ? now : j.applied_at,
          is_viewed: isApplied ? true : j.is_viewed,
          is_flagged: isApplied ? false : j.is_flagged
        };
        return modifiedTarget;
      }
      return j;
    });
    saveJobsToStorage(updated, modifiedTarget);
  };

  const handleOpenDrawer = (job) => {
    // Opening drawer also auto-marks job as viewed if not already
    let currentJob = job;
    if (!job.is_viewed) {
      currentJob = { ...job, is_viewed: true };
      const updated = jobs.map((j) => (j.job_id === job.job_id ? currentJob : j));
      saveJobsToStorage(updated, currentJob);
    }

    setActiveDrawerJob(currentJob);
    setDrawerForm({
      resume_version: currentJob.resume_version || "",
      referral_note: currentJob.referral_note || "",
      notes: currentJob.notes || "",
      status: currentJob.status,
      is_viewed: currentJob.is_viewed,
      is_flagged: currentJob.is_flagged
    });
  };

  const handleSaveDrawerNotes = (e) => {
    e.preventDefault();
    if (!activeDrawerJob) return;

    let modifiedTarget = null;
    const updated = jobs.map((j) => {
      if (j.job_id === activeDrawerJob.job_id) {
        const isApplied = drawerForm.status === "Applied";
        modifiedTarget = {
          ...j,
          resume_version: drawerForm.resume_version,
          referral_note: drawerForm.referral_note,
          notes: drawerForm.notes,
          status: drawerForm.status,
          is_viewed: isApplied ? true : drawerForm.is_viewed,
          is_flagged: isApplied ? false : drawerForm.is_flagged,
          applied_at:
            isApplied && !j.applied_at
              ? Date.now()
              : j.applied_at
        };
        return modifiedTarget;
      }
      return j;
    });

    saveJobsToStorage(updated, modifiedTarget);
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
      role_level: "New Grad",
      resume_version: "",
      referral_note: "",
      notes: "",
      is_viewed: false,
      is_flagged: newJobForm.is_flagged
    };

    saveJobsToStorage([createdJob, ...jobs], createdJob);
    setIsAddModalOpen(false);
    setNewJobForm({
      company: "Stripe",
      title: "",
      location: "Seattle, WA",
      url: "",
      role_category: "Software Engineer",
      is_flagged: false
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
          alert("Invalid JSON file format.");
        }
      };
    }
  };

  const handleResetData = () => {
    if (confirm("Reset to default dataset?")) {
      saveJobsToStorage(INITIAL_NEW_GRAD_JOBS);
    }
  };

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
      <div className="flex h-screen w-full items-center justify-center bg-[#faf8f5] text-[#1e293b]">
        <div className="flex items-center gap-3 p-5 bg-white border-2 border-[#1e293b] shadow-[3px_3px_0px_0px_#1e293b] rounded-md">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1e293b] border-t-transparent"></div>
          <span className="font-display font-bold text-base text-[#1e293b]">Loading Soft-Brutal Monitor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#1e293b] flex flex-col font-sans antialiased">
      
      {/* Soft Pastel Header */}
      <header className="bg-white border-b-2 border-[#1e293b] sticky top-0 z-30 px-6 lg:px-10 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-3.5 w-3.5 bg-[#4ade80] border-2 border-[#1e293b] rounded-sm" />
            <h1 className="font-display font-bold text-lg tracking-tight text-[#1e293b] flex items-center gap-3">
              <span>Seattle Career Monitor</span>
              <span className="text-xs font-mono font-bold bg-[#dcfce7] text-[#1e293b] border-2 border-[#1e293b] px-2.5 py-0.5 shadow-[1.5px_1.5px_0px_0px_#1e293b] rounded-md">
                New Grad & Early Career
              </span>
            </h1>
          </div>
          <div className="hidden lg:flex items-center gap-2 text-xs font-mono font-bold text-[#475569] border-l-2 border-[#1e293b] pl-4">
            <Clock className="w-3.5 h-3.5 text-[#1e293b]" />
            <span>Radar: 5m Intervals (8AM-10PM PST)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden md:flex items-center gap-1.5 text-xs font-mono font-bold bg-white text-[#1e293b] border-2 border-[#1e293b] px-2.5 py-1 rounded-md shadow-[1.5px_1.5px_0px_0px_#1e293b]">
            <Database className="w-3.5 h-3.5" />
            {isLiveConnected ? "AWS DynamoDB Live" : "Local Storage"}
          </span>

          <button
            onClick={fetchLiveDynamoDBJobs}
            disabled={isRefreshing}
            title="Sync with AWS DynamoDB"
            className="soft-brutal-btn bg-white text-[#1e293b] px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync AWS</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="soft-brutal-btn bg-[#dcfce7] text-[#1e293b] px-3.5 py-1.5 rounded-md text-xs flex items-center gap-1.5 font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Position</span>
          </button>

          <button
            onClick={handleExportData}
            title="Export JSON"
            className="soft-brutal-btn bg-white text-[#1e293b] px-2.5 py-1.5 rounded-md text-xs"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <label
            title="Import JSON"
            className="soft-brutal-btn bg-white text-[#1e293b] px-2.5 py-1.5 rounded-md text-xs cursor-pointer flex items-center"
          >
            <Upload className="w-3.5 h-3.5" />
            <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
          </label>

          <button
            onClick={handleResetData}
            title="Reset data"
            className="soft-brutal-btn bg-white text-[#64748b] p-1.5 rounded-md text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-10 py-8 space-y-7">
        
        {/* Analytics Cards Grid (Including Flagged & Unviewed) */}
        <section className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
          <div className="bg-[#fef9c3] border-2 border-[#1e293b] p-4 rounded-md shadow-[2.5px_2.5px_0px_0px_#1e293b] flex flex-col justify-between">
            <span className="font-display font-bold text-xs uppercase tracking-wider text-[#1e293b]">New Drops</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="mono-font text-3xl font-bold text-[#1e293b]">{metrics.newDrops}</span>
              <span className="font-mono text-[11px] font-bold bg-white text-[#1e293b] border-2 border-[#1e293b] px-1.5 py-0.5 rounded">Actionable</span>
            </div>
          </div>

          {/* Special Flagged (Apply Soon) Metric Card */}
          <div
            onClick={() => setFlaggedOnlyFilter((prev) => !prev)}
            className={`border-2 border-[#1e293b] p-4 rounded-md shadow-[2.5px_2.5px_0px_0px_#1e293b] flex flex-col justify-between cursor-pointer transition ${
              flaggedOnlyFilter ? "bg-[#fef3c7] ring-2 ring-[#f59e0b]" : "bg-[#fffbe6] hover:bg-[#fef3c7]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-xs uppercase tracking-wider text-[#92400e] flex items-center gap-1">
                <Flag className="w-3.5 h-3.5 fill-[#f59e0b] text-[#d97706]" />
                <span>Apply Soon</span>
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="mono-font text-3xl font-bold text-[#78350f]">{metrics.flagged}</span>
              <span className="font-mono text-[10px] font-bold bg-[#fef3c7] text-[#92400e] border border-[#f59e0b] px-1.5 py-0.5 rounded">
                {flaggedOnlyFilter ? "Active Filter" : "Flagged"}
              </span>
            </div>
          </div>

          {/* Unviewed Metric Card */}
          <div
            onClick={() => setViewedFilter((prev) => (prev === "Unviewed" ? "All" : "Unviewed"))}
            className={`border-2 border-[#1e293b] p-4 rounded-md shadow-[2.5px_2.5px_0px_0px_#1e293b] flex flex-col justify-between cursor-pointer transition ${
              viewedFilter === "Unviewed" ? "bg-[#e0f2fe] ring-2 ring-[#0284c7]" : "bg-[#f0f9ff] hover:bg-[#e0f2fe]"
            }`}
          >
            <span className="font-display font-bold text-xs uppercase tracking-wider text-[#0369a1] flex items-center gap-1">
              <EyeOff className="w-3.5 h-3.5 text-[#0284c7]" />
              <span>Unviewed</span>
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="mono-font text-3xl font-bold text-[#0c4a6e]">{metrics.unviewed}</span>
              <span className="font-mono text-[10px] font-bold bg-[#e0f2fe] text-[#0369a1] border border-[#0284c7] px-1.5 py-0.5 rounded">
                {viewedFilter === "Unviewed" ? "Filter Active" : "Unread"}
              </span>
            </div>
          </div>

          <div className="bg-[#dcfce7] border-2 border-[#1e293b] p-4 rounded-md shadow-[2.5px_2.5px_0px_0px_#1e293b] flex flex-col justify-between">
            <span className="font-display font-bold text-xs uppercase tracking-wider text-[#1e293b]">Applied</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="mono-font text-3xl font-bold text-[#1e293b]">{metrics.applied}</span>
              <span className="font-mono text-[11px] font-bold bg-white text-[#1e293b] border-2 border-[#1e293b] px-1.5 py-0.5 rounded">Submitted</span>
            </div>
          </div>

          <div className="bg-[#e2e8f0] border-2 border-[#1e293b] p-4 rounded-md shadow-[2.5px_2.5px_0px_0px_#1e293b] flex flex-col justify-between">
            <span className="font-display font-bold text-xs uppercase tracking-wider text-[#1e293b]">Interviewing</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="mono-font text-3xl font-bold text-[#1e293b]">{metrics.interviewing}</span>
              <span className="font-mono text-[11px] font-bold bg-white text-[#1e293b] border-2 border-[#1e293b] px-1.5 py-0.5 rounded">Pipeline</span>
            </div>
          </div>

          <div className="bg-white border-2 border-[#1e293b] p-4 rounded-md shadow-[2.5px_2.5px_0px_0px_#1e293b] flex flex-col justify-between">
            <span className="font-display font-bold text-xs uppercase tracking-wider text-[#1e293b]">Tracked Roles</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="mono-font text-3xl font-bold text-[#1e293b]">{metrics.total}</span>
              <span className="font-mono text-[11px] font-bold bg-[#faf8f5] text-[#64748b] border border-[#1e293b] px-1.5 py-0.5 rounded">Seattle</span>
            </div>
          </div>
        </section>

        {/* Filter Controls Bar */}
        <section className="bg-white border-2 border-[#1e293b] p-4 rounded-md shadow-[3px_3px_0px_0px_#1e293b] space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748b]" />
              <input
                type="text"
                placeholder="Search position title, company, or location (e.g. Seattle, SDE I, Stripe)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#faf8f5] border-2 border-[#1e293b] focus:bg-white focus:outline-none font-sans text-xs text-[#1e293b] font-medium pl-10 pr-4 py-2 rounded-md shadow-[1.5px_1.5px_0px_0px_#1e293b]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#1e293b]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold">
              
              {/* Flagged Only Quick Filter Button */}
              <button
                onClick={() => setFlaggedOnlyFilter((prev) => !prev)}
                className={`soft-brutal-btn flex items-center gap-1.5 px-3 py-1.5 rounded-md border-2 border-[#1e293b] shadow-[1.5px_1.5px_0px_0px_#1e293b] font-bold ${
                  flaggedOnlyFilter
                    ? "bg-[#f59e0b] text-white"
                    : "bg-[#fffbe6] text-[#78350f] hover:bg-[#fef3c7]"
                }`}
                title="Filter jobs flagged to apply for soon"
              >
                <Flag className={`w-3.5 h-3.5 ${flaggedOnlyFilter ? "fill-white text-white" : "fill-[#f59e0b] text-[#d97706]"}`} />
                <span>🚩 Apply Soon ({metrics.flagged})</span>
              </button>

              {/* Viewed Status Filter */}
              <div className="flex items-center gap-1.5 bg-[#e0f2fe] border-2 border-[#1e293b] px-2.5 py-1.5 rounded-md shadow-[1.5px_1.5px_0px_0px_#1e293b]">
                <Eye className="w-3.5 h-3.5 text-[#0284c7]" />
                <select
                  value={viewedFilter}
                  onChange={(e) => setViewedFilter(e.target.value)}
                  className="bg-transparent text-[#1e293b] focus:outline-none font-bold cursor-pointer"
                >
                  <option value="All">All View States</option>
                  <option value="Unviewed">Unviewed Only ({metrics.unviewed})</option>
                  <option value="Viewed">Viewed Only</option>
                </select>
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-1.5 bg-[#f1f5f9] border-2 border-[#1e293b] px-2.5 py-1.5 rounded-md shadow-[1.5px_1.5px_0px_0px_#1e293b]">
                <span className="text-[#1e293b]">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-[#1e293b] focus:outline-none font-bold cursor-pointer"
                >
                  <option value="default">Default (Stable)</option>
                  <option value="unviewed">Unviewed First</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-[#fef9c3] border-2 border-[#1e293b] px-2.5 py-1.5 rounded-md shadow-[1.5px_1.5px_0px_0px_#1e293b]">
                <span className="text-[#1e293b]">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-[#1e293b] focus:outline-none font-bold cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="New Drop">New Drop</option>
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-1.5 bg-[#dcfce7] border-2 border-[#1e293b] px-2.5 py-1.5 rounded-md shadow-[1.5px_1.5px_0px_0px_#1e293b]">
                <span className="text-[#1e293b]">Role:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-transparent text-[#1e293b] focus:outline-none font-bold cursor-pointer"
                >
                  <option value="All">All Roles</option>
                  <option value="Software Engineer">SWE / SDE I</option>
                  <option value="Product Manager">APM / Product</option>
                </select>
              </div>

              {/* Company Filter */}
              <div className="flex items-center gap-1.5 bg-[#e2e8f0] border-2 border-[#1e293b] px-2.5 py-1.5 rounded-md shadow-[1.5px_1.5px_0px_0px_#1e293b]">
                <span className="text-[#1e293b]">Company:</span>
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="bg-transparent text-[#1e293b] focus:outline-none font-bold cursor-pointer max-w-[120px] truncate"
                >
                  <option value="All">All Hubs</option>
                  {TARGET_COMPANIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Switcher */}
              <div className="flex items-center bg-white border-2 border-[#1e293b] p-0.5 rounded-md shadow-[1.5px_1.5px_0px_0px_#1e293b]">
                <button
                  onClick={() => setViewMode("cards")}
                  className={`p-1.5 font-bold transition rounded-xs ${
                    viewMode === "cards"
                      ? "bg-[#1e293b] text-white"
                      : "text-[#1e293b] hover:bg-[#e2e8f0]"
                  }`}
                  title="Card View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 font-bold transition rounded-xs ${
                    viewMode === "table"
                      ? "bg-[#1e293b] text-white"
                      : "text-[#1e293b] hover:bg-[#e2e8f0]"
                  }`}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* Job Listings View */}
        {filteredJobs.length === 0 ? (
          <div className="bg-white border-2 border-[#1e293b] p-10 text-center rounded-md shadow-[3px_3px_0px_0px_#1e293b] space-y-3">
            <Briefcase className="w-8 h-8 mx-auto text-[#1e293b]" />
            <h3 className="font-display font-bold text-base text-[#1e293b]">No matching position records found</h3>
            <p className="font-sans text-xs text-[#64748b] max-w-sm mx-auto">
              Adjust your search keywords, flag filter, or view state options.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("All");
                setRoleFilter("All");
                setCompanyFilter("All");
                setViewedFilter("All");
                setFlaggedOnlyFilter(false);
              }}
              className="soft-brutal-btn bg-[#dcfce7] text-[#1e293b] px-3.5 py-1.5 text-xs rounded-md inline-block font-bold"
            >
              Reset filters
            </button>
          </div>
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {filteredJobs.map((job) => {
              const isUnviewed = !job.is_viewed;
              const isFlagged = job.is_flagged;

              return (
                <div
                  key={job.job_id}
                  className={`soft-brutal-card p-4.5 rounded-md flex flex-col justify-between relative group transition-all duration-150 ${
                    isFlagged
                      ? "bg-[#fffdf5] border-2 border-[#f59e0b] shadow-[3.5px_3.5px_0px_0px_#f59e0b]"
                      : isUnviewed
                      ? "bg-white border-2 border-[#1e293b] shadow-[3.5px_3.5px_0px_0px_#1e293b]"
                      : "bg-[#faf8f5]/90 border-2 border-[#64748b]/60 shadow-[2px_2px_0px_0px_#64748b]"
                  }`}
                >
                  <div>
                    {/* Special Flag Ribbon Banner if flagged */}
                    {isFlagged && (
                      <div className="mb-2.5 -mx-4.5 -mt-4.5 bg-[#fef3c7] border-b-2 border-[#f59e0b] px-4.5 py-1 flex items-center justify-between font-mono text-[10px] font-bold text-[#92400e] rounded-t-sm">
                        <span className="flex items-center gap-1.5">
                          <Flag className="w-3 h-3 fill-[#f59e0b] text-[#d97706]" />
                          <span>FLAGGED TO APPLY SOON</span>
                        </span>
                        <button
                          onClick={(e) => handleToggleFlag(job, e)}
                          className="hover:underline text-[#b45309]"
                          title="Remove Flag"
                        >
                          Unflag
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-white bg-[#1e293b] px-2.5 py-0.5 rounded-sm shadow-[1.5px_1.5px_0px_0px_#1e293b]">
                          {job.company}
                        </span>

                        {/* Viewed / Unviewed Interactive Badge */}
                        <button
                          onClick={(e) => handleToggleViewed(job, e)}
                          title={isUnviewed ? "Mark as Viewed" : "Mark as Unviewed"}
                          className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-sm border flex items-center gap-1 transition cursor-pointer ${
                            isUnviewed
                              ? "bg-[#e0f2fe] text-[#0369a1] border-[#0284c7] hover:bg-[#bae6fd]"
                              : "bg-[#f1f5f9] text-[#64748b] border-[#cbd5e1] hover:bg-[#e2e8f0]"
                          }`}
                        >
                          {isUnviewed ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-[#0284c7] animate-pulse"></span>
                              <span>Unviewed</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3 text-[#64748b]" />
                              <span>Viewed</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Flag Toggle Button */}
                        <button
                          onClick={(e) => handleToggleFlag(job, e)}
                          title={isFlagged ? "Unflag Job" : "Flag to Apply Soon"}
                          className={`p-1 rounded-sm border transition ${
                            isFlagged
                              ? "bg-[#fef3c7] border-[#f59e0b] text-[#d97706] shadow-[1px_1px_0px_0px_#f59e0b]"
                              : "bg-white border-[#cbd5e1] text-[#94a3b8] hover:text-[#f59e0b] hover:border-[#f59e0b]"
                          }`}
                        >
                          <Flag className={`w-3.5 h-3.5 ${isFlagged ? "fill-[#f59e0b]" : ""}`} />
                        </button>

                        <button
                          onClick={() => handleDeleteJob(job)}
                          title="Delete position"
                          className="text-[#64748b] hover:text-[#ef4444] hover:bg-[#fee2e2] p-1 rounded-sm transition border border-transparent hover:border-[#1e293b]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Status Select Pill */}
                        <select
                          value={job.status}
                          onChange={(e) => handleUpdateStatus(job.job_id, e.target.value)}
                          className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-sm border-2 border-[#1e293b] cursor-pointer focus:outline-none shadow-[1.5px_1.5px_0px_0px_#1e293b] ${
                            job.status === "New Drop"
                              ? "bg-[#fef9c3] text-[#1e293b]"
                              : job.status === "Applied"
                              ? "bg-[#dcfce7] text-[#1e293b]"
                              : job.status === "Interviewing"
                              ? "bg-[#e2e8f0] text-[#1e293b]"
                              : job.status === "Offer"
                              ? "bg-[#bbf7d0] text-[#1e293b]"
                              : "bg-[#f1f5f9] text-[#64748b]"
                          }`}
                        >
                          <option value="New Drop">New Drop</option>
                          <option value="Applied">Applied</option>
                          <option value="Interviewing">Interviewing</option>
                          <option value="Offer">Offer</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>
                    </div>

                    {/* Position Title */}
                    <h3 className={`font-display font-bold text-base leading-snug tracking-tight ${
                      isUnviewed ? "text-[#1e293b]" : "text-[#475569]"
                    }`}>
                      {job.title}
                    </h3>

                    {/* Metadata */}
                    <div className="mt-3.5 flex items-center justify-between text-xs font-mono font-bold text-[#475569]">
                      <div className="flex items-center gap-1.5 bg-[#faf8f5] border border-[#1e293b] px-2 py-0.5 rounded-sm">
                        <MapPin className="w-3.5 h-3.5 text-[#1e293b]" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white border border-[#1e293b] px-2 py-0.5 rounded-sm">
                        <Clock className="w-3.5 h-3.5 text-[#1e293b]" />
                        <span>{formatTimeAgo(job.first_seen_at)}</span>
                      </div>
                    </div>

                    {/* Logged Notes */}
                    {(job.resume_version || job.notes || job.referral_note) && (
                      <div className="mt-3.5 pt-3 border-t-2 border-[#1e293b] space-y-1 text-xs font-mono bg-[#faf8f5] p-2.5 border border-[#1e293b] rounded-sm">
                        {job.resume_version && (
                          <div className="flex items-center gap-1.5 truncate font-bold text-[#1e293b]">
                            <FileText className="w-3.5 h-3.5 text-[#1e293b] flex-shrink-0" />
                            <span className="truncate">
                              {job.resume_version}
                            </span>
                          </div>
                        )}
                        {job.referral_note && (
                          <p className="text-[11px] text-[#475569] truncate italic font-medium">
                            Ref: {job.referral_note}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="mt-4.5 pt-3 border-t-2 border-[#1e293b] flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenDrawer(job)}
                      className="font-mono text-xs font-bold text-[#1e293b] hover:bg-[#e2e8f0] flex items-center gap-1 py-1 px-2.5 border border-[#1e293b] rounded-sm transition"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#1e293b]" />
                      <span>Notes</span>
                    </button>

                    {job.status !== "Applied" ? (
                      <button
                        onClick={() => handleApplyNow(job)}
                        className="soft-brutal-btn flex items-center gap-1.5 text-xs px-3.5 py-1.5 font-bold rounded-md bg-[#dcfce7] text-[#1e293b]"
                      >
                        <span>Apply Now</span>
                        <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    ) : (
                      <span className="text-[11px] font-mono font-bold text-[#64748b] bg-[#faf8f5] px-2 py-1 rounded border border-[#e2e8f0]">
                        Applied ✓
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white border-2 border-[#1e293b] shadow-[3px_3px_0px_0px_#1e293b] rounded-md overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-[#1e293b] font-display font-bold text-[#1e293b] bg-[#fef9c3]">
                  <th className="p-3 border-r border-[#1e293b] w-10 text-center">🚩</th>
                  <th className="p-3.5 border-r border-[#1e293b]">Company</th>
                  <th className="p-3.5 border-r border-[#1e293b]">Position Title</th>
                  <th className="p-3.5 border-r border-[#1e293b]">Location</th>
                  <th className="p-3.5 border-r border-[#1e293b]">Viewed</th>
                  <th className="p-3.5 border-r border-[#1e293b]">Detected</th>
                  <th className="p-3.5 border-r border-[#1e293b]">Status</th>
                  <th className="p-3.5 border-r border-[#1e293b]">Logged Resume</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y border-[#1e293b] font-mono text-xs">
                {filteredJobs.map((job) => (
                  <tr key={job.job_id} className={`hover:bg-[#faf8f5] transition ${job.is_flagged ? "bg-[#fffdf5]" : ""}`}>
                    <td className="p-3 text-center border-r border-[#1e293b]">
                      <button
                        onClick={(e) => handleToggleFlag(job, e)}
                        title={job.is_flagged ? "Unflag" : "Flag to Apply Soon"}
                        className="p-1"
                      >
                        <Flag className={`w-3.5 h-3.5 ${job.is_flagged ? "fill-[#f59e0b] text-[#d97706]" : "text-[#94a3b8]"}`} />
                      </button>
                    </td>
                    <td className="p-3.5 font-bold text-[#1e293b] whitespace-nowrap border-r border-[#1e293b]">
                      {job.company}
                    </td>
                    <td className="p-3.5 text-[#1e293b] max-w-xs truncate border-r border-[#1e293b] font-sans font-medium">
                      {job.title}
                    </td>
                    <td className="p-3.5 text-[#475569] whitespace-nowrap border-r border-[#1e293b]">
                      {job.location}
                    </td>
                    <td className="p-3.5 whitespace-nowrap border-r border-[#1e293b]">
                      <button
                        onClick={(e) => handleToggleViewed(job, e)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border cursor-pointer ${
                          !job.is_viewed
                            ? "bg-[#e0f2fe] text-[#0369a1] border-[#0284c7]"
                            : "bg-[#f1f5f9] text-[#64748b] border-[#cbd5e1]"
                        }`}
                      >
                        {!job.is_viewed ? "Unviewed" : "Viewed ✓"}
                      </button>
                    </td>
                    <td className="p-3.5 text-[#475569] whitespace-nowrap border-r border-[#1e293b]">
                      {formatTimeAgo(job.first_seen_at)}
                    </td>
                    <td className="p-3.5 whitespace-nowrap border-r border-[#1e293b]">
                      <select
                        value={job.status}
                        onChange={(e) => handleUpdateStatus(job.job_id, e.target.value)}
                        className={`text-[11px] font-bold px-2 py-0.5 border border-[#1e293b] cursor-pointer focus:outline-none rounded-sm ${
                          job.status === "New Drop"
                            ? "bg-[#fef9c3] text-[#1e293b]"
                            : job.status === "Applied"
                            ? "bg-[#dcfce7] text-[#1e293b]"
                            : job.status === "Interviewing"
                            ? "bg-[#e2e8f0] text-[#1e293b]"
                            : job.status === "Offer"
                            ? "bg-[#bbf7d0] text-[#1e293b]"
                            : "bg-[#f1f5f9] text-[#64748b]"
                        }`}
                      >
                        <option value="New Drop">New Drop</option>
                        <option value="Applied">Applied</option>
                        <option value="Interviewing">Interviewing</option>
                        <option value="Offer">Offer</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="p-3.5 text-[#475569] max-w-[150px] truncate border-r border-[#1e293b]">
                      {job.resume_version || "-"}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                      <button
                        onClick={() => handleOpenDrawer(job)}
                        className="soft-brutal-btn bg-white text-[#1e293b] p-1 text-xs inline-block rounded-sm"
                        title="Edit Notes"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job)}
                        className="soft-brutal-btn bg-white text-[#ef4444] hover:bg-[#fee2e2] p-1 text-xs inline-block rounded-sm"
                        title="Delete position"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {job.status !== "Applied" ? (
                        <button
                          onClick={() => handleApplyNow(job)}
                          className="soft-brutal-btn px-3 py-1 text-xs inline-flex items-center gap-1 font-bold rounded-sm bg-[#dcfce7] text-[#1e293b]"
                        >
                          <span>Apply</span>
                          <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono font-bold text-[#64748b] bg-[#faf8f5] px-2 py-0.5 rounded border border-[#e2e8f0]">
                          Applied ✓
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Drawer Form Modal */}
      {activeDrawerJob && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#1e293b]/30 backdrop-blur-2xs">
          <div className="bg-white border-l-2 border-[#1e293b] w-full max-w-md h-full flex flex-col justify-between p-6 overflow-y-auto shadow-[6px_0px_0px_0px_#1e293b] animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-start justify-between gap-4 pb-4 border-b-2 border-[#1e293b]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-white bg-[#1e293b] px-2.5 py-0.5 rounded-sm">
                      {activeDrawerJob.company}
                    </span>
                    {activeDrawerJob.is_flagged && (
                      <span className="font-mono text-[10px] font-bold bg-[#fef3c7] text-[#92400e] border border-[#f59e0b] px-2 py-0.5 rounded-sm flex items-center gap-1">
                        <Flag className="w-3 h-3 fill-[#f59e0b]" /> Apply Soon
                      </span>
                    )}
                  </div>
                  <h2 className="font-display font-bold text-lg text-[#1e293b] mt-2 leading-snug">
                    {activeDrawerJob.title}
                  </h2>
                  <p className="font-mono text-xs text-[#475569] mt-1">{activeDrawerJob.location}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteJob(activeDrawerJob);
                      setActiveDrawerJob(null);
                    }}
                    title="Delete position"
                    className="soft-brutal-btn bg-[#fee2e2] text-[#ef4444] hover:bg-[#fca5a5] p-1 text-xs font-mono font-bold rounded-sm flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveDrawerJob(null)}
                    className="soft-brutal-btn bg-white text-[#1e293b] p-1 rounded-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveDrawerNotes} className="mt-6 space-y-4 font-mono text-xs font-bold">
                
                {/* Toggles for Flagged & Viewed */}
                <div className="grid grid-cols-2 gap-2 bg-[#faf8f5] p-3 border-2 border-[#1e293b] rounded-md shadow-[1.5px_1.5px_0px_0px_#1e293b]">
                  <div>
                    <label className="block text-[#1e293b] mb-1">Flagged Status</label>
                    <button
                      type="button"
                      onClick={() => setDrawerForm((prev) => ({ ...prev, is_flagged: !prev.is_flagged }))}
                      className={`w-full py-1.5 px-2 rounded border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        drawerForm.is_flagged
                          ? "bg-[#fef3c7] text-[#92400e] border-[#f59e0b]"
                          : "bg-white text-[#64748b] border-[#cbd5e1]"
                      }`}
                    >
                      <Flag className={`w-3.5 h-3.5 ${drawerForm.is_flagged ? "fill-[#f59e0b] text-[#d97706]" : ""}`} />
                      <span>{drawerForm.is_flagged ? "Flagged (Soon)" : "Not Flagged"}</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-[#1e293b] mb-1">Viewed State</label>
                    <button
                      type="button"
                      onClick={() => setDrawerForm((prev) => ({ ...prev, is_viewed: !prev.is_viewed }))}
                      className={`w-full py-1.5 px-2 rounded border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        !drawerForm.is_viewed
                          ? "bg-[#e0f2fe] text-[#0369a1] border-[#0284c7]"
                          : "bg-white text-[#64748b] border-[#cbd5e1]"
                      }`}
                    >
                      {!drawerForm.is_viewed ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-[#0284c7]"></span>
                          <span>Unviewed</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#64748b]" />
                          <span>Viewed</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[#1e293b] mb-1.5">
                    Pipeline Status
                  </label>
                  <select
                    value={drawerForm.status}
                    onChange={(e) => setDrawerForm({ ...drawerForm, status: e.target.value })}
                    className="w-full bg-[#faf8f5] border-2 border-[#1e293b] text-[#1e293b] p-2.5 focus:outline-none rounded-md shadow-[1.5px_1.5px_0px_0px_#1e293b]"
                  >
                    <option value="New Drop">New Drop</option>
                    <option value="Applied">Applied</option>
                    <option value="Interviewing">Interviewing</option>
                    <option value="Offer">Offer</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#1e293b] mb-1.5">
                    Resume Variant Submitted
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SWE_NewGrad_v3_Stripe.pdf"
                    value={drawerForm.resume_version}
                    onChange={(e) => setDrawerForm({ ...drawerForm, resume_version: e.target.value })}
                    className="w-full bg-[#faf8f5] border-2 border-[#1e293b] text-[#1e293b] p-2.5 focus:outline-none rounded-md shadow-[1.5px_1.5px_0px_0px_#1e293b]"
                  />
                </div>

                <div>
                  <label className="block text-[#1e293b] mb-1.5">
                    Referral / Recruiter Contact
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Referred by University Alumni / Technical Recruiter"
                    value={drawerForm.referral_note}
                    onChange={(e) => setDrawerForm({ ...drawerForm, referral_note: e.target.value })}
                    className="w-full bg-[#faf8f5] border-2 border-[#1e293b] text-[#1e293b] p-2.5 focus:outline-none rounded-md shadow-[1.5px_1.5px_0px_0px_#1e293b]"
                  />
                </div>

                <div>
                  <label className="block text-[#1e293b] mb-1.5">
                    Application & Interview Notes
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Notes on OA assessment completion, screen dates, topics..."
                    value={drawerForm.notes}
                    onChange={(e) => setDrawerForm({ ...drawerForm, notes: e.target.value })}
                    className="w-full bg-[#faf8f5] border-2 border-[#1e293b] text-[#1e293b] p-2.5 focus:outline-none resize-none rounded-md shadow-[1.5px_1.5px_0px_0px_#1e293b]"
                  />
                </div>

                <div className="pt-4 flex items-center gap-3">
                  <button
                    type="submit"
                    className="soft-brutal-btn flex-1 bg-[#dcfce7] text-[#1e293b] py-2.5 text-xs font-bold rounded-md"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDrawerJob(null)}
                    className="soft-brutal-btn bg-white text-[#1e293b] px-4 py-2.5 text-xs font-bold rounded-md"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>

            <div className="pt-6 border-t-2 border-[#1e293b] text-xs font-mono font-bold">
              <button
                type="button"
                onClick={() => handleApplyNow(activeDrawerJob)}
                className="soft-brutal-btn w-full flex items-center justify-between bg-[#dcfce7] text-[#1e293b] p-2.5 rounded-md"
              >
                <span>Direct Application Link</span>
                <ExternalLink className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Position Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e293b]/30 backdrop-blur-2xs">
          <div className="bg-white border-2 border-[#1e293b] w-full max-w-md p-6 space-y-4 rounded-md shadow-[5px_5px_0px_0px_#1e293b] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#1e293b]">
              <h3 className="font-display font-bold text-base text-[#1e293b]">Add New Position</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="soft-brutal-btn bg-white text-[#1e293b] p-1 rounded-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddManualJob} className="space-y-3 font-mono text-xs font-bold">
              <div>
                <label className="block text-[#1e293b] mb-1">Company</label>
                <select
                  value={newJobForm.company}
                  onChange={(e) => setNewJobForm({ ...newJobForm, company: e.target.value })}
                  className="w-full bg-[#faf8f5] border-2 border-[#1e293b] text-[#1e293b] p-2 rounded-md focus:outline-none shadow-[1.5px_1.5px_0px_0px_#1e293b]"
                >
                  {TARGET_COMPANIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#1e293b] mb-1">Position Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Software Engineer - New Grad 2026"
                  value={newJobForm.title}
                  onChange={(e) => setNewJobForm({ ...newJobForm, title: e.target.value })}
                  className="w-full bg-[#faf8f5] border-2 border-[#1e293b] text-[#1e293b] p-2 rounded-md focus:outline-none shadow-[1.5px_1.5px_0px_0px_#1e293b]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#1e293b] mb-1">Location</label>
                  <input
                    type="text"
                    value={newJobForm.location}
                    onChange={(e) => setNewJobForm({ ...newJobForm, location: e.target.value })}
                    className="w-full bg-[#faf8f5] border-2 border-[#1e293b] text-[#1e293b] p-2 rounded-md focus:outline-none shadow-[1.5px_1.5px_0px_0px_#1e293b]"
                  />
                </div>
                <div>
                  <label className="block text-[#1e293b] mb-1">Role Category</label>
                  <select
                    value={newJobForm.role_category}
                    onChange={(e) => setNewJobForm({ ...newJobForm, role_category: e.target.value })}
                    className="w-full bg-[#faf8f5] border-2 border-[#1e293b] text-[#1e293b] p-2 rounded-md focus:outline-none shadow-[1.5px_1.5px_0px_0px_#1e293b]"
                  >
                    <option value="Software Engineer">Software Engineer</option>
                    <option value="Product Manager">Product Manager</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#1e293b] mb-1">Application URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={newJobForm.url}
                  onChange={(e) => setNewJobForm({ ...newJobForm, url: e.target.value })}
                  className="w-full bg-[#faf8f5] border-2 border-[#1e293b] text-[#1e293b] p-2 rounded-md focus:outline-none shadow-[1.5px_1.5px_0px_0px_#1e293b]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modal_is_flagged"
                  checked={newJobForm.is_flagged}
                  onChange={(e) => setNewJobForm({ ...newJobForm, is_flagged: e.target.checked })}
                  className="w-4 h-4 rounded border-2 border-[#1e293b]"
                />
                <label htmlFor="modal_is_flagged" className="text-xs text-[#1e293b] cursor-pointer">
                  🚩 Flag to Apply Soon
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="soft-brutal-btn bg-white text-[#1e293b] px-3.5 py-1.5 text-xs rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="soft-brutal-btn bg-[#dcfce7] text-[#1e293b] px-3.5 py-1.5 text-xs rounded-md"
                >
                  Add Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5-Second Undo Delete Toast */}
      {deletedToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#1e293b] text-white p-3.5 rounded-md shadow-[4px_4px_0px_0px_#000000] border-2 border-[#1e293b] animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex flex-col">
            <span className="text-xs font-bold font-mono text-[#fef9c3]">
              Job Position Deleted
            </span>
            <span className="text-xs font-mono text-slate-300 max-w-[220px] truncate">
              {deletedToast.job?.company} - {deletedToast.job?.title}
            </span>
          </div>
          <button
            onClick={handleUndoDelete}
            className="soft-brutal-btn bg-[#dcfce7] text-[#1e293b] hover:bg-[#bbf7d0] px-3 py-1.5 text-xs font-mono font-bold rounded-md flex items-center gap-1.5 transition ml-2"
          >
            <Undo2 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Undo ({deletedToast.secondsLeft}s)</span>
          </button>
          <button
            onClick={() => {
              if (deletedToast.intervalId) clearInterval(deletedToast.intervalId);
              setDeletedToast(null);
            }}
            className="text-slate-400 hover:text-white p-1 rounded-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Application Confirmation Persistent Modal */}
      {pendingApplyJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e293b]/40 backdrop-blur-2xs">
          <div className="bg-white border-2 border-[#1e293b] w-full max-w-md p-6 space-y-4 rounded-md shadow-[6px_6px_0px_0px_#1e293b] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b-2 border-[#1e293b]">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-white bg-[#1e293b] px-2.5 py-0.5 rounded-sm">
                  {pendingApplyJob.company}
                </span>
                <span className="font-mono text-[11px] font-bold text-[#1e293b] bg-[#fef9c3] border border-[#1e293b] px-2 py-0.5 rounded-sm">
                  Confirm Application
                </span>
              </div>
              <button
                onClick={handleCancelApplied}
                className="soft-brutal-btn bg-white text-[#1e293b] p-1 rounded-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="font-display font-bold text-base text-[#1e293b] leading-snug">
                Did you complete your application?
              </h3>
              <p className="font-mono text-xs text-[#475569]">
                Position: <span className="font-bold text-[#1e293b]">{pendingApplyJob.title}</span>
              </p>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 font-mono text-xs font-bold border-t-2 border-[#1e293b]">
              <button
                onClick={handleCancelApplied}
                className="soft-brutal-btn bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold px-5 py-2.5 rounded-md border-2 border-[#1e293b] shadow-[2px_2px_0px_0px_#1e293b]"
              >
                No, Not Yet
              </button>
              <button
                onClick={() => handleConfirmApplied(pendingApplyJob)}
                className="soft-brutal-btn bg-[#16a34a] hover:bg-[#15803d] text-white font-bold px-5 py-2.5 rounded-md border-2 border-[#1e293b] shadow-[2px_2px_0px_0px_#1e293b] flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Yes, I Applied</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
