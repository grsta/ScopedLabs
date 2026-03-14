window.SCOPEDLABS_PIPELINES = {
  "video-storage": {
    title: "Design Pipeline",
    steps: [
      { key: "bitrate", label: "Bitrate", href: "/tools/video-storage/bitrate-estimator/" },
      { key: "storage", label: "Storage", href: "/tools/video-storage/storage-calculator/" },
      { key: "retention", label: "Retention", href: "/tools/video-storage/retention-planner/" },
      { key: "raid", label: "RAID", href: "/tools/video-storage/raid-impact/" },
      { key: "survivability", label: "Survivability", href: "/tools/video-storage/retention-survivability/" }
    ]
  },

  "network": {
    title: "Design Pipeline",
    steps: [
      { key: "bandwidth", label: "Bandwidth", href: "/tools/network/bandwidth/" },
      { key: "oversubscription", label: "Oversubscription", href: "/tools/network/oversubscription/" },
      { key: "latency", label: "Latency", href: "/tools/network/latency/" },
      { key: "uplink-failure", label: "Uplink Failure", href: "/tools/network/uplink-failure-impact/" }
    ]
  },

  "power": {
    title: "Design Pipeline",
    steps: [
      { key: "load", label: "Load", href: "/tools/power/va-watts-amps/" },
      { key: "ups-runtime", label: "UPS Runtime", href: "/tools/power/ups-runtime/" },
      { key: "battery-sizing", label: "Battery", href: "/tools/power/battery-sizing/" },
      { key: "battery-bank", label: "Battery Bank", href: "/tools/power/battery-bank-sizer/" }
    ]
  },

  "wireless": {
    title: "Design Pipeline",
    steps: [
      { key: "coverage", label: "Coverage", href: "/tools/wireless/coverage-radius/" },
      { key: "throughput", label: "Throughput", href: "/tools/wireless/throughput-estimator/" },
      { key: "link-budget", label: "Link Budget", href: "/tools/wireless/link-budget/" },
      { key: "ptp-link", label: "PTP Link", href: "/tools/wireless/ptp-wireless-link/" }
    ]
  },

  "physical-security": {
    title: "Design Pipeline",
    steps: [
      { key: "field-of-view", label: "Field of View", href: "/tools/physical-security/field-of-view/" },
      { key: "pixel-density", label: "Pixel Density", href: "/tools/physical-security/pixel-density/" },
      { key: "coverage-area", label: "Coverage", href: "/tools/physical-security/camera-coverage-area/" },
      { key: "lens-selection", label: "Lens", href: "/tools/physical-security/lens-selection/" }
    ]
  },

  "thermal": {
    title: "Design Pipeline",
    steps: [
      { key: "btu", label: "BTU", href: "/tools/thermal/btu-converter/" },
      { key: "heat-load", label: "Heat Load", href: "/tools/thermal/heat-load-estimator/" },
      { key: "airflow", label: "Airflow", href: "/tools/thermal/airflow-requirement/" },
      { key: "cooling-capacity", label: "Cooling", href: "/tools/thermal/room-cooling-capacity/" }
    ]
  },

  "compute": {
    title: "Design Pipeline",
    steps: [
      { key: "cpu", label: "CPU", href: "/tools/compute/cpu-sizing/" },
      { key: "ram", label: "RAM", href: "/tools/compute/ram-sizing/" },
      { key: "storage-throughput", label: "Storage", href: "/tools/compute/storage-throughput/" },
      { key: "storage-iops", label: "IOPS", href: "/tools/compute/storage-iops/" }
    ]
  },

  "performance": {
    title: "Design Pipeline",
    steps: [
      { key: "headroom", label: "Headroom", href: "/tools/performance/headroom-target/" },
      { key: "concurrency", label: "Concurrency", href: "/tools/performance/concurrency-scaling/" },
      { key: "latency-throughput", label: "Latency/Throughput", href: "/tools/performance/latency-vs-throughput/" },
      { key: "bottleneck", label: "Bottleneck", href: "/tools/performance/bottleneck-analyzer/" }
    ]
  },

  "infrastructure": {
    title: "Design Pipeline",
    steps: [
      { key: "room-size", label: "Room Size", href: "/tools/infrastructure/room-square-footage/" },
      { key: "rack-ru", label: "Rack RU", href: "/tools/infrastructure/rack-ru-planner/" },
      { key: "conduit-fill", label: "Conduit", href: "/tools/infrastructure/conduit-fill/" }
    ]
  },

  "access-control": {
    title: "Design Pipeline",
    steps: [
      { key: "door-count", label: "Door Count", href: "/tools/access-control/door-count-planner/" },
      { key: "credential-format", label: "Credential", href: "/tools/access-control/credential-format/" },
      { key: "reader-type", label: "Reader Type", href: "/tools/access-control/reader-type-selector/" },
      { key: "panel-capacity", label: "Panel", href: "/tools/access-control/panel-capacity/" }
    ]
  }
};