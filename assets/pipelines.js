// /assets/pipelines.js
(() => {
  window.SCOPED_PIPELINES = {
    "video-storage": [
      { id: "bitrate", label: "Bitrate", href: "/tools/video-storage/bitrate-estimator/" },
      { id: "storage", label: "Storage", href: "/tools/video-storage/storage-calculator/" },
      { id: "retention", label: "Retention", href: "/tools/video-storage/retention-planner/" },
      { id: "raid", label: "RAID", href: "/tools/video-storage/raid-impact/" },
      { id: "survivability", label: "Survivability", href: "/tools/video-storage/retention-survivability/" }
    ]
  };
})();