import { useEffect, useState } from "react";
import { openExternal } from "../lib/native";
import { Modal } from "./ui/Modal";

const SITE = "https://photovibe.mory.dev";
const REPO = "mory-dev/photovibe";
const VERSION = "0.1.0";

interface AboutDialogProps {
  onClose: () => void;
}

export function AboutDialog({ onClose }: AboutDialogProps) {
  const [latest, setLatest] = useState<{ tag: string; url: string } | null>(null);
  const [status, setStatus] = useState("Checking for updates…");

  useEffect(() => {
    void fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
      .then(async (response) => {
        if (!response.ok) throw new Error("No release yet");
        const data = (await response.json()) as {
          tag_name: string;
          html_url: string;
          assets?: Array<{ name: string; browser_download_url: string }>;
        };
        const exe = data.assets?.find((asset) => asset.name.toLowerCase().endsWith(".exe"));
        setLatest({ tag: data.tag_name.replace(/^v/, ""), url: exe?.browser_download_url || data.html_url });
        setStatus(data.tag_name.replace(/^v/, "") === VERSION ? "You are on the latest version." : `Version ${data.tag_name} is available.`);
      })
      .catch(() => setStatus("Could not reach GitHub releases yet."));
  }, []);

  return (
    <Modal title="About Photovibe" onClose={onClose} width={400}>
      <div className="flex gap-4 text-[11px]">
        <img src="/logo.png" alt="" className="h-16 w-16 rounded-md border border-border object-contain" />
        <div className="space-y-2">
          <div>
            <div className="text-sm font-semibold text-text">Photovibe</div>
            <div className="text-text-muted">Version {VERSION}</div>
          </div>
          <button type="button" className="text-accent hover:underline" onClick={() => void openExternal(SITE)}>
            photovibe.mory.dev
          </button>
          <p className="text-text-muted">{status}</p>
          {latest && latest.tag !== VERSION && (
            <button
              type="button"
              className="rounded bg-accent px-3 py-1 text-[#1a1a1a] hover:bg-accent-hover"
              onClick={() => void openExternal(latest.url)}
            >
              Download update
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
