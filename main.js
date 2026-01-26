let db;

const request = indexedDB.open("InformationBook", 1);  //  открывает БД

request.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("contacts", { keyPath: "id", autoIncrement: true }); // используется при создании впервые кейпач указывает что у обьекта будет ид и авто подсчет
};

request.onsuccess = (e) => {
    db = e.target.result;
    showAllContacts();
    console.log("Database opened successfully"); // если бд успешно запущена 
};

request.onerror = (e) => {
    console.error("Error opening DB:", e.target.error); // если где-то ошибка
};

// Обраюотка контактов
function render(contact) {
    const list = document.getElementById("list");
    const tr = document.createElement("tr");

    tr.innerHTML = `
        <td>${contact.fio}</td>
        <td>${contact.birth || ""}</td>
        <td>${contact.gender || ""}</td>
        <td>${contact.tel}</td>
        <td>${contact.email}</td>
        <td>
            <button onclick="editContact(${contact.id})">Редактировать</button>
            <button onclick="remove(${contact.id})">Удалить</button>
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

// только буквы русские и англ 
const fioInput = document.getElementById("fio");
fioInput.addEventListener("input", () => {
    fioInput.value = fioInput.value.replace(/[^а-яА-ЯёЁa-zA-Z\s]/g, '');
});

// Изменение ФИО
function formatFIO(fio) {
    return fio
        .toLowerCase()
        .split(" ")
        .filter(word => word !== "")
        .map(word => word[0].toUpperCase() + word.slice(1))
        .join(" ");
}

// Изменение телефона
const telInput = document.getElementById("tel");

telInput.addEventListener("input", (e) => {
    const cursorPos = telInput.selectionStart;
    const oldValue = telInput.value;

    // убирает все кроме цифр
    let number = oldValue.replace(/\D/g, '');

    // 11 цифр
    digits = number.slice(0, 11);

    // формат со скобкой 
    let formatted = "+7";
    if (number.length > 1) formatted += ` (${number.slice(1,4)}`;
    if (number.length >= 4) formatted += `) ${number.slice(4,7)}`;
    if (number.length >= 7) formatted += `-${number.slice(7,9)}`;
    if (number.length >= 9) formatted += `-${number.slice(9,11)}`;

    // вставка измененная
    telInput.value = formatted;

    if (e.inputType?.includes("delete")) {
        telInput.selectionStart = telInput.selectionEnd = Math.min(cursorPos, telInput.value.length);
    }
});
   
// проверка почты
// function validateEmail(email) {
//     return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
// }

function validateTel(tel) {
    const number = tel.replace(/\D/g, '');
    return number.length === 11 && number.startsWith("7");
}

// сохранение 
document.getElementById("saveBtn").onclick = saveContact;

function saveContact() {
    const id = Number(contactId.value);
    const fioValue = formatFIO(fio.value.trim());
    const telValue = tel.value.trim();
    const emailValue = email.value.trim();

    if (!fioValue) { alert("Введите ФИО"); return; }
    if (!validateTel(telValue)) { alert("Введите корректный телефон"); return; }
    // if (!validateEmail(emailValue)) { alert("Введите корректный email"); return; }

    const contact = {
        fio: fioValue,
        birth: birth.value,
        gender: gender.value,
        tel: telValue,
        email: emailValue
    };

    const tr = db.transaction("contacts", "readwrite");
    const store = tr.objectStore("contacts");

    if (id) store.put({ id, ...contact });
    else store.add(contact);

    tr.oncomplete = () => {
        clearForm();
        showAllContacts();
    };
    tr.onerror = (e) => console.error("Error saving contact:", e.target.error);
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
            const info = Object.values(cursor.value).join(" ").toLowerCase();
            if (info.includes(query)) render(cursor.value);
            cursor.continue();
        }
    };
};

// удаление
function remove(id) {
    const tr = db.transaction("contacts", "readwrite");
    tr.objectStore("contacts").delete(id);
    tr.oncomplete = showAllContacts;
    tr.onerror = (e) => console.error("Error deleting contact:", e.target.error);
}

//редактировать
function editContact(id) {
    const tr = db.transaction("contacts", "readonly");
    const store = tr.objectStore("contacts");

    store.get(id).onsuccess = e => {
        const contact = e.target.result;

        // id
        contactId.value = contact.id;

        // заполняем МОДАЛКУ
        editFio.value = contact.fio;
        editBirth.value = contact.birth;
        editGender.value = contact.gender;
        editTel.value = contact.tel;
        editEmail.value = contact.email;

        // показываем модалку
        modal.style.display = "flex";
    };
}

function closeModal() {
    modal.style.display = "none";
}

updateBtn.onclick = () => {
    const id = Number(contactId.value);

    const updatedContact = {
        id,
        fio: formatFIO(editFio.value.trim()),
        birth: editBirth.value,
        gender: editGender.value,
        tel: editTel.value.trim(),
        email: editEmail.value.trim()
    };

    if (!updatedContact.fio) { alert("Введите ФИО"); return; }
    if (!validateTel(updatedContact.tel)) { alert("Введите корректный телефон"); return; }

    const tr = db.transaction("contacts", "readwrite");
    tr.objectStore("contacts").put(updatedContact);

    tr.oncomplete = () => {
        closeModal();
        showAllContacts();
    };
};

