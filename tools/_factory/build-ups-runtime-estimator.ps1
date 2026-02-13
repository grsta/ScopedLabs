# ScopedLabs — Build: UPS Runtime Estimator (wrapper)
# Run from the /tools directory.
# This is a convenience wrapper that calls new-tool.ps1 with the right parameters.

.\new-tool.ps1 `
  -Category "power" `
  -Slug "ups-runtime-estimator" `
  -Title "UPS Runtime Estimator" `
  -Description "Estimate UPS runtime from load, battery voltage/Ah, inverter efficiency, and usable depth-of-discharge." `
  -Tags @("ups","runtime","battery","wh","ah") `
  -Access "Free"
