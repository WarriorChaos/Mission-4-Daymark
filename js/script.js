const userProfile = {
    name: "Sagara Triguna",
    role: "Frontend Developer"
};

const STORAGE_KEY = "daymarkTasks";
let tasks = [];

const elements = {
    profileName: document.querySelector("#profileName"),
    profileRole: document.querySelector("#profileRole"),
    profileAvatar: document.querySelector("#profileAvatar"),
    currentDay: document.querySelector("#currentDay"),
    currentDate: document.querySelector("#currentDate"),
    taskForm: document.querySelector("#taskForm"),
    taskTitle: document.querySelector("#taskTitle"),
    formFeedback: document.querySelector("#formFeedback"),
    todoList: document.querySelector("#todoList"),
    doneList: document.querySelector("#doneList"),
    todoCount: document.querySelector("#todoCount"),
    doneCount: document.querySelector("#doneCount"),
    deleteAllButton: document.querySelector("#deleteAllButton")
};

function initializeApp() {
    renderProfile();
    renderCurrentDate();
    tasks = loadTasks();
    renderTasks();

    elements.taskForm.addEventListener("submit", handleTaskSubmit);
    elements.todoList.addEventListener("change", handleTaskToggle);
    elements.doneList.addEventListener("change", handleTaskToggle);
    elements.todoList.addEventListener("click", handleTaskAction);
    elements.doneList.addEventListener("click", handleTaskAction);
    elements.deleteAllButton.addEventListener("click", deleteAllTasks);
}

function renderProfile() {
    elements.profileName.textContent = userProfile.name;
    elements.profileRole.textContent = userProfile.role;
    elements.profileAvatar.textContent = userProfile.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

function renderCurrentDate() {
    const today = new Date();
    elements.currentDay.textContent = new Intl.DateTimeFormat("en-US", {
        weekday: "long"
    }).format(today).toUpperCase();
    elements.currentDate.textContent = formatDate(today);
}

function loadTasks() {
    try {
        const savedTasks = localStorage.getItem(STORAGE_KEY);
        if (!savedTasks) {
            return [];
        }

        const parsedTasks = JSON.parse(savedTasks);
        if (!Array.isArray(parsedTasks)) {
            return [];
        }

        return parsedTasks.filter((task) => (
            task &&
            typeof task.id === "string" &&
            typeof task.title === "string" &&
            ["low", "medium", "high"].includes(task.priority) &&
            typeof task.createdAt === "string" &&
            typeof task.completed === "boolean"
        ));
    } catch (error) {
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
        elements.formFeedback.textContent = "Storage is unavailable, but this session still works.";
    }
}

function handleTaskSubmit(event) {
    event.preventDefault();
    const title = elements.taskTitle.value.trim();
    const priority = new FormData(elements.taskForm).get("priority");

    if (!title) {
        elements.formFeedback.textContent = "Add a little detail so this task is actionable.";
        elements.taskTitle.focus();
        return;
    }

    tasks.unshift({
        id: createTaskId(),
        title,
        priority,
        createdAt: new Date().toISOString(),
        completed: false
    });

    saveTasks();
    renderTasks();
    elements.taskForm.reset();
    elements.formFeedback.textContent = "";
    elements.taskTitle.focus();
}

function handleTaskToggle(event) {
    if (!event.target.matches("input[type='checkbox']")) {
        return;
    }

    const task = tasks.find((item) => item.id === event.target.dataset.taskId);
    if (!task) {
        return;
    }

    task.completed = event.target.checked;
    saveTasks();
    renderTasks();
}

function handleTaskAction(event) {
    const deleteButton = event.target.closest("[data-action='delete']");
    if (deleteButton) {
        deleteTask(deleteButton.dataset.taskId);
    }
}

function deleteTask(taskId) {
    tasks = tasks.filter((task) => task.id !== taskId);
    saveTasks();
    renderTasks();
}

function deleteAllTasks() {
    if (!tasks.length) {
        return;
    }

    const confirmed = window.confirm("Are you sure you want to delete all tasks?");
    if (!confirmed) {
        return;
    }

    tasks = [];
    saveTasks();
    renderTasks();
}

function renderTasks() {
    const activeTasks = tasks.filter((task) => !task.completed);
    const completedTasks = tasks.filter((task) => task.completed);

    elements.todoList.replaceChildren(...renderTaskNodes(activeTasks));
    elements.doneList.replaceChildren(...renderTaskNodes(completedTasks));
    elements.todoCount.textContent = activeTasks.length;
    elements.doneCount.textContent = completedTasks.length;

    if (!activeTasks.length) {
        elements.todoList.append(createEmptyState("No tasks yet. Add your first task above."));
    }
    if (!completedTasks.length) {
        elements.doneList.append(createEmptyState("No completed tasks yet."));
    }
}

function renderTaskNodes(taskCollection) {
    return taskCollection.map((task) => {
        const card = document.createElement("article");
        card.className = `task-card${task.completed ? " completed" : ""}`;
        card.dataset.taskId = task.id;

        const checkboxLabel = document.createElement("label");
        checkboxLabel.className = "task-check";
        checkboxLabel.title = task.completed ? "Mark task as active" : "Mark task as complete";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.completed;
        checkbox.dataset.taskId = task.id;
        checkbox.setAttribute("aria-label", `${task.completed ? "Reopen" : "Complete"} task: ${task.title}`);
        checkboxLabel.append(checkbox);

        const content = document.createElement("div");
        content.className = "task-content";

        const title = document.createElement("p");
        title.className = "task-title";
        title.textContent = task.title;

        const meta = document.createElement("div");
        meta.className = "task-meta";

        const priority = document.createElement("span");
        priority.className = `priority-label ${task.priority}`;
        priority.textContent = task.priority;

        const date = document.createElement("time");
        date.dateTime = task.createdAt;
        date.textContent = formatDate(new Date(task.createdAt));
        meta.append(priority, date);

        if (!task.completed && isOverdue(task.createdAt)) {
            const overdue = document.createElement("span");
            overdue.className = "overdue-label";
            overdue.textContent = "Overdue";
            meta.append(overdue);
        }

        content.append(title, meta);

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.type = "button";
        deleteButton.dataset.action = "delete";
        deleteButton.dataset.taskId = task.id;
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute("aria-label", `Delete task: ${task.title}`);

        card.append(checkboxLabel, content, deleteButton);
        return card;
    });
}

function createEmptyState(message) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = message;
    return emptyState;
}

function createTaskId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(date) {
    if (Number.isNaN(date.getTime())) {
        return "Unknown date";
    }
    return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    }).format(date);
}

function isOverdue(createdAt) {
    const createdDate = new Date(createdAt);
    const today = new Date();
    createdDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return createdDate < today;
}

initializeApp();
