// /assets/pipelines.js
(() => {
  window.SCOPED_PIPELINES = {
    categories: {

      // -----------------------------
      // VIDEO & STORAGE
      // -----------------------------
      "video-storage": {
        label: "Video & Storage",
        lanes: {
          v1: [
            { id: "bitrate", label: "Bitrate", href: "/tools/video-storage/bitrate-estimator/" },
            { id: "storage", label: "Storage", href: "/tools/video-storage/storage-calculator/" },
            { id: "retention", label: "Retention", href: "/tools/video-storage/retention-planner/" },
            { id: "raid", label: "RAID", href: "/tools/video-storage/raid-impact/" },
            { id: "survivability", label: "Survivability", href: "/tools/video-storage/retention-survivability/" }
          ]
        }
      },

      // -----------------------------
      // POWER
      // -----------------------------
      power: {
        label: "Power",
        lanes: {
          v1: [
            { id: "va-watts-amps", label: "VA / Watts / Amps", href: "/tools/power/va-watts-amps/" },
            { id: "load-growth", label: "Load Growth", href: "/tools/power/load-growth/" },
            { id: "ups-runtime", label: "UPS Runtime", href: "/tools/power/ups-runtime/" },
            { id: "battery-bank-sizer", label: "Battery Bank Sizer", href: "/tools/power/battery-bank-sizer/" }
          ]
        }
      },

      // -----------------------------
      // NETWORK
      // -----------------------------
      network: {
        label: "Network & Throughput",
        lanes: {
          v1: [
            { id: "poe-budget", label: "PoE Budget", href: "/tools/network/poe-budget/" },
            { id: "bandwidth", label: "Bandwidth", href: "/tools/network/bandwidth/" },
            { id: "oversubscription", label: "Oversubscription", href: "/tools/network/oversubscription/" },
            { id: "latency", label: "Latency", href: "/tools/network/latency/" }
          ]
        }
      },

      // -----------------------------
      // ACCESS CONTROL
      // -----------------------------
      "access-control": {
        label: "Access Control",
        lanes: {
          v1: [
            { id: "fail-safe-fail-secure", label: "Fail-Safe / Fail-Secure", href: "/tools/access-control/fail-safe-fail-secure/" },
            { id: "reader-type-selector", label: "Reader Type", href: "/tools/access-control/reader-type-selector/" },
            { id: "lock-power-budget", label: "Lock Power Budget", href: "/tools/access-control/lock-power-budget/" },
            { id: "panel-capacity", label: "Panel Capacity", href: "/tools/access-control/panel-capacity/" },
            { id: "access-level-sizing", label: "Access Level Sizing", href: "/tools/access-control/access-level-sizing/" }
          ]
        }
      },

      // -----------------------------
      // COMPUTE
      // -----------------------------
      compute: {
        label: "Compute",
        lanes: {
          v1: [
            { id: "cpu-sizing", label: "CPU", href: "/tools/compute/cpu-sizing/" },
            { id: "ram-sizing", label: "RAM", href: "/tools/compute/ram-sizing/" },
            { id: "storage-iops", label: "IOPS", href: "/tools/compute/storage-iops/" },
            { id: "storage-throughput", label: "Throughput", href: "/tools/compute/storage-throughput/" },
            { id: "vm-density", label: "VM Density", href: "/tools/compute/vm-density/" },
            { id: "gpu-vram", label: "GPU (Optional)", href: "/tools/compute/gpu-vram/" },
            { id: "power-thermal", label: "Power / Thermal", href: "/tools/compute/power-thermal/" },
            { id: "raid-rebuild-time", label: "RAID Rebuild", href: "/tools/compute/raid-rebuild-time/" },
            { id: "backup-window", label: "Backup Window", href: "/tools/compute/backup-window/" }
          ]
        }
      },

      // -----------------------------
      // INFRASTRUCTURE
      // -----------------------------
      infrastructure: {
        label: "Infrastructure",
        lanes: {
          v1: [
            { id: "room-square-footage", label: "Room", href: "/tools/infrastructure/room-square-footage/" },
            { id: "rack-ru-planner", label: "Rack RU", href: "/tools/infrastructure/rack-ru-planner/" },
            { id: "equipment-spacing", label: "Spacing", href: "/tools/infrastructure/equipment-spacing/" },
            { id: "rack-weight-load", label: "Rack Load", href: "/tools/infrastructure/rack-weight-load/" },
            { id: "floor-load-rating", label: "Floor Load", href: "/tools/infrastructure/floor-load-rating/" },
            { id: "ups-room-sizing", label: "UPS Space", href: "/tools/infrastructure/ups-room-sizing/" },
            { id: "generator-runtime", label: "Generator", href: "/tools/infrastructure/generator-runtime/" }
          ],

          pathways: [
            { id: "conduit-fill", label: "Conduit", href: "/tools/infrastructure/conduit-fill/" },
            { id: "cable-tray-fill", label: "Cable Tray", href: "/tools/infrastructure/cable-tray-fill/" }
          ],

          site_power: [
            { id: "generator-runtime", label: "Generator", href: "/tools/infrastructure/generator-runtime/" },
            { id: "grounding-estimator", label: "Grounding", href: "/tools/infrastructure/grounding-estimator/" }
          ]
        }
      }
    },

    // -------------------------------
    // FUTURE CROSS-SITE PIPELINES
    // -------------------------------
    crossSite: {
      "infrastructure-design": {
        label: "Infrastructure Design",
        tier: "gold",
        lanes: {
          v1: [
            { id: "bitrate", category: "video-storage", href: "/tools/video-storage/bitrate-estimator/" },
            { id: "storage", category: "video-storage", href: "/tools/video-storage/storage-calculator/" },
            { id: "bandwidth", category: "network", href: "/tools/network/bandwidth/" },
            { id: "va-watts-amps", category: "power", href: "/tools/power/va-watts-amps/" },
            { id: "ups-runtime", category: "power", href: "/tools/power/ups-runtime/" }
          ]
        }
      }
    }
  };
})();