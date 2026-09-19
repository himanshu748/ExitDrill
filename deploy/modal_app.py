"""Public, disposable judge demo. Deploy with: modal deploy deploy/modal_app.py"""
from pathlib import Path
import modal

ROOT = Path(__file__).resolve().parents[1]
app = modal.App("exitdrill")
image = (
    modal.Image.from_registry("node:24.9.0-bookworm-slim", add_python="3.12")
    .apt_install("ca-certificates")
    .workdir("/app")
    .env({"NEXT_TELEMETRY_DISABLED": "1", "RAYON_NUM_THREADS": "2", "TOKIO_WORKER_THREADS": "2"})
    .add_local_dir(ROOT, "/app", copy=True, ignore=[
        "node_modules", ".git", ".env", ".env.*", "data", "artifacts", "work", "output",
        "**/.next", "**/dist", "**/*.log", "**/*.tsbuildinfo", "__pycache__",
    ])
    .run_commands("npm ci", "npm run fixtures:compile", "node deploy/build.mjs")
)

@app.function(image=image, cpu=2, memory=2048, max_containers=1, scaledown_window=600, timeout=300)
@modal.concurrent(max_inputs=40)
@modal.web_server(4310, startup_timeout=180)
def web():
    import os, subprocess
    env = dict(os.environ, EXITDRILL_PRODUCTION="1",
               EXITDRILL_ORIGIN=web.get_web_url().rstrip("/"))
    subprocess.Popen(["node", "deploy/start.mjs"], cwd="/app", env=env)
