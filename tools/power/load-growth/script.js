function prefillFromPipeline() {

  const incoming = readPipelineInput()
  if (!incoming || incoming.category !== "power") return

  const data = incoming.data || {}

  const baseLoad = $("baseLoad")
  const flowNote = $("flowNote")

  if (
    baseLoad &&
    (!baseLoad.value || baseLoad.value.trim() === "") &&
    Number.isFinite(Number(data.baseLoadKw))
  ) {
    baseLoad.value = Number(data.baseLoadKw).toFixed(3)
  }

  if (!flowNote) return

  if (incoming.step === "va-watts-amps") {

    const watts = Number(data.watts)
    const kw = Number(data.baseLoadKw)

    const lines = []

    lines.push("Imported from VA / Watts / Amps.")

    if (Number.isFinite(watts))
      lines.push(`Load: ${fmt(watts,0)} W`)

    if (Number.isFinite(kw))
      lines.push(`Converted load: ${fmt(kw,3)} kW`)

    flowNote.innerHTML = `
      <strong>Pipeline Import</strong><br>
      ${lines.join("<br>")}
      <br><br>
      Review values and click <strong>Calculate</strong>.
    `

    flowNote.hidden = false
  }
}
