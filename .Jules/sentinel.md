# Sentinel Journal

This journal documents critical security learnings and decisions.

## 2024-10-24 - Initial Setup
**Vulnerability:** N/A
**Learning:** Initialized Sentinel journal.
**Prevention:** N/A

## 2025-05-24 - Server Security Hardening
**Vulnerability:** Missing request body size limits (DoS risk) and security headers.
**Learning:** Node.js `http` server buffers entire request body in memory by default if not handled. Raw `http` servers need manual implementation of standard security headers often provided by frameworks.
**Prevention:** Implemented streaming body parser with size limit (1MB) and added hardcoded security headers (HSTS, CSP, X-Frame-Options, etc.).
