async function loadDonations() {
    const response = await fetch('/api/donacije');
    const donations = await response.json();
    const donationsList = document.getElementById('donations-list');
    donationsList.innerHTML = '';

    let total = 0;

    donations.forEach(donation => {
        total += donation.amount;
        const li = document.createElement('li');
        li.innerHTML = `
            ${donation.amount.toFixed(2)} KM (Korisnik ID: ${donation.user_id}, Kategorija ID: ${donation.category_id})
            <button class="edit" onclick="editDonation(${donation.id}, ${donation.amount}, ${donation.user_id}, ${donation.category_id})">Uredi</button>
            <button class="delete" onclick="deleteDonation(${donation.id})">Obriši</button>
        `;
        donationsList.appendChild(li);
    });

    document.getElementById('total-donations').innerText = total.toFixed(2);
}

// Dodati donaciju
async function createDonation() {
    console.log("Amount element:", document.getElementById("amount"));
    console.log("User ID element:", document.getElementById("user_id"));
    console.log("Category ID element:", document.getElementById("category_id"));

    const amount = parseFloat(document.getElementById("amount").value);
    const userId = parseInt(document.getElementById("user_id").value);
    const categoryId = parseInt(document.getElementById("category_id").value);

    if (isNaN(amount) || amount <= 0 || isNaN(userId) || isNaN(categoryId)) {
        alert("Molimo unesite ispravne vrijednosti.");
        return;
    }

    if (!amountElement || !userIdElement || !categoryIdElement) {
        alert("Nisu pronađeni svi potrebni elementi.");
        return;
    }

    const response = await fetch('/api/donacije', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: amount,
            user_id: userId,
            category_id: categoryId
        })
    });

    if (response.ok) {
        alert("Donacija uspješno dodana!");
        loadDonations();
    } else {
        alert("Greška prilikom dodavanja donacije.");
    }
}

// uređivanje postojeće donacije
function editDonation(id, currentAmount, currentUserId, currentCategoryId) {
    const newAmount = prompt('Unesi novi iznos donacije:', currentAmount);
    const newUserId = prompt('Unesi novi ID korisnika:', currentUserId);
    const newCategoryId = prompt('Unesi novi ID kategorije:', currentCategoryId);

    if (newAmount === null || newUserId === null || newCategoryId === null) return;

    const parsedAmount = parseFloat(newAmount);
    const parsedUserId = parseInt(newUserId);
    const parsedCategoryId = parseInt(newCategoryId);

    if (isNaN(parsedAmount) || parsedAmount <= 0 || isNaN(parsedUserId) || isNaN(parsedCategoryId)) {
        alert('Podaci nisu ispravni.');
        return;
    }

    updateDonation(id, parsedAmount, parsedUserId, parsedCategoryId);
}

// ažuriranje donacije
async function updateDonation(id, amount, user_id, category_id) {
    const response = await fetch(`/api/donacije/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount, user_id, category_id })
    });

    if (response.ok) {
        loadDonations();
    } else {
        alert('Neuspjelo ažuriranje donacije.');
    }
}


async function deleteDonation(id) {
    if (!confirm('Jesi li siguran da želiš obrisati ovu donaciju?')) return;

    const response = await fetch(`/api/donacije/${id}`, {
        method: 'DELETE'
    });

    if (response.ok) {
        loadDonations();
    } else {
        alert('Neuspjelo brisanje donacije.');
    }
}


window.onload = loadDonations;