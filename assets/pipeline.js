document.addEventListener("DOMContentLoaded", () => {

  const bodyStep = document.body.dataset.step;
  if (!bodyStep) return;

  const steps = [
    "bitrate",
    "storage",
    "retention",
    "raid",
    "survivability"
  ];

  const currentIndex = steps.indexOf(bodyStep);

  document.querySelectorAll(".pipe-step").forEach((el) => {

    const step = el.dataset.step;
    const index = steps.indexOf(step);

    if (index < currentIndex) {
      el.classList.add("complete");
    }

    if (index === currentIndex) {
      el.classList.add("active");
    }

  });

});