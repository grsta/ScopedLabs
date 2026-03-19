// /assets/pipelines.js
(() => {

  window.SCOPED_PIPELINES = {

    // ---------------------------------------------------
    // CATEGORY PIPELINES (normal design flows)
    // ---------------------------------------------------
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


    // ---------------------------------------------------
    // CROSS-CATEGORY PIPELINES (future Gold tier)
    // ---------------------------------------------------
    crossSite: {

      "infrastructure-design": {
        label: "Infrastructure Design",
        tier: "gold",

        lanes: {

          v1: [

            {
              id: "bitrate",
              label: "Bitrate",
              category: "video-storage",
              href: "/tools/video-storage/bitrate-estimator/"
            },

            {
              id: "storage",
              label: "Storage",
              category: "video-storage",
              href: "/tools/video-storage/storage-calculator/"
            },

            {
              id: "bandwidth",
              label: "Bandwidth",
              category: "network",
              href: "/tools/network/bandwidth/"
            },

            {
              id: "va-watts-amps",
              label: "VA / Watts / Amps",
              category: "power",
              href: "/tools/power/va-watts-amps/"
            },

            {
              id: "ups-runtime",
              label: "UPS Runtime",
              category: "power",
              href: "/tools/power/ups-runtime/"
            }

          ]

        }
      }

    }

  };

})();