#!/usr/bin/env python3
"""
Build the NBA-LLM-comps data the blog article consumes.

Reads the source experiment data (matchups.csv + players.json) and the locally
authored era map (src/data/nba/eras.json), recomputes Elo with the same logic as
the source repo's prep_viz_data.py, and emits everything the six article visuals
need:

  src/data/nba/nba_viz.json      — build-time import for the static charts
  public/data/nba/players.json   — runtime fetch for the vote-lookup combobox
  public/data/nba/pair_votes.json — runtime fetch for the vote-lookup

Run after the source matchups.csv changes:
  python3 scripts/build_nba_data.py [path-to-nba-llm-comps]

Default source path: ../nba-llm-comps (sibling checkout).
The emitted JSON is a committed snapshot so the GitHub Actions build needs no
access to the source repo.
"""

import csv
import json
import math
import shutil
import sys
from collections import defaultdict
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else SITE.parent / "nba-llm-comps"

K_FACTOR = 32
INITIAL_ELO = 1500
MODEL_ORDER = ["gemma3:12b", "llama3.1:8b", "mistral:7b", "phi4:14b", "qwen2.5:7b"]
DECADES = ["1950s", "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"]
RORSCHACH_N = 6  # how many highest-spread players to feature in the chaos chart


def expected_score(ra, rb):
    return 1.0 / (1.0 + math.pow(10, (rb - ra) / 400))


def update_elo(ra, rb, a_wins):
    ea = expected_score(ra, rb)
    sa = 1.0 if a_wins else 0.0
    return ra + K_FACTOR * (sa - ea), rb + K_FACTOR * ((1 - sa) - (1 - ea))


def elo_ladder(rows, players):
    """Run one Elo ladder over the given rows; return {player: elo}."""
    elo = {p: INITIAL_ELO for p in players}
    for r in rows:
        pa, pb, pick = r["player_a"], r["player_b"], r["result"]
        elo[pa], elo[pb] = update_elo(elo[pa], elo[pb], pick == pa)
    return elo


def ranked(elo):
    """[{name, rank, elo}] sorted high→low."""
    order = sorted(elo.items(), key=lambda x: x[1], reverse=True)
    return [{"name": n, "rank": i + 1, "elo": round(e, 1)} for i, (n, e) in enumerate(order)]


def main():
    players = json.loads((SRC / "players.json").read_text())
    eras = {k: v for k, v in json.loads((SITE / "src/data/nba/eras.json").read_text()).items()
            if not k.startswith("_")}

    with open(SRC / "matchups.csv") as f:
        all_rows = list(csv.DictReader(f))
    rows = [r for r in all_rows if r["result"] != "FAILED"]

    # --- per-model Elo (full 144) ---
    model_elo = {m: elo_ladder([r for r in rows if r["model"] == m], players) for m in MODEL_ORDER}
    model_rankings = {m: ranked(model_elo[m]) for m in MODEL_ORDER}

    # --- combined Elo across all judges ---
    combined_ranking = ranked(elo_ladder(rows, players))

    # --- agreement matrix (share of shared matchups where two judges agreed) ---
    matchup_votes = defaultdict(dict)
    for r in rows:
        matchup_votes[r["matchup_id"]][r["model"]] = r["result"]
    agreement = {m1: {m2: None for m2 in MODEL_ORDER} for m1 in MODEL_ORDER}
    for m1 in MODEL_ORDER:
        for m2 in MODEL_ORDER:
            if m1 == m2:
                continue
            agree = total = 0
            for votes in matchup_votes.values():
                if m1 in votes and m2 in votes:
                    total += 1
                    agree += votes[m1] == votes[m2]
            agreement[m1][m2] = round(agree / total * 100, 1) if total else 0.0

    # --- consensus: players in every model's top-20 ---
    rank_of = {m: {p["name"]: p["rank"] for p in model_rankings[m]} for m in MODEL_ORDER}
    top20 = [{p["name"] for p in model_rankings[m][:20]} for m in MODEL_ORDER]
    in_all = set.intersection(*top20)
    consensus = []
    for name in in_all:
        ranks = [rank_of[m][name] for m in MODEL_ORDER]
        consensus.append({"name": name, "mean_rank": round(sum(ranks) / len(ranks), 1),
                          "min_rank": min(ranks), "max_rank": max(ranks)})
    consensus.sort(key=lambda x: x["mean_rank"])

    # --- era slopes: per model, average Elo of players grouped by debut decade ---
    by_decade = defaultdict(list)
    for p, d in eras.items():
        by_decade[d].append(p)
    era_slopes = {}
    for m in MODEL_ORDER:
        elo = model_elo[m]
        era_slopes[m] = {
            d: {"avg_elo": round(sum(elo[p] for p in by_decade[d]) / len(by_decade[d]), 1),
                "n": len(by_decade[d])}
            for d in DECADES if by_decade.get(d)
        }

    # --- rorschach: the players the judges disagree on most (Elo spread across models) ---
    combined_rank = {p["name"]: p["rank"] for p in combined_ranking}
    spreads = []
    for name in players:
        by_model = {m: round(model_elo[m][name], 1) for m in MODEL_ORDER}
        lo, hi = min(by_model.values()), max(by_model.values())
        spreads.append({"name": name, "combined_rank": combined_rank[name],
                        "by_model": by_model, "lo": lo, "hi": hi, "spread": round(hi - lo, 1)})
    spreads.sort(key=lambda x: x["spread"], reverse=True)
    rorschach = spreads[:RORSCHACH_N]

    viz = {
        "models": MODEL_ORDER,
        "players": players,  # index order — pair_votes.json keys reference these positions
        "counts": {"total_votes": len(all_rows), "valid_votes": len(rows),
                   "failed": len(all_rows) - len(rows)},
        "combined_ranking": combined_ranking,
        "model_rankings": model_rankings,
        "agreement_matrix": agreement,
        "consensus": consensus,
        "decades": [d for d in DECADES if by_decade.get(d)],
        "era_slopes": era_slopes,
        "rorschach": rorschach,
    }

    out_viz = SITE / "src/data/nba/nba_viz.json"
    out_viz.write_text(json.dumps(viz, indent=2))

    pub = SITE / "public/data/nba"
    pub.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(SRC / "players.json", pub / "players.json")
    shutil.copyfile(SRC / "pair_votes.json", pub / "pair_votes.json")

    # --- report ---
    print(f"source: {SRC}")
    print(f"votes: {viz['counts']['valid_votes']} valid / {viz['counts']['total_votes']} total")
    print(f"combined top-5: " + ", ".join(f"{p['name']} {p['elo']:.0f}" for p in combined_ranking[:5]))
    print(f"consensus: {len(consensus)} players in all 5 top-20")
    print(f"rorschach top spreads:")
    for r in rorschach:
        print(f"  {r['name']:22s} {r['lo']:.0f} -> {r['hi']:.0f}  (spread {r['spread']:.0f})")
    print(f"wrote {out_viz.relative_to(SITE)} + public/data/nba/{{players,pair_votes}}.json")


if __name__ == "__main__":
    main()
