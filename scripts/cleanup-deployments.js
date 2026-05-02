#!/usr/bin/env node
// scripts/cleanup-deployments.js
//
// Deletes Cloudflare Pages deployments older than the most recent 3 per branch.
// Runs against a single Pages project, specified via environment variables.
//
// Required env vars:
//   CLOUDFLARE_API_TOKEN    Cloudflare API token with Pages write access
//   CLOUDFLARE_ACCOUNT_ID   Cloudflare account ID
//   CF_PAGES_PROJECT        Pages project name (e.g. hithrive-staging or hithrive-prod)
//
// Optional env vars:
//   KEEP_COUNT              Number of deployments to keep per branch (default: 3)

import https from "https"

const API_TOKEN  = process.env.CLOUDFLARE_API_TOKEN
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const PROJECT    = process.env.CF_PAGES_PROJECT
const KEEP_COUNT = parseInt(process.env.KEEP_COUNT || "3", 10)

if (!API_TOKEN || !ACCOUNT_ID || !PROJECT) {
  console.error("ERROR: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID and CF_PAGES_PROJECT are required.")
  process.exit(1)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cfRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.cloudflare.com",
      path: `/client/v4${path}`,
      method,
      headers: {
        "Authorization": `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      }
    }

    const req = https.request(options, (res) => {
      const chunks = []
      res.on("data", chunk => chunks.push(chunk))
      res.on("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()))
        } catch {
          resolve({})
        }
      })
    })

    req.on("error", reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function listAllDeployments() {
  let page = 1
  const all = []

  while (true) {
    const res = await cfRequest(
      "GET",
      `/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}/deployments?page=${page}&per_page=25`
    )

    if (!res.success) {
      console.error("ERROR: Failed to list deployments:", JSON.stringify(res.errors))
      process.exit(1)
    }

    all.push(...res.result)

    if (res.result.length < 25) break
    page++
  }

  return all
}

async function deleteDeployment(deploymentId) {
  const res = await cfRequest(
    "DELETE",
    `/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}/deployments/${deploymentId}?force=true`
  )
  return res.success !== false
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`Cleaning up deployments for project: ${PROJECT}`)
console.log(`Keeping ${KEEP_COUNT} most recent deployments per branch\n`)

const deployments = await listAllDeployments()
console.log(`Found ${deployments.length} total deployment(s)`)

// Group by branch, sorted newest first (API returns newest first already)
const byBranch = {}
for (const d of deployments) {
  const branch = d.deployment_trigger?.metadata?.branch ?? "unknown"
  if (!byBranch[branch]) byBranch[branch] = []
  byBranch[branch].push(d)
}

let deleted = 0
let failed = 0
let skipped = 0

for (const [branch, deps] of Object.entries(byBranch)) {
  const toDelete = deps.slice(KEEP_COUNT)
  console.log(`Branch "${branch}": ${deps.length} deployment(s), keeping ${Math.min(deps.length, KEEP_COUNT)}, deleting ${toDelete.length}`)

  for (const d of toDelete) {
    const created = new Date(d.created_on).toISOString().slice(0, 19).replace("T", " ")
    process.stdout.write(`  Deleting ${d.id} (${created} UTC)... `)

    // Skip deployments that are currently active/live
    if (d.is_skipped === false && d.latest_stage?.name === "deploy" && d.latest_stage?.status === "success") {
      // Check if this is the aliased/production deployment - don't delete it
      if (d.aliases && d.aliases.length > 0) {
        console.log("skipped (aliased deployment)")
        skipped++
        continue
      }
    }

    const ok = await deleteDeployment(d.id)
    if (ok) {
      console.log("deleted")
      deleted++
    } else {
      console.log("FAILED")
      failed++
    }
  }
}

console.log(`\nDone. Deleted: ${deleted} | Skipped: ${skipped} | Failed: ${failed}`)
