// /assets/pipelines.js This is for the deign pipeline navigation bar
(() => {
  window.SCOPED_PIPELINES = {
    categories: {

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

      wireless: {
        label: "Wireless",
        lanes: {
          v1: [
            { id: "coverage-radius", label: "Coverage Radius", href: "/tools/wireless/coverage-radius/" },
            { id: "channel-overlap", label: "Channel Overlap", href: "/tools/wireless/channel-overlap/" },
            { id: "noise-floor-margin", label: "Noise Floor Margin", href: "/tools/wireless/noise-floor-margin/" },
            { id: "client-density", label: "Client Density", href: "/tools/wireless/client-density/" },
            { id: "ap-capacity", label: "AP Capacity", href: "/tools/wireless/ap-capacity/" },
            { id: "link-budget", label: "Link Budget", href: "/tools/wireless/link-budget/" },
            { id: "mesh-backhaul", label: "Mesh Backhaul", href: "/tools/wireless/mesh-backhaul/" },
            { id: "ptp-wireless-link", label: "PTP Wireless Link", href: "/tools/wireless/ptp-wireless-link/" },
            { id: "roaming-thresholds", label: "Roaming Thresholds", href: "/tools/wireless/roaming-thresholds/" }
          ]
        }
      },

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
      },

      thermal: {
       label: "Thermal & Environment",
       lanes: {
         v1: [
           { id: "heat-load-estimator", label: "Heat Load", href: "/tools/thermal/heat-load-estimator/" },
           { id: "psu-efficiency-heat", label: "PSU Heat Loss", href: "/tools/thermal/psu-efficiency-heat/" },
           { id: "btu-converter", label: "BTU Conversion", href: "/tools/thermal/btu-converter/" },
           { id: "rack-thermal-density", label: "Rack Density", href: "/tools/thermal/rack-thermal-density/" },
           { id: "airflow-requirement", label: "Airflow Required", href: "/tools/thermal/airflow-requirement/" },
           { id: "fan-cfm-sizing", label: "Fan CFM", href: "/tools/thermal/fan-cfm-sizing/" },
           { id: "hot-cold-aisle", label: "Hot/Cold Aisle", href: "/tools/thermal/hot-cold-aisle/" },
           { id: "ambient-rise", label: "Ambient Rise", href: "/tools/thermal/ambient-rise/" },
           { id: "exhaust-temperature", label: "Exhaust Temp", href: "/tools/thermal/exhaust-temperature/" },
           { id: "room-cooling-capacity", label: "Cooling Capacity", href: "/tools/thermal/room-cooling-capacity/" }
         ]
       }
     },

     performance: {
      label: "Performance",
      lanes: {
        v1: [
          { id: "response-time-sla", label: "SLA Target", href: "/tools/performance/response-time-sla/" },
          { id: "latency-vs-throughput", label: "Latency vs Throughput", href: "/tools/performance/latency-vs-throughput/" },
          { id: "queue-depth", label: "Queue Depth", href: "/tools/performance/queue-depth/" },
          { id: "concurrency-scaling", label: "Concurrency", href: "/tools/performance/concurrency-scaling/" },
          { id: "cpu-utilization-impact", label: "CPU Impact", href: "/tools/performance/cpu-utilization-impact/" },
          { id: "disk-saturation", label: "Disk Saturation", href: "/tools/performance/disk-saturation/" },
          { id: "network-congestion", label: "Network Congestion", href: "/tools/performance/network-congestion/" },
          { id: "cache-hit-ratio", label: "Cache Efficiency", href: "/tools/performance/cache-hit-ratio/" },
          { id: "bottleneck-analyzer", label: "Bottleneck", href: "/tools/performance/bottleneck-analyzer/" },
          { id: "headroom-target", label: "Headroom", href: "/tools/performance/headroom-target/" }
        ]
      }
    },

      "physical-security": {
        label: "Physical Security",
        lanes: {
          v1: [
            { id: "scene-illumination", label: "Scene Illumination", href: "/tools/physical-security/scene-illumination/" },
            { id: "mounting-height", label: "Mounting Height", href: "/tools/physical-security/mounting-height/" },
            { id: "field-of-view", label: "Field of View", href: "/tools/physical-security/field-of-view/" },
            { id: "camera-coverage-area", label: "Coverage Area", href: "/tools/physical-security/camera-coverage-area/" },
            { id: "camera-spacing", label: "Camera Spacing", href: "/tools/physical-security/camera-spacing/" },
            { id: "blind-spot-check", label: "Blind Spot Check", href: "/tools/physical-security/blind-spot-check/" },
            { id: "pixel-density", label: "Pixel Density", href: "/tools/physical-security/pixel-density/" },
            { id: "lens-selection", label: "Lens Selection", href: "/tools/physical-security/lens-selection/" },
            { id: "face-recognition-range", label: "Face Recognition", href: "/tools/physical-security/face-recognition-range/" },
            { id: "license-plate-range", label: "License Plate", href: "/tools/physical-security/license-plate-range/" }
          ]
        }
      }
    },

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