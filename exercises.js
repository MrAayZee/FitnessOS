(() => {
  const listEl = document.getElementById("exerciseList");
  const emptyEl = document.getElementById("exerciseEmptyState");
  const addBtn = document.getElementById("addExerciseBtn");
  const formEl = document.getElementById("exerciseForm");
  const formTitleEl = document.getElementById("exerciseFormTitle");
  const cancelBtn = document.getElementById("exerciseCancelBtn");
  const errorEl = document.getElementById("exerciseFormError");

  if (!listEl || !formEl || !window.FitnessDB) {
    return;
  }

  const state = {
    editingId: null,
  };

  const fields = {
    name: document.getElementById("exerciseName"),
    primaryMuscle: document.getElementById("exercisePrimaryMuscle"),
    secondaryMuscles: document.getElementById("exerciseSecondaryMuscles"),
    equipment: document.getElementById("exerciseEquipment"),
    notes: document.getElementById("exerciseNotes"),
    breathing: document.getElementById("exerciseBreathing"),
    videoUrl: document.getElementById("exerciseVideoUrl"),
    minReps: document.getElementById("exerciseMinReps"),
    maxReps: document.getElementById("exerciseMaxReps"),
  };

  const getMultiValues = (selectEl) => {
    return Array.from(selectEl.selectedOptions).map((option) => option.value);
  };

  const setMultiValues = (selectEl, values) => {
    const valueSet = new Set(values || []);
    Array.from(selectEl.options).forEach((option) => {
      option.selected = valueSet.has(option.value);
    });
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
    setMultiValues(fields.secondaryMuscles, []);
    setMultiValues(fields.equipment, []);
    clearError();
  };

  const openFormForAdd = () => {
    resetForm();
    formEl.hidden = false;
    fields.name.focus();
  };

  const openFormForEdit = (exercise) => {
    state.editingId = exercise.id;
    formTitleEl.textContent = "Edit Exercise";

    fields.name.value = exercise.name || "";
    fields.primaryMuscle.value = exercise.primaryMuscle || "";
    setMultiValues(fields.secondaryMuscles, exercise.secondaryMuscles || []);
    setMultiValues(fields.equipment, exercise.equipment || []);
    fields.notes.value = exercise.notes || "";
    fields.breathing.value = exercise.breathing || "";
    fields.videoUrl.value = exercise.videoUrl || "";
    fields.minReps.value = typeof exercise.minReps === "number" ? String(exercise.minReps) : "";
    fields.maxReps.value = typeof exercise.maxReps === "number" ? String(exercise.maxReps) : "";

    clearError();
    formEl.hidden = false;
    fields.name.focus();
  };

  const getFormData = () => {
    return {
      name: fields.name.value.trim(),
      primaryMuscle: fields.primaryMuscle.value.trim(),
      secondaryMuscles: getMultiValues(fields.secondaryMuscles),
      equipment: getMultiValues(fields.equipment),
      notes: fields.notes.value.trim(),
      breathing: fields.breathing.value.trim(),
      videoUrl: fields.videoUrl.value.trim(),
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
      muscle.textContent = exercise.primaryMuscle || "No primary muscle";

      meta.appendChild(name);
      meta.appendChild(muscle);

      const actions = document.createElement("div");
      actions.className = "exercise-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn";
      editBtn.dataset.action = "edit";
      editBtn.dataset.id = String(exercise.id);
      editBtn.textContent = "Edit";

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn";
      deleteBtn.dataset.action = "delete";
      deleteBtn.dataset.id = String(exercise.id);
      deleteBtn.textContent = "Delete";

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

  addBtn.addEventListener("click", () => {
    openFormForAdd();
  });

  cancelBtn.addEventListener("click", () => {
    formEl.hidden = true;
    resetForm();
  });

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      clearError();
      await saveExercise();
      formEl.hidden = true;
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
        const confirmed = window.confirm("Delete this exercise?");
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

  // Dismiss the keyboard when tapping outside controls.
  document.addEventListener("pointerdown", (event) => {
    const active = document.activeElement;
    if (!active) {
      return;
    }

    const isField = active.matches("input, textarea, select");
    const clickedField = event.target.closest("input, textarea, select, button, label");

    if (isField && !clickedField) {
      active.blur();
    }
  });

  // Keep focused inputs visible on mobile keyboards.
  formEl.addEventListener("focusin", (event) => {
    const target = event.target;
    if (target && target.matches("input, textarea, select")) {
      setTimeout(() => {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 120);
    }
  });

  const init = async () => {
    try {
      await window.FitnessDB.initDB();
      await refreshExercises();
    } catch (error) {
      showError("Unable to load exercises.");
      console.error("[Exercises] Init error:", error);
    }
  };

  init();
})();
