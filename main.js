let db;

const request = indexedDB.open("InformationBook", 1);  //  открывает БД

request.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("contacts", { keyPath: "id", autoIncrement: true }); // используется при создании впервые кейпач указывает что у обьекта будет ид и авто подсчет
};

request.onsuccess = (e) => {
    db = e.target.result;
    showAllContacts();
    console.log("DB opened"); // если бд успешно запущена 
};

request.onerror = (e) => {
    console.error("DB error:", e.target.error); // если где-то ошибка
};

// Обраюотка контактов
function render(contact) {
    const list = document.getElementById("list");
    const tr = document.createElement("tr");
    tr.classList.add("row");

    tr.innerHTML = `
        <td>${contact.fio}</td>
        <td>${contact.birth || ""}</td>
        <td>${contact.gender || ""}</td>
        <td>${contact.tel}</td>
        <td>${contact.email}</td>
        <td>
            <button onclick="editContact(${contact.id})">
            <span class="material-symbols-outlined">edit</span>
            </button>

            <button onclick="deleteMsgConf(${contact.id})">
            <span class="material-symbols-outlined">delete_forever</span>
            </button>
        </td>
    `;

    list.appendChild(tr);
}


// Отображение контактов 
function showAllContacts() {
    const list = document.getElementById("list");
    list.innerHTML = "";
    const tr = db.transaction("contacts", "readonly");
    const store = tr.objectStore("contacts");

    store.openCursor().onsuccess = (e) => { 
        const cursor = e.target.result;
        if (cursor) {
            render(cursor.value);
            cursor.continue();
        }
    };
} // опенкурсор перебирает все обьекты и сортирует отличие от getAll 



// Изменение ФИО
function formatFIO(fio) {
    return fio
        .toLowerCase()
        .split(" ")
        .filter(Boolean)
        .map(word => word[0].toUpperCase() + word.slice(1))
        .join(" ");
};


function validateTel(tel) {
    const number = tel.replace(/\D/g, '');
    return number.length === 11 && number.startsWith("7");
}


function clearForm() {
    contactId.value = "";
    fio.value = "";
    birth.value = "";
    gender.value = "";
    tel.value = "";
    email.value = "";
}

//поиск
search.oninput = () => {
    const query = search.value.toLowerCase();
    const list = document.getElementById("list");
    list.innerHTML = "";
    const tr = db.transaction("contacts", "readonly");
    const store = tr.objectStore("contacts");
    store.openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const text = Object.values(cursor.value)
            .join(" ")
            .toLowerCase();

            if (text.includes(query)) {
                render(cursor.value);
            } 
            cursor.continue();
        }
    };
};


const deleteMsg = document.getElementById("deleteMsg");

function deleteMsgConf(id) {
    document.getElementById("deleteMsg").style.display = "block";
    document.getElementById("deleteBtn").onclick = () => {
        remove(id);
        document.getElementById("deleteMsg").style.display = "none";
    }
};

const unDelete = document.getElementById("undeleteBtn");
unDelete.onclick = ("click", () => {
    document.getElementById("deleteMsg").style.display = "none";
});


// удаление
function remove(id) {
    const tr = db.transaction("contacts", "readwrite");
    const store = tr.objectStore("contacts");
    store.delete(id);
    tr.oncomplete = () => {
        showAllContacts();
    };
}
    



function editContact(id) {
    const tr = db.transaction("contacts", "readonly");
    const store = tr.objectStore("contacts");

    store.get(id).onsuccess = (e) => {
        const c = e.target.result;

        modalTitle.textContent = "Редактирование";
        contactId.value = c.id;

        editFio.value = c.fio;
        editBirth.value = c.birth;
        editGender.value = c.gender;
        editTel.value = c.tel;
        editEmail.value = c.email;

        modal.style.display = "flex";
    };
}


function closeModal() {
    modal.style.display = "none";
}

updateBtn.onclick = () => {
    const id = Number(contactId.value);

    const contact = {
        fio: formatFIO(editFio.value.trim()),
        birth: editBirth.value,
        gender: editGender.value,
        tel: editTel.value.trim(),
        email: editEmail.value.trim()
    };

    if (!contact.fio) {
        showErrorModal("Введите ФИО");
        return;
    }

    if (!validateTel(contact.tel)) {
        showErrorModal("Введите корректный телефон");
        return;
    }

    const tr = db.transaction("contacts", "readwrite");
    const store = tr.objectStore("contacts");

    if (id) {
        store.put({ id, ...contact });
    } else {
        store.add(contact);
    }

    tr.oncomplete = () => {
        closeModal();
        showAllContacts();
    };
};

const telInput = document.getElementById("editTel");

telInput.addEventListener("keydown", (e) => {
    let digits = telInput.value.replace(/\D/g,"");

    if (
        (e.key === "Backspace" || e.key === "Delete") && 
        telInput.selectionStart <= 2
    ) {
        e.preventDefault();
        return;
    }

    if (e.key === "Backspace") {
        e.preventDefault();

        if(digits.length > 1) {
            digits = digits.slice(0,-1);
        }
        formatAndSet(digits);
    }

});

telInput.addEventListener("input", () => {
    let digits = telInput.value.replace(/\D/g, "");
    if (!digits.startsWith("7")) {
        digits = "7" + digits.replace(/^8/, "");
    }
    digits = digits.slice(0,11);
    formatAndSet(digits);
});

function formatAndSet(digits) {
    let formatted = "+7";
    if (digits.length > 1) formatted += ` (${digits.slice(1,4)}`;
    if (digits.length >= 4) formatted += `) ${digits.slice(4,7)}`;
    if (digits.length >= 7) formatted += ` - ${digits.slice(7,9)}`;
    if (digits.length >= 9) formatted += ` - ${digits.slice(9,11)}`;
    telInput.value = formatted;

    telInput.setSelectionRange(
        telInput.value.length,
        telInput.value.length
    );
};

function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("open");
}


const addBtn = document.getElementById("addBtn");
addBtn.addEventListener("click", () => {
    modalTitle.textContent = "Добавить контакт";
    contactId.value = "";
    editFio.value = "";
    editBirth.value = "";
    editGender.value = "";
    editTel.value = "";
    editEmail.value = "";
    modal.style.display = "flex";
    closeSidebar();
});



const confirmMessage = document.getElementById("confirmMessage");

function openConfirm() {
    confirmMessage.style.display = "block";
}

document.getElementById("confirmBtn").addEventListener("click", () => {
    const tr = db.transaction("contacts", "readwrite");
    tr.objectStore("contacts").clear();
    tr.oncomplete = showAllContacts;
    confirmMessage.style.display = "none";
    closeSidebar();
});


function closeSidebar() {
    document.getElementById("sidebar").classList.remove("open");
}

const cancelBtn = document.getElementById("cancelBtn");
cancelBtn.addEventListener("click", () => {
    confirmMessage.style.display = "none";
    closeSidebar();
});

const errorMsg = document.getElementById("errorMsg");
const errorText = document.getElementById("errorText");
const errorBtn = document.getElementById("errorBtn");

function showErrorModal(message) {
    errorText.textContent = message;
    errorMsg.style.display = "block";
}

errorBtn.addEventListener("click", () => {
    errorMsg.style.display = "none";
});
