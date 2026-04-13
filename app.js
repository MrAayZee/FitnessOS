const shell = document.getElementById("appShell");
const tabs = Array.from(document.querySelectorAll("[data-tab]"));
const views = Array.from(document.querySelectorAll("[data-view]"));

const state = {
  activeTab: "dashboard",
};

function setAppHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--app-height", `${vh}px`);
}

function render() {
  tabs.forEach((tab) => {
    const isActive = tab.dataset.tab === state.activeTab;
    tab.classList.toggle("is-active", isActive);

    if (isActive) {
      tab.setAttribute("aria-current", "page");
    } else {
      tab.removeAttribute("aria-current");
    }
  });

  views.forEach((view) => {
    const isActive = view.dataset.view === state.activeTab;
    view.classList.toggle("is-active", isActive);
    view.hidden = !isActive;
  });
}

shell.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-tab]");
  if (!tab) {
    return;
  }

  const nextTab = tab.dataset.tab;
  if (!nextTab || nextTab === state.activeTab) {
    return;
  }

  state.activeTab = nextTab;
  render();
});

window.addEventListener("resize", setAppHeight);
window.addEventListener("orientationchange", setAppHeight);

setAppHeight();
render();
