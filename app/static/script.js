// Funkcija za učitavanje svih itema
async function loadItems() {
    const response = await fetch('/api/items');
    const items = await response.json();
    const itemsList = document.getElementById('items-list');
    itemsList.innerHTML = '';

    items.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            ${item.name}
            <button class="edit" onclick="editItem(${item.id}, '${item.name}')">Edit</button>
            <button class="delete" onclick="deleteItem(${item.id})">Delete</button>
        `;
        itemsList.appendChild(li);
    });
}

// Funkcija za kreiranje novog itema
async function createItem() {
    const nameInput = document.getElementById('create-name');
    const name = nameInput.value.trim();
    if (name === '') {
        alert('Item name cannot be empty.');
        return;
    }

    const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
    });

    if (response.ok) {
        nameInput.value = '';
        loadItems();
    } else {
        alert('Failed to create item.');
    }
}

// Funkcija za uređivanje postojećeg itema
function editItem(id, currentName) {
    const newName = prompt('Enter new name for the item:', currentName);
    if (newName === null) return; // Korisnik je otkazao

    const trimmedName = newName.trim();
    if (trimmedName === '') {
        alert('Item name cannot be empty.');
        return;
    }

    updateItem(id, trimmedName);
}

// Funkcija za ažuriranje itema
async function updateItem(id, name) {
    const response = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
    });

    if (response.ok) {
        loadItems();
    } else {
        alert('Failed to update item.');
    }
}

// Funkcija za brisanje itema
async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    const response = await fetch(`/api/items/${id}`, {
        method: 'DELETE'
    });

    if (response.ok) {
        loadItems();
    } else {
        alert('Failed to delete item.');
    }
}

// Učitaj iteme kada se stranica učita
window.onload = loadItems;