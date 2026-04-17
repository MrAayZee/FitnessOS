(() => {
  const listEl = document.getElementById("exerciseList");
  const emptyEl = document.getElementById("exerciseEmptyState");
  const addBtn = document.getElementById("addExerciseBtn");
  const editorOverlayEl = document.getElementById("exerciseEditorOverlay");
  const formEl = document.getElementById("exerciseForm");
  const formTitleEl = document.getElementById("exerciseEditorTitle");
  const backBtn = document.getElementById("exerciseBackBtn");
  const saveBtn = document.getElementById("exerciseSaveBtn");
  const errorEl = document.getElementById("exerciseFormError");
  const confirmOverlayEl = document.getElementById("confirmOverlay");
  const confirmMessageEl = document.getElementById("confirmMessage");
  const confirmCancelBtn = document.getElementById("confirmCancelBtn");
  const confirmOkBtn = document.getElementById("confirmOkBtn");

  if (!listEl || !formEl || !window.FitnessDB || !editorOverlayEl || !confirmOverlayEl) {
    return;
  }

  const MUSCLE_OPTIONS = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Core", "Calves"];
  const EQUIPMENT_OPTIONS = [
    "Bodyweight",
    "Dumbbell",
    "Barbell",
    "Kettlebell",
    "Cable",
    "Resistance Band",
    "Machine",
    "Bench",
    "Pull-Up Bar",
  ];

  const state = {
    editingId: null,
    primaryMuscle: [],
    secondaryMuscles: [],
    equipment: [],
  };

  const fields = {
    name: document.getElementById("exerciseName"),
    primaryMuscle: document.getElementById("primaryMuscleData"),
    secondaryMuscles: document.getElementById("secondaryMusclesData"),
    equipment: document.getElementById("equipmentData"),
    notes: document.getElementById("exerciseNotes"),
    breathing: document.getElementById("exerciseBreathing"),
    videoUrl: document.getElementById("exerciseVideoUrl"),
    thumbnailUrl: document.getElementById("exerciseThumbnailUrl"),
    cueMediaUrl: document.getElementById("exerciseCueMediaUrl"),
    minReps: document.getElementById("exerciseMinReps"),
    maxReps: document.getElementById("exerciseMaxReps"),
  };
  const primaryPillsEl = document.getElementById("primaryMusclePills");
  const secondaryPillsEl = document.getElementById("secondaryMusclePills");
  const equipmentPillsEl = document.getElementById("equipmentPills");
  const thumbPreviewEl = document.getElementById("exerciseThumbnailPreview");
  const cuePreviewEl = document.getElementById("exerciseCueMediaPreview");

  let confirmResolver = null;

  const normalizeToArray = (value) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      return [value.trim()];
    }

    return [];
  };

  const syncHiddenFields = () => {
    fields.primaryMuscle.value = JSON.stringify(state.primaryMuscle);
    fields.secondaryMuscles.value = JSON.stringify(state.secondaryMuscles);
    fields.equipment.value = JSON.stringify(state.equipment);
  };

  const renderPills = (container, values, selectedValues, maxSelection) => {
    container.innerHTML = "";

    values.forEach((value) => {
      const isActive = selectedValues.includes(value);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `pill${isActive ? " active" : ""}`;
      button.dataset.value = value;
      button.dataset.max = String(maxSelection);
      button.textContent = value;
      container.appendChild(button);
    });
  };

  const renderAllPills = () => {
    renderPills(primaryPillsEl, MUSCLE_OPTIONS, state.primaryMuscle, 2);
    renderPills(secondaryPillsEl, MUSCLE_OPTIONS, state.secondaryMuscles, 3);
    renderPills(equipmentPillsEl, EQUIPMENT_OPTIONS, state.equipment, 3);
    syncHiddenFields();
  };

  const updatePillSelection = (group, value, maxSelection) => {
    const selected = state[group];
    const index = selected.indexOf(value);
    if (index >= 0) {
      selected.splice(index, 1);
    } else if (selected.length < maxSelection) {
      selected.push(value);
    }

    renderAllPills();
  };

  const resetMediaPreview = (container) => {
    container.hidden = true;
    container.innerHTML = "";
  };

  const isLikelyImage = (url) => /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(url);
  const isLikelyVideo = (url) => /\.(mp4|webm|ogg|mov)$/i.test(url);

  const renderMediaPreview = (container, rawUrl) => {
    const url = rawUrl.trim();
    if (!url) {
      resetMediaPreview(container);
      return;
    }

    let parsed;
    try {
      parsed = new URL(url);
    } catch (_err) {
      resetMediaPreview(container);
      return;
    }

    container.hidden = false;
    container.innerHTML = "";

    if (isLikelyImage(parsed.pathname)) {
      const img = document.createElement("img");
      img.src = parsed.toString();
      img.alt = "Media preview";
      container.appendChild(img);
      return;
    }

    if (isLikelyVideo(parsed.pathname)) {
      const video = document.createElement("video");
      video.src = parsed.toString();
      video.controls = true;
      video.preload = "metadata";
      container.appendChild(video);
      return;
    }

    const text = document.createElement("p");
    text.textContent = "Valid URL detected. Preview not available for this media type.";
    container.appendChild(text);
  };

  const clearError = () => {
    errorEl.hidden = true;
    errorEl.textContent = "";
  };

  const showError = (message) => {
    errorEl.hidden = false;
    errorEl.textContent = message;
  };

  const resetForm = () => {
    state.editingId = null;
    formTitleEl.textContent = "Add Exercise";
    formEl.reset();
    state.primaryMuscle = [];
    state.secondaryMuscles = [];
    state.equipment = [];
    renderAllPills();
    resetMediaPreview(thumbPreviewEl);
    resetMediaPreview(cuePreviewEl);
    clearError();
  };

  const openFormForAdd = () => {
    resetForm();
    editorOverlayEl.classList.add("active");
    fields.name.focus();
  };

  const closeEditor = () => {
    editorOverlayEl.classList.remove("active");
    resetForm();
  };

  const openFormForEdit = (exercise) => {
    state.editingId = exercise.id;
    formTitleEl.textContent = "Edit Exercise";

    fields.name.value = exercise.name || "";
    state.primaryMuscle = normalizeToArray(exercise.primaryMuscle).slice(0, 2);
    state.secondaryMuscles = normalizeToArray(exercise.secondaryMuscles).slice(0, 3);
    state.equipment = normalizeToArray(exercise.equipment).slice(0, 3);
    renderAllPills();
    fields.notes.value = exercise.notes || "";
    fields.breathing.value = exercise.breathing || "";
    fields.videoUrl.value = exercise.videoUrl || "";
    fields.thumbnailUrl.value = exercise.thumbnailUrl || "";
    fields.cueMediaUrl.value = exercise.cueMediaUrl || "";
    fields.minReps.value = typeof exercise.minReps === "number" ? String(exercise.minReps) : "";
    fields.maxReps.value = typeof exercise.maxReps === "number" ? String(exercise.maxReps) : "";

    renderMediaPreview(thumbPreviewEl, fields.thumbnailUrl.value);
    renderMediaPreview(cuePreviewEl, fields.cueMediaUrl.value);
    clearError();
    editorOverlayEl.classList.add("active");
    fields.name.focus();
  };

  const getFormData = () => {
    const primaryMuscle = state.primaryMuscle.length <= 1 ? (state.primaryMuscle[0] || "") : state.primaryMuscle;
    return {
      name: fields.name.value.trim(),
      primaryMuscle,
      secondaryMuscles: [...state.secondaryMuscles],
      equipment: [...state.equipment],
      notes: fields.notes.value.trim(),
      breathing: fields.breathing.value.trim(),
      videoUrl: fields.videoUrl.value.trim(),
      thumbnailUrl: fields.thumbnailUrl.value.trim(),
      cueMediaUrl: fields.cueMediaUrl.value.trim(),
      minReps: fields.minReps.value === "" ? null : Number(fields.minReps.value),
      maxReps: fields.maxReps.value === "" ? null : Number(fields.maxReps.value),
    };
  };

  const renderList = (items) => {
    listEl.innerHTML = "";

    if (!items.length) {
      emptyEl.hidden = false;
      return;
    }

    emptyEl.hidden = true;

    items.forEach((exercise) => {
      const li = document.createElement("li");
      li.className = "exercise-item";
      li.dataset.id = String(exercise.id);

      const meta = document.createElement("div");
      meta.className = "exercise-meta";

      const name = document.createElement("p");
      name.className = "exercise-name";
      name.textContent = exercise.name || "Unnamed exercise";

      const muscle = document.createElement("p");
      muscle.className = "exercise-muscle";
      const primaryText = Array.isArray(exercise.primaryMuscle)
        ? exercise.primaryMuscle.join(" / ")
        : (exercise.primaryMuscle || "No primary muscle");
      muscle.textContent = primaryText;

      meta.appendChild(name);
      meta.appendChild(muscle);

      const actions = document.createElement("div");
      actions.className = "exercise-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "icon-btn";
      editBtn.dataset.action = "edit";
      editBtn.dataset.id = String(exercise.id);
      editBtn.setAttribute("aria-label", "Edit exercise");
      editBtn.innerHTML = "&#9998;";

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "icon-btn delete";
      deleteBtn.dataset.action = "delete";
      deleteBtn.dataset.id = String(exercise.id);
      deleteBtn.setAttribute("aria-label", "Delete exercise");
      deleteBtn.innerHTML = "&#128465;";

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      li.appendChild(meta);
      li.appendChild(actions);

      listEl.appendChild(li);
    });
  };

  const refreshExercises = async () => {
    const items = await window.FitnessDB.getAllItems("exercises");
    renderList(items);
  };

  const saveExercise = async () => {
    const data = getFormData();

    if (!data.name) {
      showError("Name is required");
      return;
    }

    if (state.editingId === null) {
      await window.FitnessDB.addItem("exercises", data);
    } else {
      await window.FitnessDB.updateItem("exercises", state.editingId, data);
    }

    resetForm();
    await refreshExercises();
  };

  const openConfirm = (message) => {
    if (confirmOverlayEl.classList.contains("active")) {
      return Promise.resolve(false);
    }

    confirmMessageEl.textContent = message;
    confirmOverlayEl.classList.add("active");

    return new Promise((resolve) => {
      confirmResolver = resolve;
    });
  };

  const closeConfirm = (result) => {
    confirmOverlayEl.classList.remove("active");
    if (confirmResolver) {
      confirmResolver(result);
      confirmResolver = null;
    }
  };

  const resetOverlayStates = () => {
    closeConfirm(false);
    editorOverlayEl.classList.remove("active");
  };

  addBtn.addEventListener("click", () => {
    openFormForAdd();
  });

  backBtn.addEventListener("click", () => {
    closeEditor();
  });

  saveBtn.addEventListener("click", async () => {
    formEl.requestSubmit();
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-tab]")) {
      closeConfirm(false);
      closeEditor();
    }
  });

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      clearError();
      await saveExercise();
      closeEditor();
    } catch (error) {
      showError("Unable to save exercise. Please try again.");
      console.error("[Exercises] Save error:", error);
    }
  });

  listEl.addEventListener("click", async (event) => {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) {
      return;
    }

    const id = Number(actionEl.dataset.id);
    if (!id) {
      return;
    }

    try {
      if (actionEl.dataset.action === "edit") {
        const exercise = await window.FitnessDB.getItem("exercises", id);
        if (!exercise) {
          return;
        }
        openFormForEdit(exercise);
        return;
      }

      if (actionEl.dataset.action === "delete") {
        const confirmed = await openConfirm("Delete this exercise?");
        if (!confirmed) {
          return;
        }

        await window.FitnessDB.deleteItem("exercises", id);
        await refreshExercises();
      }
    } catch (error) {
      console.error("[Exercises] Action error:", error);
    }
  });

  [
    [primaryPillsEl, "primaryMuscle", 2],
    [secondaryPillsEl, "secondaryMuscles", 3],
    [equipmentPillsEl, "equipment", 3],
  ].forEach(([container, key, maxSelection]) => {
    container.addEventListener("click", (event) => {
      const button = event.target.closest(".pill");
      if (!button) {
        return;
      }
      updatePillSelection(key, button.dataset.value, maxSelection);
    });
  });

  fields.thumbnailUrl.addEventListener("input", () => {
    renderMediaPreview(thumbPreviewEl, fields.thumbnailUrl.value);
  });

  fields.cueMediaUrl.addEventListener("input", () => {
    renderMediaPreview(cuePreviewEl, fields.cueMediaUrl.value);
  });

  confirmCancelBtn.addEventListener("click", () => closeConfirm(false));
  confirmOkBtn.addEventListener("click", () => closeConfirm(true));
  confirmOverlayEl.addEventListener("click", (event) => {
    if (event.target === confirmOverlayEl) {
      closeConfirm(false);
    }
  });

  // Dismiss the keyboard when tapping outside controls.
  document.addEventListener("pointerdown", (event) => {
    const active = document.activeElement;
    if (!active) {
      return;
    }

    const isField = active.matches("input, textarea");
    const clickedField = event.target.closest("input, textarea, button, label, .pill");

    if (isField && !clickedField) {
      active.blur();
    }
  });

  // Keep focused inputs visible on mobile keyboards.
  editorOverlayEl.addEventListener("focusin", (event) => {
    const target = event.target;
    if (target && target.matches("input, textarea")) {
      setTimeout(() => {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 120);
    }
  });

  const init = async () => {
    try {
      resetOverlayStates();
      renderAllPills();
      await window.FitnessDB.initDB();
      await refreshExercises();
    } catch (error) {
      showError("Unable to load exercises.");
      console.error("[Exercises] Init error:", error);
    }
  };

  init();
})();
