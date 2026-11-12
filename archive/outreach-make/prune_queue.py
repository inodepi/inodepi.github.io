"""
Prune the outreach lead queues.

Removes leads from <project>/leads.json that either:
  1. have a `niche` outside the scraper's TARGET_INDUSTRIES, or
  2. whose email domain has no MX record (mail would bounce).

Pruned leads are preserved in <project>/pruned_leads.json (with the reason),
never deleted. Re-running the scraper refills the queue with industry-targeted,
MX-verified leads only.

Usage:
    python prune_queue.py                 # prune this repo's queue
    python prune_queue.py outreach-make outreach-n8n   # prune several queues
"""

import importlib.util
import json
import sys
from pathlib import Path


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def prune_dir(project_dir):
    project = Path(project_dir)
    sys.path.insert(0, str(project))
    try:
        scraper = load_module(f"scraper_{project.name.replace('-', '_')}", project / "scraper.py")
    finally:
        sys.path.pop(0)

    leads_file = project / "leads.json"
    pruned_file = project / "pruned_leads.json"

    if not leads_file.exists():
        print(f"{project_dir}: no leads.json — nothing to do.")
        return

    leads = scraper.load_queue(str(leads_file))
    if not leads:
        print(f"{project_dir}: queue already empty.")
        return

    kept, pruned = [], []
    prior = []
    if pruned_file.exists():
        try:
            prior = json.loads(pruned_file.read_text(encoding="utf-8"))
            if not isinstance(prior, list):
                prior = []
        except json.JSONDecodeError:
            prior = []

    for lead in leads:
        reasons = []
        niche = str(lead.get("niche", ""))
        email = str(lead.get("email", "")).strip()
        domain = email.partition("@")[2].lower()

        if niche not in scraper.TARGET_INDUSTRIES:
            reasons.append(f"niche '{niche}' not in target industries")
        if domain and not scraper.mx_deliverable(domain):
            reasons.append("email domain has no MX record (would bounce)")

        if reasons:
            pruned.append({**lead, "prune_reasons": reasons})
        else:
            kept.append(lead)

    scraper.save_queue(str(leads_file), kept)
    scraper.save_queue(str(pruned_file), prior + pruned)

    niche_pruned = sum(1 for p in pruned if any("niche" in r for r in p["prune_reasons"]))
    mx_pruned = sum(1 for p in pruned if any("MX" in r for r in p["prune_reasons"]))
    print(f"{project_dir}: kept {len(kept)}, pruned {len(pruned)} "
          f"({niche_pruned} non-target industry, {mx_pruned} no-MX) → pruned_leads.json")
    for p in pruned:
        print(f"  - {p.get('business_name', '<unnamed>')} <{p.get('email', '')}>: {'; '.join(p['prune_reasons'])}")


def main():
    targets = sys.argv[1:]
    if not targets:
        targets = [str(Path(__file__).resolve().parent)]
        print(f"No directories given — pruning this repo ({Path(targets[0]).name}).")
    for project_dir in targets:
        prune_dir(project_dir)
    return 0


if __name__ == "__main__":
    sys.exit(main())
