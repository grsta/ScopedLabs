window.SCOPEDLABS_CATALOG = {
  "access-control": {
    label: "Access Control",
    tools: [
      { slug: "door-count-planner", label: "Door Count Planner", tier: "free", order: 1, pipeline: "access-design", step: "door-count" },
      { slug: "credential-format", label: "Credential Format", tier: "free", order: 2, pipeline: "access-design", step: "credential-format" },
      { slug: "reader-type-selector", label: "Reader Type Selector", tier: "free", order: 3, pipeline: "access-design", step: "reader-type" },
      { slug: "panel-capacity", label: "Panel Capacity", tier: "pro", order: 4, pipeline: "access-design", step: "panel-capacity" },
      { slug: "lock-power-budget", label: "Lock Power Budget", tier: "pro", order: 5, pipeline: "access-design", step: "lock-power" },
      { slug: "fail-safe-fail-secure", label: "Fail Safe / Fail Secure", tier: "pro", order: 6, pipeline: null, step: null },
      { slug: "door-cable-length", label: "Door Cable Length", tier: "pro", order: 7, pipeline: null, step: null },
      { slug: "anti-passback-zones", label: "Anti-Passback Zones", tier: "pro", order: 8, pipeline: null, step: null },
      { slug: "elevator-reader-count", label: "Elevator Reader Count", tier: "pro", order: 9, pipeline: null, step: null },
      { slug: "access-level-sizing", label: "Access Level Sizing", tier: "pro", order: 10, pipeline: null, step: null }
    ]
  },

  "compute": {
    label: "Compute",
    tools: [
      { slug: "cpu-sizing", label: "CPU Sizing", tier: "free", order: 1, pipeline: "compute-design", step: "cpu" },
      { slug: "ram-sizing", label: "RAM Sizing", tier: "free", order: 2, pipeline: "compute-design", step: "ram" },
      { slug: "storage-throughput", label: "Storage Throughput", tier: "free", order: 3, pipeline: "compute-design", step: "storage-throughput" },
      { slug: "storage-iops", label: "Storage IOPS", tier: "pro", order: 4, pipeline: "compute-design", step: "storage-iops" },
      { slug: "gpu-vram", label: "GPU VRAM", tier: "pro", order: 5, pipeline: null, step: null },
      { slug: "vm-density", label: "VM Density", tier: "pro", order: 6, pipeline: null, step: null },
      { slug: "nic-bonding", label: "NIC Bonding", tier: "pro", order: 7, pipeline: null, step: null },
      { slug: "raid-rebuild-time", label: "RAID Rebuild Time", tier: "pro", order: 8, pipeline: null, step: null },
      { slug: "backup-window", label: "Backup Window", tier: "pro", order: 9, pipeline: null, step: null },
      { slug: "power-thermal", label: "Power / Thermal", tier: "pro", order: 10, pipeline: null, step: null }
    ]
  },

  "infrastructure": {
    label: "Infrastructure",
    tools: [
      { slug: "room-square-footage", label: "Room Square Footage", tier: "free", order: 1, pipeline: "infrastructure-design", step: "room-size" },
      { slug: "rack-ru-planner", label: "Rack RU Planner", tier: "free", order: 2, pipeline: "infrastructure-design", step: "rack-ru" },
      { slug: "conduit-fill", label: "Conduit Fill", tier: "free", order: 3, pipeline: "infrastructure-design", step: "conduit-fill" },
      { slug: "cable-tray-fill", label: "Cable Tray Fill", tier: "pro", order: 4, pipeline: null, step: null },
      { slug: "rack-weight-load", label: "Rack Weight Load", tier: "pro", order: 5, pipeline: null, step: null },
      { slug: "floor-load-rating", label: "Floor Load Rating", tier: "pro", order: 6, pipeline: null, step: null },
      { slug: "equipment-spacing", label: "Equipment Spacing", tier: "pro", order: 7, pipeline: null, step: null },
      { slug: "ups-room-sizing", label: "UPS Room Sizing", tier: "pro", order: 8, pipeline: null, step: null },
      { slug: "generator-runtime", label: "Generator Runtime", tier: "pro", order: 9, pipeline: null, step: null },
      { slug: "grounding-estimator", label: "Grounding Estimator", tier: "pro", order: 10, pipeline: null, step: null }
    ]
  },

  "network": {
    label: "Network",
    tools: [
      { slug: "bandwidth", label: "Bandwidth Planner", tier: "free", order: 1, pipeline: "network-design", step: "bandwidth" },
      { slug: "oversubscription", label: "Oversubscription Estimator", tier: "free", order: 2, pipeline: "network-design", step: "oversubscription" },
      { slug: "latency", label: "Latency Budget", tier: "free", order: 3, pipeline: "network-design", step: "latency" },
      { slug: "uplink-failure-impact", label: "Uplink Failure Impact", tier: "pro", order: 4, pipeline: "network-design", step: "uplink-failure" },
      { slug: "growth-simulator", label: "Growth Simulator", tier: "pro", order: 5, pipeline: null, step: null },
      { slug: "packet-loss-impact", label: "Packet Loss Impact", tier: "pro", order: 6, pipeline: null, step: null },
      { slug: "vpn-overhead", label: "VPN Overhead", tier: "pro", order: 7, pipeline: null, step: null },
      { slug: "poe-budget", label: "PoE Budget", tier: "pro", order: 8, pipeline: null, step: null },
      { slug: "latency-jitter-buffer", label: "Latency / Jitter Buffer", tier: "pro", order: 9, pipeline: null, step: null },
      { slug: "mtu-fragmentation", label: "MTU Fragmentation", tier: "pro", order: 10, pipeline: null, step: null }
    ]
  },

  "performance": {
    label: "Performance",
    tools: [
      { slug: "headroom-target", label: "Headroom Target", tier: "free", order: 1, pipeline: "performance-design", step: "headroom" },
      { slug: "concurrency-scaling", label: "Concurrency Scaling", tier: "free", order: 2, pipeline: "performance-design", step: "concurrency" },
      { slug: "latency-vs-throughput", label: "Latency vs Throughput", tier: "free", order: 3, pipeline: "performance-design", step: "latency-throughput" },
      { slug: "bottleneck-analyzer", label: "Bottleneck Analyzer", tier: "pro", order: 4, pipeline: "performance-design", step: "bottleneck" },
      { slug: "cpu-utilization-impact", label: "CPU Utilization Impact", tier: "pro", order: 5, pipeline: null, step: null },
      { slug: "disk-saturation", label: "Disk Saturation", tier: "pro", order: 6, pipeline: null, step: null },
      { slug: "network-congestion", label: "Network Congestion", tier: "pro", order: 7, pipeline: null, step: null },
      { slug: "queue-depth", label: "Queue Depth", tier: "pro", order: 8, pipeline: null, step: null },
      { slug: "response-time-sla", label: "Response Time SLA", tier: "pro", order: 9, pipeline: null, step: null },
      { slug: "cache-hit-ratio", label: "Cache Hit Ratio", tier: "pro", order: 10, pipeline: null, step: null }
    ]
  },

  "physical-security": {
    label: "Physical Security",
    tools: [
      { slug: "field-of-view", label: "Field of View", tier: "free", order: 1, pipeline: "coverage-design", step: "field-of-view" },
      { slug: "pixel-density", label: "Pixel Density", tier: "free", order: 2, pipeline: "coverage-design", step: "pixel-density" },
      { slug: "camera-coverage-area", label: "Camera Coverage Area", tier: "free", order: 3, pipeline: "coverage-design", step: "coverage-area" },
      { slug: "lens-selection", label: "Lens Selection", tier: "pro", order: 4, pipeline: "coverage-design", step: "lens-selection" },
      { slug: "mounting-height", label: "Mounting Height", tier: "pro", order: 5, pipeline: null, step: null },
      { slug: "camera-spacing", label: "Camera Spacing", tier: "pro", order: 6, pipeline: null, step: null },
      { slug: "blind-spot-check", label: "Blind Spot Check", tier: "pro", order: 7, pipeline: null, step: null },
      { slug: "face-recognition-range", label: "Face Recognition Range", tier: "pro", order: 8, pipeline: null, step: null },
      { slug: "license-plate-range", label: "License Plate Range", tier: "pro", order: 9, pipeline: null, step: null },
      { slug: "scene-illumination", label: "Scene Illumination", tier: "pro", order: 10, pipeline: null, step: null }
    ]
  },

  "power": {
    label: "Power",
    tools: [
      { slug: "va-watts-amps", label: "VA / Watts / Amps", tier: "free", order: 1, pipeline: "power-design", step: "load" },
      { slug: "ups-runtime", label: "UPS Runtime", tier: "free", order: 2, pipeline: "power-design", step: "ups-runtime" },
      { slug: "battery-sizing", label: "Battery Sizing", tier: "free", order: 3, pipeline: "power-design", step: "battery-sizing" },
      { slug: "battery-bank-sizer", label: "Battery Bank Sizer", tier: "pro", order: 4, pipeline: "power-design", step: "battery-bank" },
      { slug: "redundancy-impact", label: "Redundancy Impact", tier: "pro", order: 5, pipeline: null, step: null },
      { slug: "failure-runtime-loss", label: "Failure Runtime Loss", tier: "pro", order: 6, pipeline: null, step: null },
      { slug: "worst-case-runtime", label: "Worst Case Runtime", tier: "pro", order: 7, pipeline: null, step: null },
      { slug: "inverter-efficiency", label: "Inverter Efficiency", tier: "pro", order: 8, pipeline: null, step: null },
      { slug: "load-growth", label: "Load Growth", tier: "pro", order: 9, pipeline: null, step: null },
      { slug: "scenario-comparator", label: "Scenario Comparator", tier: "pro", order: 10, pipeline: null, step: null }
    ]
  },

  "thermal": {
    label: "Thermal",
    tools: [
      { slug: "btu-converter", label: "BTU Converter", tier: "free", order: 1, pipeline: "thermal-design", step: "btu" },
      { slug: "heat-load-estimator", label: "Heat Load Estimator", tier: "free", order: 2, pipeline: "thermal-design", step: "heat-load" },
      { slug: "airflow-requirement", label: "Airflow Requirement", tier: "free", order: 3, pipeline: "thermal-design", step: "airflow" },
      { slug: "room-cooling-capacity", label: "Room Cooling Capacity", tier: "pro", order: 4, pipeline: "thermal-design", step: "cooling-capacity" },
      { slug: "rack-thermal-density", label: "Rack Thermal Density", tier: "pro", order: 5, pipeline: null, step: null },
      { slug: "ambient-rise", label: "Ambient Rise", tier: "pro", order: 6, pipeline: null, step: null },
      { slug: "fan-cfm-sizing", label: "Fan CFM Sizing", tier: "pro", order: 7, pipeline: null, step: null },
      { slug: "psu-efficiency-heat", label: "PSU Efficiency Heat", tier: "pro", order: 8, pipeline: null, step: null },
      { slug: "hot-cold-aisle", label: "Hot / Cold Aisle", tier: "pro", order: 9, pipeline: null, step: null },
      { slug: "exhaust-temperature", label: "Exhaust Temperature", tier: "pro", order: 10, pipeline: null, step: null }
    ]
  },

  "video-storage": {
    label: "Video & Storage",
    tools: [
      { slug: "bitrate-estimator", label: "Bitrate Estimator", tier: "free", order: 1, pipeline: "video-design", step: "bitrate" },
      { slug: "storage-calculator", label: "Storage Calculator", tier: "free", order: 2, pipeline: "video-design", step: "storage" },
      { slug: "retention-planner", label: "Retention Planner", tier: "free", order: 3, pipeline: "video-design", step: "retention" },
      { slug: "raid-impact", label: "RAID Impact", tier: "pro", order: 4, pipeline: "video-design", step: "raid" },
      { slug: "retention-survivability", label: "Retention Survivability", tier: "pro", order: 5, pipeline: "video-design", step: "survivability" },
      { slug: "advanced-storage-planner", label: "Advanced Storage Planner", tier: "pro", order: 6, pipeline: null, step: null },
      { slug: "archive-cost", label: "Archive Cost", tier: "pro", order: 7, pipeline: null, step: null },
      { slug: "codec-efficiency", label: "Codec Efficiency", tier: "pro", order: 8, pipeline: null, step: null },
      { slug: "compression-impact", label: "Compression Impact", tier: "pro", order: 9, pipeline: null, step: null },
      { slug: "failure-days-lost", label: "Failure Days Lost", tier: "pro", order: 10, pipeline: null, step: null }
    ]
  },

  "wireless": {
    label: "Wireless",
    tools: [
      { slug: "coverage-radius", label: "Coverage Radius", tier: "free", order: 1, pipeline: "wireless-design", step: "coverage" },
      { slug: "throughput-estimator", label: "Throughput Estimator", tier: "free", order: 2, pipeline: "wireless-design", step: "throughput" },
      { slug: "link-budget", label: "Link Budget", tier: "free", order: 3, pipeline: "wireless-design", step: "link-budget" },
      { slug: "ptp-wireless-link", label: "PTP Wireless Link", tier: "pro", order: 4, pipeline: "wireless-design", step: "ptp-link" },
      { slug: "noise-floor-margin", label: "Noise Floor Margin", tier: "pro", order: 5, pipeline: null, step: null },
      { slug: "channel-overlap", label: "Channel Overlap", tier: "pro", order: 6, pipeline: null, step: null },
      { slug: "client-density", label: "Client Density", tier: "pro", order: 7, pipeline: null, step: null },
      { slug: "ap-capacity", label: "AP Capacity", tier: "pro", order: 8, pipeline: null, step: null },
      { slug: "mesh-backhaul", label: "Mesh Backhaul", tier: "pro", order: 9, pipeline: null, step: null },
      { slug: "roaming-thresholds", label: "Roaming Thresholds", tier: "pro", order: 10, pipeline: null, step: null }
    ]
  }
};