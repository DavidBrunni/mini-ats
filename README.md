🧠 Multi-Tenant ATS Platform

A multi-tenant Applicant Tracking System (ATS) built with Next.js and Supabase.
Developed as a technical case assignment, fulfilling all core requirements and extended with additional production-oriented features.

🚀 Live Demo

Live URL:
https://your-project.vercel.app

🏗 Tech Stack

Framework: Next.js (App Router)

Backend & Auth: Supabase

Database: PostgreSQL (via Supabase)

Deployment: Vercel

Authentication: Supabase Auth

Access Control: Role-based + Row Level Security (RLS)

✅ Core Requirements Implemented
Admin

Create user accounts (admin & customer)

Manage organizations

Access all customer data

Perform all actions customers can perform

Customer

Secure login via Supabase Auth

Create job postings

Add candidates with profile information (e.g., LinkedIn URL)

View candidates in a compact Kanban board

Drag & drop candidates between stages

Filter candidates by job and name

🌟 Extended Functionality

Beyond the core assignment, the platform includes:

✅ Multi-tenant organization structure

✅ Role-based dashboards

✅ Candidate comments

✅ Activity log (audit trail of stage changes)

✅ CSV export functionality

✅ Dark mode toggle

✅ Landing page with demo credentials

✅ Production deployment

🗂 System Architecture
Organizations

Each customer belongs to a single organization (multi-tenant structure).

Profiles

Linked to Supabase Auth users and includes:

role (admin or customer)

organization_id

Jobs

Belong to an organization

Contain candidates

Candidates

Belong to a job

Include:

Name

LinkedIn URL

Stage (Applied, Screening, etc.)

Candidate Comments

Linked to candidates

Created by users within the same organization (or admin)

Candidate Activities

Tracks stage changes and system actions

Provides full audit visibility

🔐 Security & Data Isolation

Row Level Security (RLS) ensures:

Customers can only access data within their organization

Admins can access data across organizations

Service Role Key is used server-side only (never exposed to frontend)

Environment variables are securely managed in Vercel
