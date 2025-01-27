async function loadUsers() {
    const response = await fetch('/api/users');
    const users = await response.json();
    const userSelect = document.getElementById('user_id');
    userSelect.innerHTML = '';

    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        userSelect.appendChild(option);
    });
}

async function addUser() {
    const newUserInput = document.getElementById('new_user');
    const newUserName = newUserInput.value.trim();

    if (!newUserName) {
        alert('Unesite ime korisnika.');
        return;
    }

    const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newUserName })
    });

    if (response.ok) {
        alert('Korisnik uspješno dodan!');
        newUserInput.value = '';
        loadUsers();
    } else {
        alert('Greška prilikom dodavanja korisnika.');
    }
}

async function loadDonations() {
    const response = await fetch('/api/donacije');
    const donations = await response.json();
    const donationsList = document.getElementById('donations-list');
    donationsList.innerHTML = '';

    donations.forEach(donation => {
        const li = document.createElement('li');
        li.innerHTML =
            `ID: ${donation.id}, ` +
            `Iznos: ${donation.amount} KM, ` +
            `Korisnik: ${donation.user_id}, ` +
            `Kategorija: ${donation.category_id}, ` +
            `Metoda plaćanja: ${donation.payment_method_id}, ` +
            `Organizacija: ${donation.organization || ''}, ` +
            `Vrijeme: ${donation.time || ''} ` +
            `<button class="edit" onclick="editDonation(${donation.id})">Uredi</button>` +
            `<button class="delete" onclick="deleteDonation(${donation.id})">Obriši</button>`;

        donationsList.appendChild(li);
    });
}

async function createDonation() {
    const amount = parseFloat(document.getElementById('amount').value);
    const userId = parseInt(document.getElementById('user_id').value);
    const categoryId = parseInt(document.getElementById('category_id').value);
    const paymentMethodId = parseInt(document.getElementById('payment_method_id').value);
    const organization = document.getElementById('organization').value || null;

    if (isNaN(amount) || amount <= 0) {
        alert('Molimo unesite ispravan iznos donacije (veći od 0).');
        return;
    }

    const data = {
        amount: amount,
        user_id: userId,
        category_id: categoryId,
        organization: organization,
        payment_method_id: paymentMethodId
    };

    const response = await fetch('/api/donacije', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (response.ok) {
        alert('Donacija uspješno dodana!');
        loadDonations();
    } else {
        alert('Greška prilikom dodavanja donacije.');
    }
}

async function editDonation(donationId) {
    const newAmount = prompt('Unesite novi iznos:');
    if (!newAmount) return;

    const data = { amount: parseFloat(newAmount) };

    const response = await fetch(`/api/donacije/${donationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (response.ok) {
        alert('Donacija uspješno ažurirana!');
        loadDonations();
    } else {
        alert('Greška prilikom ažuriranja donacije.');
    }
}

async function deleteDonation(donationId) {
    if (!confirm(`Da li ste sigurni da želite obrisati donaciju ID=${donationId}?`)) {
        return;
    }

    const response = await fetch(`/api/donacije/${donationId}`, {
        method: 'DELETE'
    });

    if (response.ok) {
        alert('Donacija obrisana!');
        loadDonations();
    } else {
        alert('Greška prilikom brisanja donacije.');
    }
}

window.onload = function () {
    loadUsers();
    loadDonations();
};
