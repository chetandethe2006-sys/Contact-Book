let contacts = [];
let editingContactId = null;
const APP_URL = "http://localhost:3000/api/contacts";

const form = document.getElementById("contact-form");
const nameInput = document.getElementById("name-input");
const phoneInput = document.getElementById("phone-input");
const emailInput = document.getElementById("email-input");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const list = document.getElementById("contact-list");
const status = document.getElementById("status");

function renderContacts() {
    list.innerHTML = "";
    if (contacts.length === 0) {
        const emptyLi = document.createElement("li");
        emptyLi.className = "text-center text-slate-400 py-6 bg-white rounded-lg shadow text-sm";
        emptyLi.textContent = "No contacts yet. Add your first contact above!";
        list.appendChild(emptyLi);
        return;
    }

    contacts.forEach((contact) => {
        const contactId = contact.id || contact._id;
        const li = document.createElement("li");
        li.className = "bg-white rounded-lg shadow px-4 py-3 flex justify-between items-center";

        const info = document.createElement("div");

        const nameEl = document.createElement("div");
        nameEl.className = "font-semibold text-indigo-900";
        nameEl.textContent = contact.name;
        info.appendChild(nameEl);

        const details = [contact.phone, contact.email].filter(Boolean).join("  ·  ");
        const detailEl = document.createElement("p");
        detailEl.className = "text-sm text-slate-500";
        detailEl.textContent = details || "No phone or email provided";
        info.appendChild(detailEl);

        const actions = document.createElement("div");
        actions.className = "flex items-center gap-2";

        const editBtn = document.createElement("button");
        editBtn.className = "text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded border border-indigo-200 hover:border-indigo-400 transition";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => {
            startEditing(contact);
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded border border-red-200 hover:border-red-400 transition";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", async () => {
            if (confirm(`Delete ${contact.name}?`)) {
                if (editingContactId === contactId) {
                    cancelEditing();
                }
                await deleteContact(contactId);
            }
        });

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        li.appendChild(info);
        li.appendChild(actions);
        list.appendChild(li);
    });
}

function startEditing(contact) {
    editingContactId = contact.id || contact._id;
    nameInput.value = contact.name || "";
    phoneInput.value = contact.phone || "";
    emailInput.value = contact.email || "";
    if (submitBtn) submitBtn.textContent = "Update Contact";
    if (cancelBtn) cancelBtn.classList.remove("hidden");
    nameInput.focus();
}

function cancelEditing() {
    editingContactId = null;
    form.reset();
    if (submitBtn) submitBtn.textContent = "Add Contact";
    if (cancelBtn) cancelBtn.classList.add("hidden");
}

if (cancelBtn) {
    cancelBtn.addEventListener("click", cancelEditing);
}

async function loadContacts() {
    try {
        status.textContent = "Connecting to server...";
        status.className = "text-sm text-slate-500 mb-6";

        const response = await fetch(APP_URL);
        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`);
        }

        contacts = await response.json();
        status.textContent = `Connected to server (${contacts.length} contact${contacts.length === 1 ? "" : "s"})`;
        status.className = "text-sm text-emerald-600 font-medium mb-6";
        renderContacts();
    } catch (error) {
        console.error("Could not load contacts:", error);
        status.textContent = "Server offline — not connected. Make sure backend is running on http://localhost:3000";
        status.className = "text-sm text-red-500 font-medium mb-6";
        list.innerHTML = "";
    }
}

async function deleteContact(id) {
    if (!id) return;
    try {
        const response = await fetch(`${APP_URL}/${id}`, {
            method: "DELETE"
        });
        if (!response.ok) {
            throw new Error(`Failed to delete contact (${response.status})`);
        }
        await loadContacts();
    } catch (error) {
        console.error("Error deleting contact:", error);
        alert("Failed to delete contact: " + error.message);
    }
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();

    if (!name) {
        alert("Please enter a name for the contact.");
        nameInput.focus();
        return;
    }

    const isEditing = Boolean(editingContactId);
    const originalText = submitBtn ? submitBtn.textContent : (isEditing ? "Update Contact" : "Add Contact");

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = isEditing ? "Updating..." : "Adding...";
        }

        const url = isEditing ? `${APP_URL}/${editingContactId}` : APP_URL;
        const method = isEditing ? "PUT" : "POST";

        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, phone, email })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || errData.message || `HTTP ${response.status}`);
        }

        cancelEditing();
        await loadContacts();
    } catch (error) {
        console.error(`Failed to ${isEditing ? 'update' : 'add'} contact:`, error);
        alert(`Could not ${isEditing ? 'update' : 'add'} contact: ` + error.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = editingContactId ? "Update Contact" : "Add Contact";
        }
    }
});

loadContacts();
