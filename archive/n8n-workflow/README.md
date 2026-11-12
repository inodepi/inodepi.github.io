# n8n Workflows Collection

This repository contains exported workflows from the n8n instance. Each file is a JSON representation of a workflow that can be imported back into n8n.

## Workflows Index

| ID | Name | Description | Status | Created | Updated |
|----|------|-------------|--------|---------|---------|
| 0xV87CP3wbWuc4z4 | Dead Lead Retrieval | Automated lead follow-up system that checks ClickUp for "to do" tasks daily at 10 AM, generates AI follow-up emails using OpenRouter/Gemini, creates Gmail drafts, and updates task status upon email engagement. | Inactive, Archived | 2026-08-25 | 2026-08-25 |
| 7xc8SHKGhIacn07c | RFP/Tender Response Automation | Simple webhook trigger for RFP processing intake. | Inactive | 2026-08-29 | 2026-08-29 |
| 8a7mDFfUKjRTKB0m | PROBE - SA Calendar Access | Checks Google Calendar availability for the next hour via webhook. | Inactive | 2026-08-26 | 2026-08-26 |
| 8uYNJLLzDLiq29Ue | Telegram Interactive Trading Signal Bot | Receives trading signals via webhook, sends interactive Telegram alerts, and forwards responses to a Python backend. | Inactive | 2026-08-23 | 2026-08-23 |
| 9CZ1TJfWwcHkxrp4 | Voice Receptionist - inodepi salon (HIPAA Compliant with Google Sheets) | Retell voice receptionist: acknowledges call_analyzed webhooks, dedupes by call_id, extracts structured data, checks calendar availability, books appointments, logs to Google Sheets, and sends alerts via email/Telegram. | Inactive | 2026-08-29 | 2026-10-25 |
| DDvmL6oWqWMoBqK2 | n8n - DataforSEO - All Operations | Comprehensive SEO tool that accepts keyword, location, language, and operation via form, then calls various DataforSEO APIs (related keywords, suggestions, autocomplete, subtopics, people also ask) and exports results to Google Sheets. | Inactive | 2026-08-17 | 2026-08-18 |
| JRTyOmKTPyso9yot | Alamat Automated Shorts Multi-Channel Publisher | AI-generated content workflow that creates scripts for Philippine mythology shorts, generates video metadata, and publishes to YouTube Shorts, TikTok, and Facebook Reels. | Inactive | 2026-08-18 | 2026-08-18 |
| PNM1rkF7N1lOP0ev | Lead Response System with Human Approval | Captures leads via webhook, uses AI to analyze and draft responses, sends approval requests via Telegram, and sends approved replies via Gmail. | Inactive | 2026-08-16 | 2026-08-16 |
| PTGJTmwugqSB8Ax7 | Voice Receptionist - inodepi salon (HIPAA Compliant) | Archived Data Table variant of the Retell receptionist. Uses n8n's built-in Data Table instead of Google Sheets; the table selector is blank and the call_id dedupe guard is not wired. | Inactive, Archived | 2026-08-29 | 2026-10-25 |
| QCxD72Qc3I89jQTG | Lead Capture & Notification Workflow | Captures leads via webhook, appends to Google Sheets, and sends email notifications. | Inactive | 2026-08-18 | 2026-08-18 |
| QqXD527hFowxWsdr | RFP/Tender Response Automation | Simple webhook that returns a confirmation message when RFP data is received. | Inactive | 2026-08-29 | 2026-08-29 |

## Usage

To import a workflow into n8n:
1. In n8n UI, go to Workflows -> Import
2. Select the JSON file for the workflow you want to import
3. Configure any required credentials (API keys, OAuth connections, etc.)
4. Activate the workflow

## Notes

- Workflows may contain placeholders for credentials (like `YOUR_YOUTUBE_OAUTH_TOKEN`) that need to be configured
- Some workflows reference specific Google Sheets, Slack channels, or other external resources that may need adjustment
- Timestamps reflect when the workflows were exported from the source n8n instance